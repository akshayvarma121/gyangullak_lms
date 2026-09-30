# STATE

## Status

Repository initialized with empty packages and basic tooling. Database schema designed and migrated with RLS. Seed data and pgTAP tests written.

## How to run

Run `pnpm install` then `pnpm check` to verify types, linting, formatting, and tests.
Note: To run database tests, you must have Docker Desktop running and execute `pnpm supabase start` followed by `pnpm supabase test db`.

## Decisions

- Stack is locked (see docs/adr/001-stack.md).
- Monorepo tooling set up with pnpm workspaces and vitest.
- Supabase schema implements invariants I3 (ledger_events UUID constraint) and I4 (points_ledger partial unique index). RLS implemented on all tables.

## Open questions

- Pending decisions in docs/adr/002-open-decisions.md.

## Next task

- Set up core domain models or functions in `packages/core`.
