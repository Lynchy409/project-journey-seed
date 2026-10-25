-- Additive only. Apply in the app's Lovable Cloud database after inspecting its schema.
ALTER TABLE public.workouts ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.exercise_sets ADD COLUMN IF NOT EXISTS details jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS tracking jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.checkins ADD COLUMN IF NOT EXISTS recovery jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE TABLE IF NOT EXISTS public.fitness_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (length(trim(name)) > 0), kind text NOT NULL,
  slot text NOT NULL CHECK (slot IN ('strength','cardio','recovery')),
  version integer NOT NULL DEFAULT 1 CHECK (version > 0), payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  archived boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.fitness_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (length(trim(name)) > 0), kind text NOT NULL,
  target text NOT NULL DEFAULT '', steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '', archived boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.fitness_preferences (
  user_id uuid PRIMARY KEY DEFAULT auth.uid(), data jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.fitness_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL, slot text NOT NULL CHECK (slot IN ('strength','cardio','recovery')),
  title text NOT NULL, template_id uuid REFERENCES public.fitness_templates(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','done','skipped')),
  workout_id uuid REFERENCES public.workouts(id) ON DELETE SET NULL,
  source_key text NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_key)
);
CREATE INDEX IF NOT EXISTS fitness_tasks_user_date ON public.fitness_tasks(user_id, date);
CREATE INDEX IF NOT EXISTS workouts_user_date ON public.workouts(user_id, date DESC);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['fitness_templates','fitness_plans','fitness_preferences','fitness_tasks'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename=t AND policyname='own fitness records') THEN
      EXECUTE format('CREATE POLICY "own fitness records" ON public.%I FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK ((SELECT auth.uid()) = user_id)', t);
    END IF;
  END LOOP;
  FOREACH t IN ARRAY ARRAY['fitness_templates','fitness_plans','fitness_preferences'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname=t || '_updated_at') THEN
      EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column()', t || '_updated_at', t);
    END IF;
  END LOOP;
END $$;

-- Reject cross-user references even when callers bypass the application.
CREATE OR REPLACE FUNCTION public.validate_fitness_task_owner() RETURNS trigger
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.template_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.fitness_templates WHERE id=NEW.template_id AND user_id=NEW.user_id) THEN
    RAISE EXCEPTION 'Template does not belong to this user';
  END IF;
  IF NEW.workout_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.workouts WHERE id=NEW.workout_id AND user_id=NEW.user_id) THEN
    RAISE EXCEPTION 'Workout does not belong to this user';
  END IF;
  IF NEW.status='done' AND NEW.workout_id IS NULL THEN
    RAISE EXCEPTION 'Complete a task by saving a session';
  END IF;
  RETURN NEW;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='fitness_task_owner') THEN
    CREATE TRIGGER fitness_task_owner BEFORE INSERT OR UPDATE ON public.fitness_tasks
      FOR EACH ROW EXECUTE FUNCTION public.validate_fitness_task_owner();
  END IF;
END $$;

