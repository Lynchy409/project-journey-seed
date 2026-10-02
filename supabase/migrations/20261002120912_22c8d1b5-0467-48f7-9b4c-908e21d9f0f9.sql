ALTER TABLE public.workouts ADD COLUMN media_url text, ADD COLUMN media_type text;

CREATE POLICY "own workout media insert" ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'workout-media' AND name LIKE auth.uid()::text || '/%');
CREATE POLICY "own workout media select" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'workout-media' AND name LIKE auth.uid()::text || '/%');
CREATE POLICY "own workout media delete" ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'workout-media' AND name LIKE auth.uid()::text || '/%');

CREATE TABLE public.little_wins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL,
  pillar text NOT NULL DEFAULT 'life',
  minutes integer NOT NULL DEFAULT 5,
  cue text,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.little_wins TO authenticated;
GRANT ALL ON public.little_wins TO service_role;
ALTER TABLE public.little_wins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own little_wins" ON public.little_wins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER little_wins_updated BEFORE UPDATE ON public.little_wins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.win_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  win_id uuid REFERENCES public.little_wins(id) ON DELETE SET NULL,
  title text NOT NULL,
  pillar text NOT NULL,
  date date NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.win_logs TO authenticated;
GRANT ALL ON public.win_logs TO service_role;
ALTER TABLE public.win_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own win_logs" ON public.win_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);