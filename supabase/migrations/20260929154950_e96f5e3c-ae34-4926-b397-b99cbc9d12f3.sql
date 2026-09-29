-- SHIFT TYPES
CREATE TABLE public.shift_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  start_time time,
  end_time time,
  color text NOT NULL DEFAULT 'slate',
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shift_types TO authenticated;
GRANT ALL ON public.shift_types TO service_role;
ALTER TABLE public.shift_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own shift_types" ON public.shift_types FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER shift_types_updated_at BEFORE UPDATE ON public.shift_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DAY ENTRIES
CREATE TABLE public.day_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  day_type text NOT NULL DEFAULT 'off',
  shift_type_id uuid REFERENCES public.shift_types(id) ON DELETE SET NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_entries TO authenticated;
GRANT ALL ON public.day_entries TO service_role;
ALTER TABLE public.day_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own day_entries" ON public.day_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER day_entries_updated_at BEFORE UPDATE ON public.day_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- DAY TEMPLATES
CREATE TABLE public.day_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day_type text NOT NULL,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.day_templates TO authenticated;
GRANT ALL ON public.day_templates TO service_role;
ALTER TABLE public.day_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own day_templates" ON public.day_templates FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER day_templates_updated_at BEFORE UPDATE ON public.day_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.template_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  template_id uuid NOT NULL REFERENCES public.day_templates(id) ON DELETE CASCADE,
  title text NOT NULL,
  pillar text NOT NULL DEFAULT 'life',
  non_negotiable boolean NOT NULL DEFAULT true,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.template_tasks TO authenticated;
GRANT ALL ON public.template_tasks TO service_role;
ALTER TABLE public.template_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own template_tasks" ON public.template_tasks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TASK LOGS
CREATE TABLE public.task_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  template_task_id uuid REFERENCES public.template_tasks(id) ON DELETE CASCADE,
  title text NOT NULL,
  pillar text NOT NULL DEFAULT 'life',
  non_negotiable boolean NOT NULL DEFAULT true,
  done boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date, template_task_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.task_logs TO authenticated;
GRANT ALL ON public.task_logs TO service_role;
ALTER TABLE public.task_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own task_logs" ON public.task_logs FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER task_logs_updated_at BEFORE UPDATE ON public.task_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- MOMENTUM
CREATE TABLE public.momentum_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  day_score integer NOT NULL DEFAULT 0,
  momentum integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.momentum_days TO authenticated;
GRANT ALL ON public.momentum_days TO service_role;
ALTER TABLE public.momentum_days ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own momentum_days" ON public.momentum_days FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER momentum_days_updated_at BEFORE UPDATE ON public.momentum_days FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- CHECK-INS
CREATE TABLE public.checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL,
  energy integer,
  weight numeric,
  water_ml integer,
  steps integer,
  win text,
  lesson text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, date)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkins TO authenticated;
GRANT ALL ON public.checkins TO service_role;
ALTER TABLE public.checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.checkins FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER checkins_updated_at BEFORE UPDATE ON public.checkins FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- GOALS
CREATE TABLE public.goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  title text NOT NULL,
  pillar text NOT NULL DEFAULT 'life',
  horizon text NOT NULL DEFAULT 'weekly',
  metric text,
  target_value numeric,
  current_value numeric NOT NULL DEFAULT 0,
  deadline date,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.goals TO authenticated;
GRANT ALL ON public.goals TO service_role;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.goals FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER goals_updated_at BEFORE UPDATE ON public.goals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- JOURNAL
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now()::date),
  pillar text NOT NULL DEFAULT 'life',
  entry_type text NOT NULL DEFAULT 'reflection',
  text text NOT NULL,
  photo_url text,
  is_lesson boolean NOT NULL DEFAULT false,
  pinned boolean NOT NULL DEFAULT false,
  goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.journal_entries TO authenticated;
GRANT ALL ON public.journal_entries TO service_role;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own journal_entries" ON public.journal_entries FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER journal_entries_updated_at BEFORE UPDATE ON public.journal_entries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- WORKOUTS
CREATE TABLE public.workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now()::date),
  name text NOT NULL,
  kind text NOT NULL DEFAULT 'gym',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.workouts TO authenticated;
GRANT ALL ON public.workouts TO service_role;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own workouts" ON public.workouts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER workouts_updated_at BEFORE UPDATE ON public.workouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workout_id uuid NOT NULL REFERENCES public.workouts(id) ON DELETE CASCADE,
  exercise text NOT NULL,
  weight numeric,
  reps integer,
  set_index integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.exercise_sets TO authenticated;
GRANT ALL ON public.exercise_sets TO service_role;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own exercise_sets" ON public.exercise_sets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRADING
CREATE TABLE public.trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now()::date),
  time_of_trade time,
  pair text NOT NULL,
  strategy text NOT NULL DEFAULT 'all_tf_aligned',
  direction text NOT NULL DEFAULT 'long',
  entry numeric,
  stop numeric,
  target numeric,
  rr numeric,
  outcome text NOT NULL DEFAULT 'open',
  result_r numeric,
  emotions text,
  screenshot_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trades TO authenticated;
