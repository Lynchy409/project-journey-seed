CREATE OR REPLACE FUNCTION public.commit_training_log(p_id uuid, p_workout jsonb, p_sets jsonb, p_edit boolean DEFAULT false) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE u uuid := auth.uid(); s jsonb; n integer := 0; d jsonb := p_workout->'details'; slots jsonb := coalesce(d->'completed_slots','[]'::jsonb); driver text; outcome text; old_date date;
BEGIN
 IF u IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
 IF p_edit THEN
   SELECT date INTO old_date FROM public.workouts WHERE id=p_id AND user_id=u FOR UPDATE;
   IF NOT FOUND THEN RAISE EXCEPTION 'Session not found'; END IF;
   IF coalesce(trim(p_workout->>'name'),'')='' OR jsonb_typeof(p_sets) IS DISTINCT FROM 'array' THEN RAISE EXCEPTION 'Invalid session'; END IF;
   IF coalesce(d->>'slot','') NOT IN ('strength','cardio','recovery') THEN RAISE EXCEPTION 'Invalid slot'; END IF;
   IF jsonb_array_length(p_sets)=0 AND greatest(coalesce((d->>'duration_seconds')::numeric,0),coalesce((d->>'distance_m')::numeric,0),coalesce((d->>'rounds')::numeric,0))<=0 THEN RAISE EXCEPTION 'Enter a completed result'; END IF;
   FOR s IN SELECT * FROM jsonb_array_elements(p_sets) LOOP
     IF coalesce(trim(s->>'exercise'),'')='' OR coalesce(s->>'weight',s->>'reps',s->>'seconds',s->>'distance_m') IS NULL THEN RAISE EXCEPTION 'Invalid set'; END IF;
     FOREACH outcome IN ARRAY ARRAY['weight','reps','seconds','distance_m','rest_seconds'] LOOP
       IF s->>outcome IS NOT NULL AND (s->>outcome)::numeric<0 THEN RAISE EXCEPTION 'Invalid set metric'; END IF;
     END LOOP;
     IF s->>'reps' IS NOT NULL AND (s->>'reps')::numeric<>trunc((s->>'reps')::numeric) THEN RAISE EXCEPTION 'Reps must be whole'; END IF;
   END LOOP;
   UPDATE public.workouts SET date=(p_workout->>'date')::date,name=trim(p_workout->>'name'),kind=p_workout->>'kind',notes=nullif(p_workout->>'notes',''),details=d,media=coalesce(p_workout->'media','[]'::jsonb) WHERE id=p_id AND user_id=u;
   DELETE FROM public.exercise_sets WHERE workout_id=p_id AND user_id=u;
   FOR s IN SELECT * FROM jsonb_array_elements(p_sets) LOOP
     n := n+1;
     INSERT INTO public.exercise_sets(user_id,workout_id,exercise,weight,reps,set_index,details) VALUES(u,p_id,trim(s->>'exercise'),(s->>'weight')::numeric,(s->>'reps')::integer,n,s-'exercise'-'weight'-'reps');
   END LOOP;
 ELSE
   PERFORM public.save_fitness_workout(p_id,p_workout,p_sets,NULL);
 END IF;
 -- Only recorded work counts, never merely selecting a section.
 UPDATE public.fitness_tasks SET status='planned',workout_id=NULL WHERE user_id=u AND workout_id=p_id AND (date<>(p_workout->>'date')::date OR NOT (slots ? slot));
 UPDATE public.fitness_tasks SET status='done',workout_id=p_id WHERE user_id=u AND date=(p_workout->>'date')::date AND status='planned' AND slots ? slot;
 DELETE FROM public.driver_logs WHERE user_id=u AND evidence LIKE '[workout:' || p_id::text || ']%' AND (date<>(p_workout->>'date')::date OR NOT (slots ? CASE WHEN driver_key='sprint' THEN 'cardio' ELSE driver_key END) OR (driver_key='sprint' AND p_workout->>'kind'<>'sprints') OR (driver_key='cardio' AND p_workout->>'kind'='sprints'));
 FOR outcome IN SELECT jsonb_array_elements_text(slots) LOOP
   IF outcome NOT IN ('strength','cardio','recovery') THEN RAISE EXCEPTION 'Invalid completed section'; END IF;
   driver := CASE WHEN outcome='cardio' AND p_workout->>'kind'='sprints' THEN 'sprint' ELSE outcome END;
   INSERT INTO public.driver_logs(user_id,date,driver_key,evidence) VALUES(u,(p_workout->>'date')::date,driver,'[workout:' || p_id::text || '] ' || (p_workout->>'name')) ON CONFLICT(user_id,date,driver_key) DO NOTHING;
 END LOOP;
 RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.commit_training_log(uuid,jsonb,jsonb,boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.commit_training_log(uuid,jsonb,jsonb,boolean) TO authenticated;