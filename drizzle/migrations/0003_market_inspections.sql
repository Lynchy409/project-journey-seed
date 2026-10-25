-- Market inspection entries + confirmation timeframe

-- 1. Market inspection: observe the market without needing a trade
CREATE TABLE public.market_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now()::date),
  pair text,
  market_view text,
  spotted text,
  learnt text,
  improve text,
  investigate text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_inspections TO authenticated;
GRANT ALL ON public.market_inspections TO service_role;
ALTER TABLE public.market_inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own market_inspections" ON public.market_inspections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER market_inspections_updated_at BEFORE UPDATE ON public.market_inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Confirmation timeframe on trades
ALTER TABLE public.trades ADD COLUMN confirmation_tf text;
