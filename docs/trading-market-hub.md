# Trading market-information hub

The hub connects sourced reading to forex study and personal reflections. It is
educational context, not a signal service, trading recommendation or guarantee of
mastery.

## Where to find it

- **Trade → News → Briefing:** dated world/business headlines, automatic topic
  filters, original publisher links and a short market-study routine.
- **Trade → News → Events:** the economic calendar, London-time timestamps and a
  related lesson for each release.
- **Trade → News → Perspectives:** dated central-bank speeches and authored policy
  commentary, explicitly separated from external analyst research. ING THINK
  is an external reading directory, not an integrated live analyst feed.
- **Trade → News → Understand:** evergreen explainers and concrete reading tasks
  for rates, inflation, jobs, growth, world events and execution risk.
- **Learn → Market:** existing forex lessons, recall questions, terminology and a
  sequential next task. Deep links open the selected lesson and this screen links
  back to the hub.
- **Trade → Inspect:** observations without a trade. Blank entries cannot be
  saved; query errors and partial lesson-copy failures are explicit.

## Sources and limitations

- [BBC Business RSS](https://feeds.bbci.co.uk/news/business/rss.xml) and
  [BBC World RSS](https://feeds.bbci.co.uk/news/world/rss.xml) supply attributed
  headlines. A keyword relevance filter excludes unrelated world stories, but it
  is not a market-impact model.
- [Federal Reserve policy releases](https://www.federalreserve.gov/feeds/press_monetary.xml),
  [Federal Reserve speeches](https://www.federalreserve.gov/feeds/speeches.xml)
  and [ECB Blog](https://www.ecb.europa.eu/rss/blog.html) supply official
  communications and policy perspectives.
- [ING THINK](https://think.ing.com/) is an external analyst-reading option.
  Named authors, assumptions, dates and possible commercial interests should be
  checked at the publisher.
- [Fair Economy's weekly JSON calendar](https://nfs.faireconomy.media/ff_calendar_thisweek.json)
  supplies scheduled events. Explicit feed offsets are converted to London time.
  Only high/medium-impact EUR, USD, GBP and JPY events are included. This is not a
  complete global or multiweek calendar, and important timings should be verified
  with the issuer.
- Evergreen reading links include [Bank of England monetary policy](https://www.bankofengland.co.uk/monetary-policy),
  [inflation basics](https://www.bankofengland.co.uk/knowledgebank/what-is-inflation),
  [Federal Reserve policy background](https://www.federalreserve.gov/monetarypolicy.htm)
  and [FCA leveraged-product guidance](https://www.fca.org.uk/firms/contract-for-differences).

Only titles, publication metadata and original links are displayed from feeds.
The app does not reproduce full articles or fabricate summaries, quotes, expert
consensus or explanations of a particular price move. Topic explanations are
explicitly labelled evergreen educational context.

Headlines are checked on demand with a five-minute server cache; calendar data
uses a thirty-minute cache. These in-memory caches may reset on worker restart.
Unavailable sources, missing dates and old items are handled explicitly; items
older than seven days are labelled. Publisher links remain available if a feed
fails.

## Persistence and database blocker

Reflections use the existing journal_entries table and include the original
article URL when a reading is selected. Inspection takeaways remain stored in
their inspection even when the separate lesson copy fails. The form closes with
a warning after that partial success so retrying it does not create a duplicate
inspection.

Learning progress requires learning_progress. Structured trades, trading plans,
backtests and inspections require the two pending migrations below. The connected
Supabase account does not expose the Lovable-managed project configured by this
repository; no migration has been applied through that unrelated account.

## Exact Lovable handoff

Paste the following into the existing Journey project in Lovable after the
GitHub changes have synced:

> Sync the latest main branch of Lynchy409/project-journey-seed. Inspect the actual
> Lovable Cloud database schema and migration history first. Apply these pending
> additive migrations in order:
>
> supabase/migrations/20261025120000_ffb6b571-da95-4055-9d83-0e30d118dcef.sql
>
> supabase/migrations/20261025170000_af34041d-4339-4417-8e64-3e6ac8e565ef.sql
>
> Preserve all existing data. Do not drop tables, rename columns or disable row
> level security. If part of a migration already exists, reconcile it with the
> current schema instead of rerunning conflicting statements or resetting the
> database. Confirm that trading_plans, backtests, learning_progress and
> market_inspections exist; that all structured trade columns including
> confirmation_tf exist; and that each new table has per-user RLS.
>
> Test as a signed-in user: save a learning status and reload it, save a trading
> plan, save a backtest, save a structured trade, and save an inspection whose
> takeaway also appears in trading Lessons. Check Trade → News and Learn → Market
> in the preview. Publish the updated app when those checks pass and report any
> remaining failure.

Do not assume that a merge executes a migration or publishes a Lovable build.
The above tests need to pass against the actual app before persistent saving is
considered verified.

## Verification performed

- TypeScript checking, changed-file ESLint and production build passed.
- `npm run test:market`: 17 tests passed against the real parsing and context
  functions. These cover safe URLs, XML/Atom, malformed/oversized feeds, duplicate
  and future dates, partial/all-source failures, topic relevance, curriculum links,
  calendar validation and explicit timezone handling.
- 45 local browser checks passed, including the four hub sections, direct lesson
  links, existing Trade tabs, main navigation, reflection saving, failed-save draft
  retention, inspection partial success, missing-progress warning/recovery and
  desktop/375px overflow checks.
- Browser authentication and database responses were intercepted in an isolated
  test context; they were not real-user database writes. External news and
  calendar requests were exercised against their live public endpoints.
- No production authentication bypass, mock data or fabricated news was added to
  application code. Production database persistence and per-user RLS remain
  unverified until the Lovable handoff is completed.