-- A session, its sets and its task completion commit together. The client supplies
-- a stable UUID, so retrying after a lost network response cannot duplicate it.
CREATE OR REPLACE FUNCTION public.save_fitness_workout(
  p_id uuid, p_workout jsonb, p_sets jsonb, p_task_id uuid DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE u uuid := auth.uid(); s jsonb; n integer := 0; task public.fitness_tasks; inserted uuid; k text; d jsonb;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF EXISTS (SELECT 1 FROM public.workouts WHERE id=p_id AND user_id=u) THEN RETURN p_id; END IF;
  IF jsonb_typeof(p_workout) IS DISTINCT FROM 'object' THEN RAISE EXCEPTION 'Invalid session'; END IF;
  IF coalesce(trim(p_workout->>'name'),'')='' THEN RAISE EXCEPTION 'Session name required'; END IF;
  IF length(p_workout->>'name')>180 THEN RAISE EXCEPTION 'Session name too long'; END IF;
  IF jsonb_typeof(p_sets) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid sets'; END IF;
  IF jsonb_array_length(p_sets)>500 THEN RAISE EXCEPTION 'Too many sets'; END IF;
  d := p_workout->'details';
  IF jsonb_typeof(d) IS DISTINCT FROM 'object' OR coalesce(d->>'slot','') NOT IN ('strength','cardio','recovery') THEN
    RAISE EXCEPTION 'Invalid training slot';
  END IF;
  FOREACH k IN ARRAY ARRAY['duration_seconds','distance_m','rounds','score'] LOOP
    IF d ? k AND d->k <> 'null'::jsonb THEN
      IF jsonb_typeof(d->k)<>'number' OR (d->>k)::numeric < 0 THEN RAISE EXCEPTION 'Invalid session metric: %', k; END IF;
    END IF;
  END LOOP;
  IF d->>'rounds' IS NOT NULL AND (d->>'rounds')::numeric <> trunc((d->>'rounds')::numeric) THEN RAISE EXCEPTION 'Rounds must be whole'; END IF;
  IF coalesce(d->>'related_workout_id','')<>'' AND NOT EXISTS
    (SELECT 1 FROM public.workouts WHERE id=(d->>'related_workout_id')::uuid AND user_id=u) THEN
    RAISE EXCEPTION 'Related session does not belong to this user';
  END IF;
  IF coalesce(d->>'routine_id','')<>'' AND NOT EXISTS
    (SELECT 1 FROM public.routines WHERE id=(d->>'routine_id')::uuid AND user_id=u) THEN
    RAISE EXCEPTION 'Routine does not belong to this user';
  END IF;
  IF coalesce(d->>'win_id','')<>'' AND NOT EXISTS
    (SELECT 1 FROM public.little_wins WHERE id=(d->>'win_id')::uuid AND user_id=u AND pillar='fitness') THEN
    RAISE EXCEPTION 'Fitness win does not belong to this user';
  END IF;
  IF coalesce(d->>'template_id','')<>'' AND NOT EXISTS
    (SELECT 1 FROM public.fitness_templates WHERE id=(d->>'template_id')::uuid AND user_id=u) THEN
    RAISE EXCEPTION 'Template does not belong to this user';
  END IF;
  IF jsonb_array_length(p_sets)=0 AND greatest(coalesce((d->>'duration_seconds')::numeric,0),
    coalesce((d->>'distance_m')::numeric,0),coalesce((d->>'rounds')::numeric,0),coalesce((d->>'score')::numeric,0))=0 THEN
    RAISE EXCEPTION 'Enter a completed result';
  END IF;
  IF p_task_id IS NOT NULL THEN
    SELECT * INTO task FROM public.fitness_tasks WHERE id=p_task_id AND user_id=u FOR UPDATE;
    IF NOT FOUND OR task.status <> 'planned' THEN RAISE EXCEPTION 'Task is no longer available'; END IF;
    IF task.date <> (p_workout->>'date')::date OR task.slot <> p_workout->'details'->>'slot' THEN
      RAISE EXCEPTION 'Task date and training type must match this session';
    END IF;
  END IF;
  INSERT INTO public.workouts(id,user_id,date,name,kind,notes,details,media)
  VALUES(p_id,u,(p_workout->>'date')::date,trim(p_workout->>'name'),p_workout->>'kind',
    nullif(p_workout->>'notes',''),coalesce(p_workout->'details','{}'::jsonb),
    coalesce(p_workout->'media','[]'::jsonb))
  ON CONFLICT (id) DO NOTHING RETURNING id INTO inserted;
  IF inserted IS NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.workouts WHERE id=p_id AND user_id=u) THEN RAISE EXCEPTION 'Invalid session ID'; END IF;
    RETURN p_id;
  END IF;
  FOR s IN SELECT * FROM jsonb_array_elements(p_sets) LOOP
    IF jsonb_typeof(s) IS DISTINCT FROM 'object' OR coalesce(trim(s->>'exercise'),'')='' OR length(s->>'exercise')>180 THEN RAISE EXCEPTION 'Invalid exercise'; END IF;
    FOREACH k IN ARRAY ARRAY['weight','reps','seconds','rest_seconds','distance_m','effort'] LOOP
      IF s ? k AND s->k<>'null'::jsonb THEN
        IF jsonb_typeof(s->k)<>'number' OR (s->>k)::numeric<0 THEN RAISE EXCEPTION 'Invalid set metric: %', k; END IF;
      END IF;
    END LOOP;
    IF s->>'reps' IS NOT NULL AND (s->>'reps')::numeric<>trunc((s->>'reps')::numeric) THEN RAISE EXCEPTION 'Reps must be whole'; END IF;
    IF s->>'effort' IS NOT NULL AND ((s->>'effort')::numeric<1 OR (s->>'effort')::numeric>10) THEN RAISE EXCEPTION 'Effort must be 1 to 10'; END IF;
    IF coalesce(s->>'load_type','') NOT IN ('external','bodyweight','added','assisted') OR coalesce(s->>'side','') NOT IN ('both','left','right') THEN
      RAISE EXCEPTION 'Invalid load type or side';
    END IF;
    IF coalesce(s->>'weight',s->>'reps',s->>'seconds',s->>'distance_m') IS NULL THEN RAISE EXCEPTION 'Set requires a result'; END IF;
    n := n+1;
    INSERT INTO public.exercise_sets(user_id,workout_id,exercise,weight,reps,set_index,details)
    VALUES(u,p_id,trim(s->>'exercise'),(s->>'weight')::numeric,(s->>'reps')::integer,n,
      s - 'exercise' - 'weight' - 'reps');
  END LOOP;
  IF coalesce(d->>'routine_id','')<>'' THEN
    INSERT INTO public.routine_logs(id,user_id,routine_id,name,date,seconds)
    VALUES(p_id,u,(d->>'routine_id')::uuid,trim(p_workout->>'name'),(p_workout->>'date')::date,
      round(coalesce((d->>'duration_seconds')::numeric,0))::integer);
  END IF;
  IF p_task_id IS NOT NULL THEN
    UPDATE public.fitness_tasks SET status='done',workout_id=p_id WHERE id=p_task_id AND user_id=u;
  END IF;
  IF coalesce(d->>'win_id','')<>'' THEN
    INSERT INTO public.win_logs(id,user_id,win_id,title,pillar,date)
    VALUES(p_id,u,(d->>'win_id')::uuid,trim(p_workout->>'name'),'fitness',(p_workout->>'date')::date);
  END IF;
  RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.save_fitness_workout(uuid,jsonb,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_fitness_workout(uuid,jsonb,jsonb,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.move_fitness_task(p_id uuid,p_date date,p_swap_id uuid DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE old_date date; target_date date;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  -- Lock in stable order to prevent opposing swaps deadlocking.
  PERFORM id FROM public.fitness_tasks WHERE id IN (p_id,p_swap_id) AND user_id=auth.uid() ORDER BY id FOR UPDATE;
  SELECT date INTO old_date FROM public.fitness_tasks WHERE id=p_id AND user_id=auth.uid() AND status='planned';
  IF old_date IS NULL THEN RAISE EXCEPTION 'Only planned tasks can be moved'; END IF;
  IF p_swap_id IS NOT NULL THEN
    SELECT date INTO target_date FROM public.fitness_tasks WHERE id=p_swap_id AND user_id=auth.uid() AND status='planned';
    IF target_date IS NULL OR p_swap_id=p_id THEN RAISE EXCEPTION 'Choose another planned task'; END IF;
    UPDATE public.fitness_tasks SET date=old_date WHERE id=p_swap_id;
  ELSE target_date := p_date;
  END IF;
  UPDATE public.fitness_tasks SET date=target_date WHERE id=p_id AND user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.move_fitness_task(uuid,date,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.move_fitness_task(uuid,date,uuid) TO authenticated;

-- Only invoked after an explicit in-app deletion confirmation.
CREATE OR REPLACE FUNCTION public.delete_fitness_workout(p_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.workouts WHERE id=p_id AND user_id=auth.uid()) THEN
    RAISE EXCEPTION 'Session not found';
  END IF;
  UPDATE public.fitness_tasks SET status='planned',workout_id=NULL WHERE workout_id=p_id AND user_id=auth.uid();
  DELETE FROM public.routine_logs WHERE id=p_id AND user_id=auth.uid();
  DELETE FROM public.win_logs WHERE id=p_id AND user_id=auth.uid();
  DELETE FROM public.workouts WHERE id=p_id AND user_id=auth.uid();
END $$;
REVOKE ALL ON FUNCTION public.delete_fitness_workout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_fitness_workout(uuid) TO authenticated;
