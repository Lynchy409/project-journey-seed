# My Journey — Understanding, Gaps, Data Model, Build Order Review

No code will be written from this plan. It is a review document. Approving it only confirms the understanding before Phase 1.

Important: the Project Knowledge I can see stops partway through section 10 ("Rules (editable list, always visible,"). Everything after that (the rest of Trade, and all of Train, Learn, Life, Settings) is missing. Please check the knowledge field for a character limit, or paste the rest into chat.

## 1. My understanding (10 points, updated with your corrections)

1. An all-round life companion that helps you set goals and achieve them. You can add goals whenever you like and tick them off whenever you like. The first user is you, and other people can use it later.
2. Goals are shown visually across three horizons: short, medium and long term. Each goal has a clear outline of the steps to reach it.
3. Pillars: Trading, Fitness, Learning and Life. The colours don't matter to you. What matters is that the app feels clean, bright and eye-catching.
4. Fitness includes logging workouts and logging your body weight, with progress shown on charts.
5. Learning has built-in study tools (for example flashcards and a timer).
6. Trading has a **trade log**. Each trade records the time of the trade, the strategy used ("1-min strat" or "all timeframes aligned") and other key data.
7. Trading also has a **bias tracker**. You enter the trend on the 4h, 1h, 15m and 5m charts, and it tells you which strategy to look for. For example, if all four are bullish it points to the all-timeframes-aligned strategy. (Your message cut off here.)
8. The app stores your information and acts as a memory: journal entries, lessons, and your history across every section.
9. The calendar/shift planning, the momentum score and the Morning/Evening flows from the knowledge still apply as supporting features, unless you tell me otherwise.
10. Design is mobile-first, with big numbers, rings and bars, very little text, and one clear action per screen.

## 2. Questions, gaps and conflicts

**Missing content**
- Your last message stopped mid-sentence in the bias tracker. What does it recommend when the timeframes are *mixed* (for example 4h bullish, 5m bearish)? And what other key data should a trade log hold (pair, entry, stop, target, result in R, screenshot, emotions)?
- The knowledge also cuts off at the Trade section. Train, Learn and Life are not described in detail.
- Should goals be planned fairly rigidly around shifts (as in the knowledge), or be more flexible, ticked off "whenever"? This changes how central the calendar is.
- Should the app *suggest* the steps to reach a goal (using AI), or will you write the steps yourself?

**Calendar and momentum**
- Night shifts cross midnight. Does a night shift belong to the day it starts? And which day do "today's" tasks and momentum belong to at 3am? This needs a configurable day-rollover time (for example 4am).
- If a day has no type assigned, which template applies? Or does it count toward momentum at all?
- Do Rest/Recovery days have non-negotiables? If there are none, is the day score 100 or is the day skipped?
- What momentum does a brand-new user start at: 0, 50, or no score until 3 days have passed?
- What happens when you edit a template after the day has passed? I suggest saving a snapshot of each day's tasks at creation so past scores never change.
- Is the "Comeback" state triggered by one miss, or by a score below some threshold?

**Goals**
- Is the limit of 3 per pillar for weekly goals only, or for monthly too? Does Life count as a pillar for this limit?
- Which day does the week start on (Monday?), and which day is the Weekly Review by default?
- There are "3 pillar goals + identity" vision goals, but four pillars and four identity statements. Is Life part of the Vision?

**Auto-linked progress**
- Auto-linked progress depends on Train, Learn and Trade, but those are built after Goals. Until then, goals will need to use manual progress.

**Other**
- Photos: do motivation photos and journal photos need secure private storage? (I assume yes.)
- Evening Check-in: are steps and nutrition entered by hand? (No health-app sync on web.)
- Multi-user later: for now, each account sees only its own data. Is anything shared or social?
- Sign-in method: email/password, Google, or both?
- The four identity goals and the day templates: should I pre-fill them with your examples as editable defaults? (I assume yes.)

## 3. Proposed tables (every table is owned by one user)

