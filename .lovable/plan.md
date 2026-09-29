# My Journey — Updated Understanding, Suggestions, Data Model, Build Order

This is a review only. No code yet. Approving it locks in the direction, and then I'll write a detailed Phase 1 plan.

## 1. Understanding (10 points)

1. **A life companion for goals.** Add goals any time, tick them off any time, and see them visually as short, medium and long term, with steps to reach each one. Goals are unlimited. AI suggestions for steps are optional and clearly marked so you can judge the quality.
2. **Pillars:** Trading, Fitness, Learning, Life. Colours can be anything. The look is clean, bright, eye-catching and mobile-first.
3. **Shifts calendar = simple planning.** Enter a start and end date/time. For example, Thu 7pm to Fri 10am is one shift across both days. The calendar then shows clearly what free time you have over the next few weeks.
4. **Trade log:** pair, time, strategy, entry, stop, target, R:R, result, screenshot, emotions.
5. **Bias tracker, strategy 1 (all timeframes aligned):**
   - 4h, 1h, 15m and 5m all agree: look for a 1-min entry.
   - Only 1h, 15m and 5m agree: it's a judgement call. Enter only if you feel confident.
   - Otherwise: no clear setup.
6. **Bias tracker, strategy 2 (liquidity):** wait for a higher-timeframe draw on liquidity, then enter on a 1-min break of structure. It shows warnings: other higher-timeframe liquidity resting above or below, and watch for structure breaks.
7. **Lift tracker (like Hevy):**
   - Log sets live during a session. Each exercise shows your last session's weight and reps as you type.
   - Search any lift (for example incline bench) to see your heaviest weight ever, your best weight at each rep count (1, 3, 5, 8, 10...) and full history.
   - Each lift can have a goal (weight + reps + date).
8. **Session builder:** starter sessions (Push, Pull, Legs) plus your own, built by search or by body part. Tap "Load" to log a session live. The rest timer and exercise videos come later, around public launch.
9. **Body tracking** uses toggles: pick what you track. For you that's body weight and water, with no calories.
10. **Learn** is your personal knowledge journey: store what you learn, set your own learning goals and reach them. Flashcards and study tools come later.

## 2. My suggestions (please react)

**Momentum, reworked into a "hook" that pulls you back in**
- **Momentum ring:** a smoothed score that drops when you miss a day but never resets to zero. A comeback shows as a big jump. It stays the headline number on Today.
- **Daily "win the day":** a small set of daily tasks. Tick them all and you get a satisfying fill animation and a green day on the calendar.
- **Levels and XP:** every logged trade, set, lesson or goal tick earns XP, and levels unlock titles ("Consistent", "Relentless").
- **New PR celebrations:** a full-screen moment when you beat a lift PR or hit a goal.
- **Weekly recap card:** "This week: 4 sessions, 12 trades, 3 lessons."

I'd start with the ring, win the day and PR celebrations, then add XP later.

**Goals not being hit**
- If a goal hasn't moved for a set time, or several goals slip, show a gentle prompt: "Let's check in." It opens a short journal flow with questions like:
  - What's blocking this?
  - Too many goals?
  - Should this be paused or broken into smaller steps?

**Sign-in that switches you on**
- The first time, you sign in with Google (one tap). After that you stay signed in.
- Opening the app shows a 3-second "switch on" screen: one of your identity statements, full screen, with a single "Let's go" tap. It energises you without getting in the way.

## 3. Remaining questions
- Bias tracker trend options: just Bullish / Bearish / Ranging per timeframe?
- For the liquidity strategy, should the tracker only show a checklist and reminders (it can't read the chart itself)?
- Trade result: record in R, in money, or both? Do you have a funded account with rules to track (daily loss limit, max drawdown)?
- Weight units: kg?
- Morning Flow and Evening Check-in from the knowledge: keep them, or drop them for now?

## 4. Tables (each private to its owner)

```text
Core        profiles (name, timezone, units, tracking toggles), identity_statements
Calendar    shifts (start_at, end_at, label), calendar_notes
Goals       goals (horizon short/med/long, pillar, title, target, deadline, parent_id,
            status, progress_source), goal_steps (title, done, ai_suggested), goal_progress
Journal     journal_entries (date, pillar, type, text, photo, is_lesson, pinned),
            journal_links
Momentum    daily_tasks, daily_scores (day_score, momentum), xp_events (later)
Body        body_logs (date, weight, water_ml)
Train       exercises (name, body_part, video_url), session_templates, template_exercises,
            workouts, workout_sets (exercise, weight, reps, set_no), lift_goals
            (PRs are calculated from sets, not stored)
Trade       trades (pair, time, strategy, entry, stop, target, rr, result_r, screenshot,
            emotions, notes), bias_checks (tf trends, recommendation, strategy)
Learn       learning_items (topic, notes, source, pillar), later: study_sets, cards
```

## 5. Build order review

Your original order put Train late and Trade last. Your notes make those two the most defined parts. Flags:
- The Journal is needed early (goal check-ins write to it), so build a basic version with Goals.
- Settings and security should come with each feature, not at the end.
- The calendar is now simple (shifts only), so it can be quick.

Revised order:

```text
P1  Design system, 5-tab shell, Google sign-in, "switch on" screen, profile + toggles
P2  Shifts calendar + Today (win-the-day tasks, momentum ring, body log: weight/water)
P3  Goals (short/med/long, steps, optional AI suggestions) + basic Journal + check-in prompt
P4  Train: exercise library, session builder, live logging with last-session values,
    lift search with PRs by reps, lift goals, PR celebration
P5  Trade: trade log + bias tracker (both strategies) + stats
P6  Learn: knowledge store + learning goals
P7  Lessons Library + resurfacing, weekly recap, XP/levels
P8  Rest timer, exercise videos, final security audit and polish (launch prep)
```

## Technical notes
- Lovable Cloud for sign-in, database and photo/screenshot storage. Every table gets access rules so only its owner can see it.
- PRs are calculated from logged sets, so they're always accurate.
- Momentum is recalculated from daily scores, so editing a past day stays consistent.
