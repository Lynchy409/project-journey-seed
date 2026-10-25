# Journey fitness verification

Checked 25 October 2026, after fitness PR #3 was merged. The merged baseline is commit `a36d2e6`; the follow-up correction is on `fix/fitness-session-goal-filters`.

## Result

The code builds and the tested development flows work, but this is not full live-release sign-off. The published app requires sign-in, and the available Supabase connection does not have permission to inspect this app's Lovable-managed database. No production records were created, deleted or changed during these checks.

## Defect found and corrected

Completed-session goals filtered by an exercise ignored its selected load type and side. Minimum-rep qualification was also not applied when counting sessions for an exercise-load goal.

A new regression test first failed with five qualifying sessions instead of one. The fix now requires one set to satisfy the exercise, load type, side and applicable minimum-rep filters together, while still counting each qualifying session only once. Matching different filters on different sets does not qualify.

This correction is in a separate review branch; it has not been merged or published.

## Checks passed after the correction

- **TypeScript:** no compilation errors.
- **Production build:** successful.
- **Fitness calculations:** 18 tests passed.
- **Database integration:** the isolated PostgreSQL-compatible migration/RLS test passed, covering additive application, retry safety, rollback, task moves/swaps, routine/win logging, confirmed deletion and two-user isolation.
- **Trading regressions:** all 17 tests passed.
- **Changed helper lint:** no errors.
- **Previous session:** all three previous bench sets displayed with weight and reps.
- **Session goal in browser:** a qualifying left-side bench session increased the goal to 1/10; a right-side session left it at 1/10.
- **Cross-section consistency:** Plan showed the same 1/10 goal as Train.
- **Deletion:** deleting the qualifying disposable session returned the goal to 0/10 and reopened its strength task.
- **Browser errors:** none recorded during that flow; no horizontal page overflow at desktop width.

Browser interaction used the compiled production build with isolated intercepted Supabase responses and disposable test data. Those browser checks do not demonstrate persistence in the real database. The SQL test executes the actual migration in a separate database environment, not against Lovable Cloud.

## Live checks still blocked

- Whether `20261025200000_fitness_workspace.sql` is installed in the actual app database.
- Real-account save/re-fetch for sessions, tasks, templates, plans, goals, check-ins and media.
- Actual deployed row-level-security policies across two real test users.
- Whether Lovable's preview has synced the merged code, and whether any later publication includes it.

The [published Journey app](https://project-journey-seed.lovable.app) reached its sign-in screen. The Supabase connector listed an unrelated inactive project; its schema request for this app's configured project was permission-denied. No other project was modified and no sign-in was attempted.

## Next release step

Merge the approved goal-filter correction, then use Lovable to inspect the current migration history and apply only the pending additive fitness migration. Run real save/re-fetch and isolation checks in its preview before publishing. The complete migration handoff is in `docs/fitness-release.md`.
