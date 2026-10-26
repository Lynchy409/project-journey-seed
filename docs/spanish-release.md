# Spanish workspace release

The original Learn → Spanish workspace was merged into main in PR #5. Connection/error-handling corrections are being tested separately. Spanish is not release-complete: real-service verification and voice remain open. Existing Market, games, study tools, trading and fitness data are preserved. See `docs/spanish-completion-checklist.md` for all remaining gates.

## Implemented scope

- **Personal starting point:** skill-specific self-selected next challenges, interests, variety, practical goal and the next Language Transfer lesson. No beginner placement, invented CEFR score or fluency deadline.
- **Daily minimum:** three concrete activities with a roughly 25-minute total estimate, generated when Today/Spanish is opened. Listening, conversation and fresh practice/rule review rotate with the date, interests, selected skill challenges and due rules. Move, swap, skip and restore are available. Moved tasks stay moved; missed days do not become an automatic backlog.
- **Today integration:** Spanish activity cards appear in Today; legacy Spanish template slots open the same workspace and use its completion state. Spanish little-win launchers also open the workspace rather than create an unrelated timer completion. The old unlogged Spanish daily-driver quick-tick is retired, following the existing fitness behaviour, so there is not another text-only completion path. Existing historical logs are not deleted. This change does not redesign the app's separate XP system or promise new Spanish XP awards.
- **Conversations:** authenticated typed Spanish conversation, feedback after each reply, persistent daily history and automatically grouped rule mistakes. A draft and a separate reviewing model pass must both return valid structured output; failed review is not silently skipped.
- **Mistake fixer:** confident underlying grammar/usage/meaning rules only; source sentence, correction and explanation retained; questionable corrections dismissible/restorable. Fresh semantic challenges, valid-alternative instructions, weaker-first due queue and spaced successful reviews. Uncertain grading does not lower progress. Viewing the sample makes practice supported and prevents an independent-success award.
- **Language Transfer:** the official SoundCloud course iframe, opt-in third-party loading, per-track position and actual played-time accounting, distinct audio coverage excluding seeks/repeated loops, serialized checkpoint saves and next-track resume. Initial prior lessons are self-reported, not synced from LT's app.
- **Listening library:** saved HTTPS podcast/video/series/film links, statuses, manual external episode/timestamp resume, transcript excerpts, notes and challenge ratings. External-service playback is not automatically monitored or falsely embedded.
- **Discovery:** official publisher starting points with attribution, access caveats and difficulty guidance adjusted by saved ratings. This is a small curated discovery set, not a live web recommendation engine; unknown variety, difficulty or subtitle availability is not invented.
- **Practice:** meaningful response-building, situations, transcript-grounded comprehension questions, existing game links, planned/completed real-life missions and a separate useful-phrase bank. Real-life evidence is explicitly self-reported.
- **Roadmap:** independent can-do skills and saved evidence, with source links and recent practice history. Self-report/game activity is not represented as independent certification. The user chooses progression after fresh checks; no artificial percentage advances automatically.

## Quality boundary and unfinished release gates

Voice recording/transcription/natural audio conversation is deliberately unavailable until an actual provider path is implemented and quality-verified. There is no pretend microphone integration, unreliable pronunciation score or untested “natural voice” promise.

The reviewing AI pass is a second model check, not an independent language expert or multi-source fact check. It does not make generated language infallible. The real provider/model availability, semantic behaviour and live authenticated persistence still require verification in the actual Lovable environment. Fixture UI tests cannot establish these.

Listening comprehension practice is grounded in a user-saved transcript excerpt; it does not independently establish that audio was heard or understood. Non-LT content opens its provider, with manual progress. Offline/background playback is not promised.

AI calls use the app's existing server-side Lovable gateway integration and authenticated server-function middleware. `LOVABLE_API_KEY` stays server-only. Optional server variables `SPANISH_AI_MODEL` and `SPANISH_AI_REVIEW_MODEL` select provider-supported models; defaults follow the repository's existing model setting. Confirm that setting against the actual deployed provider before release. Two model calls per action may have cost/latency implications. Distributed user quotas and human-reviewed content coverage are further public-launch work.

## Database and deployment

Read the actual schema and migration history before applying `supabase/migrations/20261025220000_spanish_workspace.sql`. This branch does not apply it remotely. It adds `spanish_items`, `spanish_activities`, owner RLS, a reference-owner trigger and two authenticated invoker RPCs:

- **put_spanish_item:** optimistic revision checks and exact retry handling.
- **record_spanish_activity:** idempotent evidence write and matching planned-task completion in one transaction; foreign-user/date/kind references fail.

The SQL migration does not delete, rename or rewrite existing app rows. Regenerate Supabase types after applying it; `spanish-types.ts` extends current generated/fitness types until then. Preserve the type import in `client.ts`.

Merge and publishing require separate user approval. Do not publish merely because a migration succeeds. Run the live checks in `docs/spanish-verification.md` first.

## Basis for the roadmap and official audio

The skill-specific roadmap is informed by the [Council of Europe CEFR self-assessment grid](https://www.coe.int/en/web/common-european-framework-reference-languages/table-2-cefr-3.3-common-reference-levels-self-assessment-grid), but Journey's simplified can-do wording is not a certified CEFR assessment. The balance of input, output, language-focused practice and familiar-language fluency practice is informed by [Paul Nation's Four Strands paper](https://www.wgtn.ac.nz/lals/resources/paul-nations-resources/paul-nations-publications/publications/documents/2007-Four-strands.pdf), not claimed as a uniquely optimal protocol.

The official [Language Transfer Complete Spanish page](https://www.languagetransfer.org/complete-spanish) embeds the [Complete Spanish SoundCloud playlist](https://soundcloud.com/languagetransfer/sets/complete-spanish). Playback integration uses documented events and methods from the [SoundCloud Widget API](https://developers.soundcloud.com/docs/api/html5-widget); audio is not rehosted.

The curated listening set links to [Hoy Hablamos](https://www.hoyhablamos.com/) and [Dreaming Spanish](https://www.dreamingspanish.com/). Their access, transcript and level details must be checked on the publisher's current pages; the app does not promise all content is free.
