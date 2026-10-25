-- Additive Spanish workspace. Apply to this app's actual Lovable database only after schema inspection.
CREATE TABLE IF NOT EXISTS public.spanish_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('profile','task','listening','content','conversation','mistake','phrase','mission','milestone')),
  key text NOT NULL CHECK (length(key) BETWEEN 1 AND 200),
  data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data)='object'),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id,kind,key)
);
CREATE TABLE IF NOT EXISTS public.spanish_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  kind text NOT NULL CHECK (kind IN ('listen','conversation','review','practice','mission')),
  seconds integer NOT NULL DEFAULT 0 CHECK (seconds BETWEEN 0 AND 86400),
  task_id uuid REFERENCES public.spanish_items(id) ON DELETE SET NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(data)='object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS spanish_items_owner_kind ON public.spanish_items(user_id,kind);
CREATE INDEX IF NOT EXISTS spanish_activities_owner_date ON public.spanish_activities(user_id,date);
ALTER TABLE public.spanish_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spanish_activities ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='spanish_items' AND policyname='Spanish owner') THEN
    CREATE POLICY "Spanish owner" ON public.spanish_items FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='spanish_activities' AND policyname='Spanish owner') THEN
    CREATE POLICY "Spanish owner" ON public.spanish_activities FOR ALL TO authenticated USING(auth.uid()=user_id) WITH CHECK(auth.uid()=user_id);
  END IF;
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.spanish_items,public.spanish_activities TO authenticated;

CREATE OR REPLACE FUNCTION public.check_spanish_task_owner() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN
  IF NEW.task_id IS NOT NULL AND NOT EXISTS(
    SELECT 1 FROM spanish_items WHERE id=NEW.task_id AND user_id=NEW.user_id AND kind='task'
      AND data->>'date'=NEW.date::text AND data->>'action'=NEW.kind
  ) THEN RAISE EXCEPTION 'Task must belong to this user and match the activity date and kind'; END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS spanish_activity_owner ON public.spanish_activities;
CREATE TRIGGER spanish_activity_owner BEFORE INSERT OR UPDATE ON public.spanish_activities FOR EACH ROW EXECUTE FUNCTION public.check_spanish_task_owner();

CREATE OR REPLACE FUNCTION public.put_spanish_item(p_id uuid,p_kind text,p_key text,p_data jsonb,p_revision integer)
RETURNS SETOF public.spanish_items LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE saved public.spanish_items;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  IF p_revision < 0 OR p_revision IS NULL THEN RAISE EXCEPTION 'Invalid revision'; END IF;
  IF p_revision=0 THEN
    INSERT INTO spanish_items(id,user_id,kind,key,data) VALUES(p_id,auth.uid(),p_kind,p_key,p_data)
      ON CONFLICT(user_id,kind,key) DO NOTHING RETURNING * INTO saved;
    IF saved.id IS NULL THEN
      SELECT * INTO saved FROM spanish_items WHERE user_id=auth.uid() AND kind=p_kind AND key=p_key;
      -- A client may have lost the first successful response and generated a new UUID.
      -- Same owner/key/payload is still an exact semantic retry, not a new record.
      IF saved.data IS DISTINCT FROM p_data THEN RAISE EXCEPTION 'This record changed. Reload it before saving'; END IF;
    END IF;
  ELSE
    UPDATE spanish_items SET data=p_data,revision=revision+1,updated_at=now()
      WHERE id=p_id AND user_id=auth.uid() AND kind=p_kind AND key=p_key AND revision=p_revision
      RETURNING * INTO saved;
    IF saved.id IS NULL THEN
      SELECT * INTO saved FROM spanish_items WHERE id=p_id AND user_id=auth.uid() AND kind=p_kind AND key=p_key;
      IF saved.id IS NULL OR saved.revision<>p_revision+1 OR saved.data IS DISTINCT FROM p_data THEN
        RAISE EXCEPTION 'This record changed. Reload it before saving';
      END IF;
    END IF;
  END IF;
  RETURN NEXT saved;
END $$;

CREATE OR REPLACE FUNCTION public.record_spanish_activity(p_id uuid,p_date text,p_kind text,p_seconds integer,p_data jsonb,p_task_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER SET search_path=public AS $$
DECLARE target public.spanish_items; existing public.spanish_activities;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in required'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(auth.uid()::text||p_id::text,0));
  SELECT * INTO existing FROM spanish_activities WHERE id=p_id AND user_id=auth.uid();
  IF existing.id IS NOT NULL THEN
    IF existing.date::text<>p_date OR existing.kind<>p_kind OR existing.seconds<>p_seconds
      OR existing.task_id IS DISTINCT FROM p_task_id OR existing.data IS DISTINCT FROM p_data
      THEN RAISE EXCEPTION 'This activity id was already used for different evidence'; END IF;
    RETURN p_id;
  END IF;
  IF p_date !~ '^\d{4}-\d{2}-\d{2}$' THEN RAISE EXCEPTION 'Invalid date'; END IF;
  IF p_task_id IS NOT NULL THEN
    SELECT * INTO target FROM spanish_items WHERE id=p_task_id AND user_id=auth.uid() AND kind='task' FOR UPDATE;
    IF target.id IS NULL OR target.data->>'date'<>p_date OR target.data->>'action'<>p_kind OR target.data->>'status'<>'planned' THEN
      RAISE EXCEPTION 'Task must be a matching planned task belonging to this user';
    END IF;
  END IF;
  INSERT INTO spanish_activities(id,user_id,date,kind,seconds,task_id,data) VALUES(p_id,auth.uid(),p_date::date,p_kind,p_seconds,p_task_id,p_data);
  IF p_task_id IS NOT NULL THEN
    UPDATE spanish_items SET data=data||jsonb_build_object('status','done','evidence',p_id::text,'completed_at',now()),revision=revision+1,updated_at=now()
      WHERE id=p_task_id;
  END IF;
  RETURN p_id;
END $$;
REVOKE ALL ON FUNCTION public.put_spanish_item(uuid,text,text,jsonb,integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.record_spanish_activity(uuid,text,text,integer,jsonb,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.put_spanish_item(uuid,text,text,jsonb,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_spanish_activity(uuid,text,text,integer,jsonb,uuid) TO authenticated;
