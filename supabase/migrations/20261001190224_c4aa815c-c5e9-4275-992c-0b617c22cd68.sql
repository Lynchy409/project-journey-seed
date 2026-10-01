CREATE TABLE public.inner_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  kind text NOT NULL DEFAULT 'curiosity',
  title text NOT NULL,
  skill text,
  date date,
  done boolean NOT NULL DEFAULT false,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inner_items TO authenticated;
GRANT ALL ON public.inner_items TO service_role;
ALTER TABLE public.inner_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inner_items" ON public.inner_items FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER inner_items_updated BEFORE UPDATE ON public.inner_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();