# Journey fitness update

## Release state

This is an implementation branch, not a production release. The published Lovable app is unchanged until the branch is merged and the database migration is applied in its actual Lovable Cloud project. No production database changes were made during development.

## Implemented scope

- **Train navigation:** Today, Sessions, Library, Plans and Progress, preserving the existing app shell and other app areas.
- **Daily tasks:** recurring strength, cardio and recovery slots; choose saved work or manual logging; move, swap, skip, restore and one-off rest-day overrides. Removing a rest override does not silently restore explicitly skipped activities.
- **Strength and holds:** previous performed-session weight and reps for every set; reps, load, continuous seconds, distance, rest, side, effort and notes. External, bodyweight, added and assisted loads stay distinct.
- **Cardio:** manual distance and duration with miles/km/metres and pace; per-set intervals and open-ended activity kinds. Comparable run records require matching distance, type and variation.
- **Repeatable formats:** starter Cindy, circuits, bag drills and core; custom templates, editable versions, scaling, duplication, archive/restore and saving an actual session as a template. Planned values are not silently recorded as actual results.
- **Movement library:** core, neck, wrist/hand/grip, balance, agility, handstand/HSPU and recovery entries; search, favourites, try-later, custom movements and source-linked practice.
- **Plans:** editable strength and skill frameworks with criteria and explicitly confirmed milestones. No inferred mastery or automatically prescribed loading programme.
- **Shared goals:** the same goals in Train and Plan; manual goals across all pillars, plus fitness best performance, calendar totals, session consistency and plan milestones. A best continuous hold does not add separate attempts.
- **Recovery and foundations:** existing routine builder/player retained; routine completion opens actual session logging; before/after/standalone recovery links; existing weight/water/steps/energy plus optional sleep, food and recovery notes.
- **One activity record:** an atomic save creates workout/set records and completes its linked task. Linked goals derive from those records. Timed routines and fitness little wins also link through this save, and confirmed deletion reopens the task and removes corresponding routine/win logs.

GPS recording is explicitly deferred to the public-launch phase, as agreed. Existing user routines and historical logs are preserved; revised seed guidance does not rewrite stored user content.

## Guidance quality and limits

The library is a logging/discovery tool, not an AI coach or an independently validated optimal programme. References are labelled as specific technique, broader related guidance or editable user-defined material. Starter roadmaps require the user's own criteria and appropriate instruction; source availability is not evidence of individual suitability.

Representative references include [ACSM resistance-training guidance](https://acsm.org/resistance-training-guidelines-update-2026/), [ACE abdominal exercise library](https://www.acefitness.org/resources/everyone/exercise-library/body-part/abs/), [AAOS spine conditioning](https://www.orthoinfo.org/recovery/spine-conditioning-program/), [NHS neck exercises and advice](https://www.cuh.nhs.uk/patient-information/neck-exercises-and-advice/), [NHS neck strength and stability exercises](https://plr.cht.nhs.uk/download/1077/Neck%20Strength%20and%20stability%20Exercises%20A4), [CrossFit Cindy](https://www.crossfit.com/benchmark/cindy), [GMB handstand](https://gmb.io/handstand/) and [GMB handstand push-up progression](https://gmb.io/handstand-push-up/). The app retains direct URLs beside the relevant content and does not claim coach review or universal optimality.

## Verification performed

- TypeScript compilation and production build passed.
- Fitness pure-function tests cover dates/DST/leap months, units, previous sets, continuous versus total goals, load/side/rep filters, consistency counts, comparable records, legacy JSON and invalid sessions.
- An isolated PostgreSQL-compatible PGlite test applies the migration twice, checks additive compatibility, retry-safe atomic saves, invalid-input rollback, moves/swaps, routine/win log links, deletion cleanup and two-user row-level-security behavior. This is not verification of the live Lovable database.
- Existing market regression tests passed.
- Browser testing used intercepted Supabase responses in an isolated authenticated fixture. No authentication bypass or test data is included in the shipped app.
- Browser checks exercised logging, all previous bench sets, task completion, shared goals, Cindy/template versioning, a skill plan and milestone, movement sources, timer results, scheduling/rest overrides, cancellation/deletion, body check-ins and failed-save retry.
- Today, Plan, Trade, Train, Learn, Inner, Profile, Journal and Review rendered without new page errors in that fixture. Desktop and mobile checks found no horizontal page overflow.

Not yet verified: production saves/re-fetches, actual production RLS, real-account media uploads, external authentication redirects in the private preview, or any real GPS tracking.

## Lovable release steps

After approval to merge this fitness branch:

1. Inspect the current schema and migration history in the actual Lovable-managed database. Confirm existing workout, set, goal and check-in data before applying SQL.
2. Apply `supabase/migrations/20261025200000_fitness_workspace.sql`. It adds JSON columns, four fitness tables, per-user policies and transactional save/move/delete functions; it does not drop or rename existing fields.
3. Regenerate the base Supabase types from that project and confirm the additive contract in `src/lib/fitness-types.ts` still matches.
4. In the Lovable preview, save and re-fetch a strength session, cardio session, hold, recovery routine, fitness little win, template, plan and body check-in.
5. Confirm a matching task completes once and the same linked goal updates in both Train and Plan. Delete a disposable test session with confirmation and check its task reopens.
6. Verify two separate test users cannot read or attach each other's workouts, tasks, templates, plans or preferences.
7. Check sign-in, Today/Plan, the trading hub and learning routes, then publish only when those live checks pass.

The connected Supabase account available during development did not expose this app's Lovable-managed database. An unrelated inactive project was not changed.

## Lovable handoff prompt

> Use the fitness implementation on the approved merged branch. Read `docs/fitness-release.md` and inspect the current database schema and migration history first. Apply only the pending additive `20261025200000_fitness_workspace.sql` migration to this app's actual Lovable Cloud database. Preserve existing data and policies. Regenerate Supabase types, run the build and both fitness/market tests, then verify real save/re-fetch, task/goal linkage and two-user RLS in preview. Report any failure explicitly and do not claim production verification from the isolated development fixture. Do not publish until the live checks pass.
