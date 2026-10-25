-- Trading expansion: structured trade sections, trading plan, backtests, market learning progress

-- 1. Structured trade detail columns
ALTER TABLE public.trades ADD COLUMN source text NOT NULL DEFAULT 'live';
ALTER TABLE public.trades ADD COLUMN setup text;
ALTER TABLE public.trades ADD COLUMN entry_tf text;
ALTER TABLE public.trades ADD COLUMN trend_context jsonb;
ALTER TABLE public.trades ADD COLUMN htf_confluences jsonb;
ALTER TABLE public.trades ADD COLUMN confirmation text;
ALTER TABLE public.trades ADD COLUMN market_feeling text;
ALTER TABLE public.trades ADD COLUMN pair_feeling text;
ALTER TABLE public.trades ADD COLUMN exit_time time;
ALTER TABLE public.trades ADD COLUMN further_levels jsonb;
ALTER TABLE public.trades ADD COLUMN market_did text;
ALTER TABLE public.trades ADD COLUMN external_lesson text;

-- 2. Trading plan (one row per user)
CREATE TABLE public.trading_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  account_size numeric,
  account_currency text DEFAULT 'GBP',
  risk_per_trade text,
  max_daily_loss text,
  short_term_goal text,
  medium_term_goal text,
  allowed_strategies text,
  routines text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trading_plans TO authenticated;
GRANT ALL ON public.trading_plans TO service_role;
ALTER TABLE public.trading_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trading_plans" ON public.trading_plans FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trading_plans_updated_at BEFORE UPDATE ON public.trading_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Backtest log
CREATE TABLE public.backtests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now()::date),
  question text NOT NULL,
  market text,
  timeframe text,
  period_start date,
  period_end date,
  rules text,
  results text,
  verdict text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backtests TO authenticated;
GRANT ALL ON public.backtests TO service_role;
ALTER TABLE public.backtests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own backtests" ON public.backtests FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER backtests_updated_at BEFORE UPDATE ON public.backtests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Market learning progress (curriculum content lives in code)
CREATE TABLE public.learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_id text NOT NULL,
  status text NOT NULL DEFAULT 'todo',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, item_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own learning_progress" ON public.learning_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER learning_progress_updated_at BEFORE UPDATE ON public.learning_progress FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
