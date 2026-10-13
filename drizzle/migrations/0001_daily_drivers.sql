CREATE TABLE public.driver_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  date date NOT NULL DEFAULT CURRENT_DATE,
  driver_key text NOT NULL,
  evidence text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, driver_key)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.driver_logs TO authenticated;
GRANT ALL ON public.driver_logs TO service_role;
ALTER TABLE public.driver_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own driver logs" ON public.driver_logs FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);