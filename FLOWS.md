# Journey trading QA

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