```text
Core / config
  profiles            name, avatar, timezone, day_rollover_time, week_start, review_day
  pillars             (fixed list: trading, fitness, learning, life - enum, not a table)
  shift_types         name, start_time, end_time, colour, sort
  day_templates       day_type (work/off/rest), optional shift_type_id, name
  template_items      template_id, title, pillar, is_non_negotiable, target_value, unit, sort
  identity_statements text, sort, active
  motivation_photos   storage_path, sort

Calendar spine
  calendar_days       date, day_type, shift_type_id, template_id, notes
  day_tasks           date, source_item_id, title, pillar, is_non_negotiable, done, done_at
                      (snapshot of template items, so history is stable)
  daily_scores        date, day_score, momentum   (stored, recalculated forward on edit)
  scheduled_items     date, kind (workout/trade_session/study), ref_id, time

Daily flows
  morning_flow_steps  title, kind (read_goals/timer/check), duration_sec, sort
  morning_flow_logs   date, completed_steps, finished_at
  evening_checkins    date, steps, nutrition(json), energy 1-5, win, lesson_entry_id

Goals spine
  goals               level (vision/monthly/weekly), pillar, title, metric, target,
                      deadline, parent_id, progress_source (manual/auto), auto_key, status,
                      period_start
  goal_progress       goal_id, date, value, source_ref
  weekly_reviews      week_start, scores(json), worked, didnt, lesson_entry_id, completed_at

Journal spine
  journal_entries     date, pillar, type, text, photo_path, is_lesson, pinned,
                      last_surfaced_at
  journal_links       entry_id, target_kind (trade/workout/goal/study_set), target_id

Later phases (shape to be confirmed once specs arrive)
  Train:  routines, routine_exercises, workouts, workout_sets, personal_records
  Learn:  study_sets, cards, card_reviews (spaced repetition), study_sessions (timer)
  Trade:  trading_rules, setups, trading_accounts, trades, trade_rule_checks
```

The roles table is left out until an admin feature exists, since every table is private to its owner.

## 4. Build order review

Overall the order is sound. Building the calendar and Today first matches the core problem. Flags:

1. **Phase 1 "core tables" is too broad.** Create only the config and calendar tables in Phase 1. Add each later phase's tables in that phase, so no schema is guessed ahead of the specs.
2. **The floating "+" and the Journal header icon appear in Phase 1's shell**, but their destinations don't exist until Phases 4–7. Either hide options until each area exists, or ship the Journal earlier.
3. **The Journal is a spine but is built in Phase 4.** The Evening Check-in (Phase 2) and Weekly Review (Phase 3) both write lessons to the Journal. I recommend a minimal Journal (entries table and a basic list) in Phase 2. Phase 4 would then add the Library, filters, search and resurfacing.
4. **Today's "Today's lesson" card** (Phase 2) can't work until Phase 4. Show an empty or hidden state until then.
5. **Auto-linked goal progress** (Phase 3) depends on Phases 5–7. Build the "progress source" hook in Phase 3, then wire up each source in its own phase.
6. **Scheduling workouts and trade sessions onto dates** (Phase 2 spec) depends on routines (Phase 5) and trading sessions (Phase 7). Leave these for those phases.
7. **Settings in Phase 8 is too late.** Editing shift types, templates, identity goals and photos is needed from Phase 2. Build each settings screen with its feature. Phase 8 would only collect them into one place.
8. **Security in Phase 8 is too late to start.** Access rules that keep each user's data private should come with every table from Phase 1. Phase 8 is a final audit only.
9. **Mobile polish:** design at 390px from Phase 1. Phase 8 is just a final pass.
10. **Trade last is fine**, and your note about defining the execution flow first is right. The Trade tab should show a "coming soon" placeholder until then.
11. **Missing:** the Life section and the Profile area have no phase. Time zones and night-shift day rollover should be decided in Phase 2.

Revised order:

```text
P1  Design system, 5-tab shell, sign-in, profile, config + calendar tables, access rules
P2  Shifts + paint mode + day templates (with their settings) + Today + momentum
    + Morning Flow + Evening Check-in + minimal Journal
P3  Goals + manual progress + auto-progress hook + Weekly Review
P4  Full Journal + Lessons Library + daily resurfacing
P5  Train (+ its auto-goal sources, scheduling on calendar)
P6  Learn engine, Flashcards, Match, LT tracker, timer (+ auto-goal sources)
P7  Trade (after execution flow spec)
P8  Life section, unified Settings, security audit, polish
```

## Next step
Please answer the questions in section 2, most importantly the truncated knowledge, night-shift day rollover, sign-in method and week start. Then I'll write a detailed Phase 1 plan.