GRANT ALL ON public.trades TO service_role;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trades" ON public.trades FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trades_updated_at BEFORE UPDATE ON public.trades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.trade_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  text text NOT NULL,
  sort integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.trade_rules TO authenticated;
GRANT ALL ON public.trade_rules TO service_role;
ALTER TABLE public.trade_rules ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own trade_rules" ON public.trade_rules FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.bias_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  tf_4h text NOT NULL,
  tf_1h text NOT NULL,
  tf_15m text NOT NULL,
  tf_5m text NOT NULL,
  verdict text NOT NULL,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.bias_snapshots TO authenticated;
GRANT ALL ON public.bias_snapshots TO service_role;
ALTER TABLE public.bias_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bias_snapshots" ON public.bias_snapshots FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- LEARNING
CREATE TABLE public.study_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  date date NOT NULL DEFAULT (now()::date),
  minutes integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'spanish',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_sessions TO authenticated;
GRANT ALL ON public.study_sessions TO service_role;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own study_sessions" ON public.study_sessions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deck text NOT NULL DEFAULT 'Spanish',
  front text NOT NULL,
  back text NOT NULL,
  box integer NOT NULL DEFAULT 1,
  due_on date NOT NULL DEFAULT (now()::date),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.flashcards TO authenticated;
GRANT ALL ON public.flashcards TO service_role;
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flashcards" ON public.flashcards FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER flashcards_updated_at BEFORE UPDATE ON public.flashcards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- SEED DEFAULTS FOR A USER
CREATE OR REPLACE FUNCTION public.seed_user_defaults(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE work_id uuid; off_id uuid; rest_id uuid;
BEGIN
  INSERT INTO public.shift_types (user_id, name, start_time, end_time, color, sort)
  SELECT _user_id, v.name, v.s::time, v.e::time, v.c, v.o
  FROM (VALUES
    ('Early','06:00','14:00','amber',0),
    ('Late','14:00','22:00','violet',1),
    ('Night','22:00','06:00','indigo',2),
    ('Long Day','07:00','19:30','rose',3)
  ) AS v(name,s,e,c,o)
  WHERE NOT EXISTS (SELECT 1 FROM public.shift_types WHERE user_id = _user_id);

  IF NOT EXISTS (SELECT 1 FROM public.day_templates WHERE user_id = _user_id) THEN
    INSERT INTO public.day_templates (user_id, day_type, name) VALUES (_user_id,'work','Work day') RETURNING id INTO work_id;
    INSERT INTO public.day_templates (user_id, day_type, name) VALUES (_user_id,'off','Off day') RETURNING id INTO off_id;
    INSERT INTO public.day_templates (user_id, day_type, name) VALUES (_user_id,'rest','Rest / Recovery') RETURNING id INTO rest_id;

    INSERT INTO public.template_tasks (user_id, template_id, title, pillar, non_negotiable, sort) VALUES
      (_user_id, work_id, '20 min Spanish', 'learning', true, 0),
      (_user_id, work_id, 'Mobility 15 min', 'fitness', true, 1),
      (_user_id, work_id, 'Hit protein target', 'fitness', true, 2),
      (_user_id, work_id, 'Drink water target', 'life', true, 3),
      (_user_id, work_id, 'No trading today', 'trading', false, 4),
      (_user_id, off_id, 'Full gym session or sprints', 'fitness', true, 0),
      (_user_id, off_id, 'Trading session', 'trading', true, 1),
      (_user_id, off_id, '30+ min Spanish', 'learning', true, 2),
      (_user_id, off_id, 'Journal one lesson', 'life', true, 3),
      (_user_id, rest_id, 'Stretch 20 min', 'fitness', true, 0),
      (_user_id, rest_id, '15 min Spanish', 'learning', true, 1),
      (_user_id, rest_id, 'Sleep 8 hours', 'life', true, 2);
  END IF;

  INSERT INTO public.trade_rules (user_id, text, sort)
  SELECT _user_id, v.t, v.o FROM (VALUES
    ('Only trade my two setups: all timeframes aligned, or HTF draw on liquidity.', 0),
    ('No entry without a 1 min break of structure when the setup calls for it.', 1),
    ('Check for HTF liquidity resting above or below before entering.', 2),
    ('Be wary of price structure breaks against me.', 3),
    ('Log every trade with entry, stop, target, RR, screenshot and emotions.', 4),
    ('Walk away after my daily loss limit. No revenge trades.', 5)
  ) AS v(t,o)
  WHERE NOT EXISTS (SELECT 1 FROM public.trade_rules WHERE user_id = _user_id);
END; $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email,'@',1)), NEW.raw_user_meta_data->>'avatar_url');
  INSERT INTO public.identity_statements (user_id, text, pillar, sort) VALUES
    (NEW.id, 'I am a pro trader who follows his strategy to a tee which has led me to live this prosperous life', 'trading', 0),
    (NEW.id, 'I am a beast with years of experience and training who backs myself against anyone in the world', 'fitness', 1),
    (NEW.id, 'Soy una persona que habla español con fluidez', 'learning', 2),
    (NEW.id, 'I am a man who finishes what he starts', 'life', 3);
  PERFORM public.seed_user_defaults(NEW.id);
  RETURN NEW;
END; $function$;