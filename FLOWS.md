# Journey trading QA

## Spanish acceptance inventory

- Preserve existing Market/Focus/Games/Cards/Log and all other app routes.
- Add Spanish under Learn only, with deep links from Today and daily Spanish tasks.
- Save a profile without assuming beginner or assigning a certified CEFR level.
- Generate concrete daily activities around a 25-minute estimated workload; completion is activity-based, not timer-based. No backlog penalty.
- Play official Language Transfer SoundCloud audio with explicit third-party consent, real track metadata, per-track resume and honest played-time accounting excluding seeks/pauses.
- Keep external-app LT history separate; initial completed lessons are explicitly self-reported.
- Save/filter listening items and phrases; external playback is not automatically treated as completed.
- Show source-labelled discovery links and difficulty feedback without fabricated optimality.
- Authenticated AI conversation corrects each reply, allows valid alternatives, groups confident non-typo rule mistakes, and retains drafts on failure.
- Mistake practice cycles due rules with fresh examples, grades semantically and spaces successful reviews. Dismiss/restore incorrect suggestions.
- Voice stays gated until explicitly quality-verified. No transcript-only pronunciation grade.
- Roadmap uses separate can-do skills, personal goals and evidence; no fluency percentage or guaranteed date.
- Practice includes response building, situations, transcript-backed listening questions, self-reported real missions and useful phrases.
- Owner RLS, cross-user reference rejection, optimistic revision conflicts, atomic activity/task completion and retry idempotency tested in isolated SQL.
- No production schema changes, publishing or main merge without separate approval.

## Fitness development verification

- TypeScript and production build: passed.
- Fitness: 17 pure-function tests plus an isolated PostgreSQL migration/RLS integration test passed.
- Market regressions: 17 tests passed.
- New fitness code lint: no errors; two existing-style Fast Refresh export warnings.
- Browser fixtures: previous sets, session/task/goal linkage, templates/versioning, movement source popup, plans/milestones, routine completion, timer, rest override add/remove, retry safety, deletion and foundations checked.
- Main routes render in an isolated authenticated fixture; Review uses its existing full-screen flow rather than AppShell.
- Mobile 375px, desktop 1280px and short-window 1280x500 layouts inspected.
- Actual Lovable database migration, real-account persistence/RLS and publication are NOT complete. See `docs/fitness-release.md`.

## Fitness expansion acceptance checks
- Baseline: unauthenticated /train redirects to the existing sign-in screen.
- Preserve Today, Plan, Trade, Train, Learn, Inner, Profile, Journal and Review navigation.
- Train opens Today overview, Sessions, Library, Plans and Progress.
- Library retains the existing routine builder/player; Progress retains lift search and weight history.
- Broad daily strength/cardio/recovery slots open a chooser, not an immediate tick.
- Recurring days and rest days are editable. Move, swap, skip and reopen tasks.
- Save a session once: history, matching task and linked goals reflect the same record.
- Strength shows previous performed-session weight AND reps for every set.
- Track bodyweight, added load, assistance, timed holds, side and effort distinctly.
- Manual run distance/time calculates pace; comparable distance records exclude different run types.
- Sprint intervals, boxing, jiu-jitsu, circuits and user-defined sessions retain per-round/set results.
- Save templates, duplicate/edit versions, start from a template, save a logged session as a template.
- Cindy, circuit and bag-drill starter formats are source-labelled or explicitly user-editable.
- Movement library supports search, categories, favourites, try-later, custom entries and attempt logs.
- Core and neck are explicit categories with source-linked guidance, not fabricated optimality.
- Editable skill/strength plans preserve completed milestones; completion is explicitly user-confirmed.
- App-wide goals support manual, best performance, calendar totals, session counts and milestones.
- Weekly/monthly totals use actual activity dates; several holds cannot satisfy one continuous hold.
- Body check-ins reuse existing weight/water/energy and allow optional sleep/recovery notes.
- Failed save retains the draft; retry uses the same workout ID.
- Missing migration is a visible blocking message, not an empty history or successful save.
- Desktop/mobile layouts, keyboard labels, dialogs, timer controls and source links are checked.
- Browser interception tests are isolated QA, never a production auth bypass.
- Production persistence/RLS remain unverified until the migration is applied in the actual Lovable database.

The production app requires sign-in. No user credentials are available. Browser QA
uses intercepted Supabase responses in an isolated local browser, never a bypass in
application code. Mocked persistence is not production persistence verification.

## Existing main flows
- Sign-in screen renders without an authenticated session.
- Authenticated bottom navigation opens Today, Plan, Trade, Train, Learn and Inner.
- Trade tabs open Bias, Inspect, Log, Edge, Calendar, Rules, Plan, Backtests,
  Lessons, News and Calc without changing existing data.
- New trade form has separate context, confluences, confirmation and review fields.
- Learn > Market opens a lesson, reveals its answer and records learning status.
- Inspection form resets for a new entry and displays saved observations.

## New market hub
- News opens Briefing, Events, Perspectives and Understand.
- Briefing shows attributed dated feed headlines, source health, refresh and topic filters.
- Failed or old feeds show an explicit unavailable/stale state, not fabricated news.
- Events retains the existing economic calendar and adds relevant explanations.
- Perspectives distinguishes central-bank communication from independent analysis.
- Understand shows sourced evergreen explainers and opens the correct lesson.
- Learn links back to the market hub; URL deep links survive navigation and reload.
- Reflection saves to existing trading Lessons and invalidates lesson/journal queries.
- Lesson-progress errors are visible, do not look like an empty history and disable saves.
- Inspection partial lesson failure closes the saved inspection with a warning rather
  than allowing a retry to duplicate it.

## Off-happy-path and visual checks
- Feed HTML, malformed XML, unsafe URLs, missing/future dates and duplicate URLs.
- All sources unavailable, some unavailable, no matching topic and stale items.
- Progress-table missing, refresh recovers, inspection lesson-copy failure.
- Desktop 1280px and mobile 375px: no horizontal overflow; keyboard-reachable controls.
- Real source links open a new page; source dates and learning links remain readable.
