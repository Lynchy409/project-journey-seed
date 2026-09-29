CREATE TABLE public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'mobility',
  description text,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routines TO authenticated;
GRANT ALL ON public.routines TO service_role;
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own routines" ON public.routines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.routine_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  routine_id uuid NOT NULL REFERENCES public.routines(id) ON DELETE CASCADE,
  name text NOT NULL,
  cue text,
  seconds integer NOT NULL DEFAULT 30,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_steps TO authenticated;
GRANT ALL ON public.routine_steps TO service_role;
ALTER TABLE public.routine_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own routine_steps" ON public.routine_steps FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_routine_steps_updated_at BEFORE UPDATE ON public.routine_steps FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.routine_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  routine_id uuid REFERENCES public.routines(id) ON DELETE SET NULL,
  name text NOT NULL,
  date date NOT NULL DEFAULT (now())::date,
  seconds integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.routine_logs TO authenticated;
GRANT ALL ON public.routine_logs TO service_role;
ALTER TABLE public.routine_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own routine_logs" ON public.routine_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.match_decks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  subject text NOT NULL DEFAULT 'spanish',
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_decks TO authenticated;
GRANT ALL ON public.match_decks TO service_role;
ALTER TABLE public.match_decks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own match_decks" ON public.match_decks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_match_decks_updated_at BEFORE UPDATE ON public.match_decks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.match_pairs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deck_id uuid NOT NULL REFERENCES public.match_decks(id) ON DELETE CASCADE,
  left_text text NOT NULL,
  right_text text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_pairs TO authenticated;
GRANT ALL ON public.match_pairs TO service_role;
ALTER TABLE public.match_pairs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own match_pairs" ON public.match_pairs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_match_pairs_updated_at BEFORE UPDATE ON public.match_pairs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.match_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deck_id uuid REFERENCES public.match_decks(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT (now())::date,
  seconds numeric NOT NULL DEFAULT 0,
  accuracy integer NOT NULL DEFAULT 100,
  pairs integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.match_scores TO authenticated;
GRANT ALL ON public.match_scores TO service_role;
ALTER TABLE public.match_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own match_scores" ON public.match_scores FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);