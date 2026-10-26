# Spanish completion checklist

Spanish is not release-complete. This checklist preserves the agreed scope, separates local evidence from live evidence, and prevents a passing fixture from being described as a finished product.

## Agreed features

| Requirement | Implementation and local evidence | Required live sign-off |
| --- | --- | --- |
| Learn subsection, beyond-beginner starting point | Implemented; profile and reload checked with an authenticated fixture. | Save and reload the real user's selected starting point. |
| Specific daily minimum, around 25 minutes | Implemented activity-based plan, not timer-only completion. | Complete the actual daily plan; verify Today and Learn agree after reload. |
| Automatic daily tasks with move, swap and skip | Implemented and fixture-tested. | Check real persistence and the following day's plan without a backlog. |
| In-app Language Transfer | Official SoundCloud player; actual playback, timing, checkpoint and teardown tested locally. | Confirm audibility, consent, resume and persistence on the user's device and deployed origin. |
| Personal listening library and progress | Saved resources, notes, transcript excerpt and difficulty feedback implemented. | Save/reload real content and timestamps; check external provider links. |
| Quality-filtered resource suggestions | Source-labelled curated starting points and feedback-based guidance implemented. | Check actual usefulness and provider access. Do not claim a live discovery engine. |
| Typed conversation with feedback after each reply | Authenticated two-pass provider integration implemented. | Actual provider availability, accurate Spanish feedback, valid alternatives and save/reload. |
| Rule-based automatic Mistake Fixer | Canonical rules, typo/style exclusion, repeat scheduling and dismiss/restore implemented. | Real errors must generate the right reusable rule, not false corrections or spelling drills. |
| Cycling mistakes and meaningful fresh challenges | Implemented; due sorting, review stages, idempotency and uncertain-grade safeguards tested. | Verify fresh challenge quality, acceptable alternative answers and spaced recurrence. |
| Speaking/response-building and transcript-grounded practice | Typed formats implemented with semantic criteria. | Verify real generated content and transcript grounding; no invented audio claims. |
| Personal road to fluency | Can-do targets, evidence, history, missions and useful phrases implemented. | Check saved evidence and sensible progression. No unsupported level certification, fluency percentage or date. |
| Voice conversation | Not implemented or verified. Existing UI explicitly leaves it unavailable. | Choose an available supported provider, implement recording/transcription and spoken replies, test permission denial, clear stop controls, transcript review, valid alternatives, interruption/cleanup, privacy disclosure, device audibility and real linguistic quality. No fake microphone or pronunciation score. |
| Existing app functionality | Market and fitness tests pass; all main routes were previously fixture-tested. | Confirm existing trading, fitness, goals and Today still work against the actual backend. |

## Connection checks added in the correction branch

- An expandable panel is available before the Spanish database provider, so a missing table does not hide the diagnostics.
- Setup checks read the two Spanish tables and authenticate with the server, without a paid model request. Read access is not evidence of write access, owner isolation or a complete schema.
- The explicitly labelled AI test sends only a generic question. It uses runtime AI credits if available, makes the draft and review requests, and writes no lesson, mistake or completion.
- Expected failures cross the server boundary as safe structured results. They distinguish missing/rejected keys, unavailable runtime credits, denied access, rejected models/requests, rate limits, upstream failure, incomplete output and timeouts. Raw provider responses and secrets are not returned.
- A failed review never releases the draft as checked feedback. A failed call does not award progress or record an unchecked mistake.

The gateway adapter is documented by [TanStack's Lovable guide](https://tanstack.com/ai/latest/docs/adapters/lovable.md). Provider HTTP test doubles verify protocol and failure handling, not actual provider availability or Spanish accuracy.

## Access and release gates

The live Journey site redirects this worker to sign-in. The connected Supabase account exposes a different project from the repository's `rbisyspakvesohfcvrxl`; no changes were made to that other database. The user reported existing function rows after running the installation script, but the complete live schema, policies and owner isolation have not been independently verified.

Do not buy credits, switch AI providers, expose a private API key, bypass sign-in, create an unrelated backend, or treat a second model pass as independent expert verification. If no runtime provider is available, that is a real completion blocker, not a reason to silently substitute hard-coded conversations.

Before final sign-off: verify actual schema/migration history, save/reload across all features, validate two-user owner isolation using authorized test accounts, run the real Spanish semantic-quality matrix, implement and verify voice, retest every main app flow, merge only with authorization, and leave publishing to the user unless separately requested.
