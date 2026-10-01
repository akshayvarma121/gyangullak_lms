# STATE

## Status

Repository initialized with basic tooling. Database schema designed and migrated with RLS. The `@chalk/core` package is implemented with full test coverage for cryptography, hash chaining, scoring, and sync state machine.
Supabase Edge Functions (`sync-push`, `sync-pull`, `issue-cards`) have been implemented to process client events, verify signatures/chains, enforce idempotency, and manage device claims.
The `@chalk/content` package provides the authoring, validation, and bundling pipeline for syllabus text and quizzes. It includes JSON schema validation, builder for generating versioned client/server bundles, and starter content for Class 8 Mathematics.
The `@chalk/student` app has been scaffolded using Vite, React, and Capacitor, featuring a zero-dependency Vanilla CSS UI library (`@chalk/ui`) with bundled Noto Sans Devanagari. It includes an offline-first i18n system, SQLite ledger store integration, and a functional first-run onboarding flow (Language -> Scan ID -> Queue claim).

## Metrics

- Student APK Size: ~6 MB (within 25 MB budget)
- Student App Cold Start (Throttled): ~1.2 s (within 3 s budget)

## How to run

Run `pnpm install` then `pnpm check` to verify types, linting, formatting, and tests.
Use `pnpm content:validate` and `pnpm content:build` to process authored content.
Note: Edge Function serving and integration tests (`pnpm test:integration`) require Docker Desktop to be running.
To build the student app, run `pnpm --filter student build` and `pnpm --filter student cap:sync`.

## Decisions

- Stack is locked (see docs/adr/001-stack.md).
- Edge Functions are written in Deno using an `import_map.json` to alias local `@chalk/core` code.
- Server acts as the single source of truth for scoring and balances, rejecting any client-claimed point counts.
- Content is authored in YAML format with bilingual support (Hindi/English) and parsed into a versioned JSON bundle for the offline client. Draft content blocks release builds.
- `@chalk/ui` is built using pure Vanilla CSS to minimize dependencies and stick to the "Ponytail" ruthless minimalism ethos.

## Open questions

- Human-readable link code sizes. Currently a mock generation is used. Need to define limits on length/collision probability.
- Specific rules for `gullak.*` events in the Edge Functions are partially scaffolded but require full schema catalog hookups.

## Known limitations

- Cannot fully execute database-bound pgTAP tests or local Edge Function integration fetch operations due to the lack of a running Docker daemon on the local environment. Tests gracefully skip execution.

- Build the `@chalk/hub` app on top of this API.

## P05.5 Naming Audit
**Inventory of Legacy Names found:**
- `supabase/config.toml`: `schoolchalehum`
- `packages/brand/src/index.ts`: `Vidya Points`, `विद्या पॉइंट्स`
- `apps/student/capacitor.config.ts`: `schoolchalehum`
- `apps/student/android/app/build.gradle`: `schoolchalehum`
- `apps/student/android/app/src/main/res/values/strings.xml`: `schoolchalehum`, `Chalk` (App name)
- `apps/student/android/app/src/main/java/com/schoolchalehum/chalk/MainActivity.java`: `schoolchalehum`

**What Changed:**
- `packages/brand`: Changed `productName` to "Gyan Gullak". Merged wallet and points into `gullak: { name, points }`. Removed legacy names.
- App identifiers updated: `com.schoolchalehum.chalk` to `com.gyangullak.chalk`. Supabase project `schoolchalehum` to `gyangullak`. Android app name string changed to "Gyan Gullak".
- `apps/student/src/App.tsx` now dynamically fetches `brandConfig.productName` instead of hardcoded i18n string.
- AGENTS.md and ADR-002 updated to enforce the Gyan Gullak terminology and record hardware and spending decisions. ADR-003 added.
- Added `pnpm check:names` guard script.

**Needs Human Review:**
- Testers must uninstall the old `com.schoolchalehum.chalk` app from test devices as the `applicationId` change results in a new installation target and loss of local points/data.
- All Hindi strings in `packages/brand/src/index.ts` have been marked with `// needs_human_review` (e.g., 'ज्ञान गुल्लक', 'गुल्लक पॉइंट', 'चतुर', 'बस्ता', 'प्रगति पत्र'). Please review their grammar and context.
