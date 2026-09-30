# 001 - Locked Technology Stack

- Status: accepted
- Date: 2026-09-30

## Context and Problem Statement

We need a robust, offline-first technology stack for "chalk" that supports both low-end Android devices for students and a robust offline-capable hub for teachers, while ensuring strict typing and validation.

## Decision Drivers

- Target devices are low-end Android (2-3GB RAM) and offline-first laptops.
- Network is rare and expensive, calling for an architecture where everything is verifiable locally.
- Zero IT staff means errors must be recoverable and obvious.

## Decision Outcome

Chosen option: The stack described in AGENTS.md.

- Language: TypeScript (strict).
- Monorepo: pnpm workspaces.
- Student app: React + Vite + Capacitor (Android) + SQLite (@capacitor-community/sqlite).
- Teacher hub: Tauri v2 + React + Vite + SQLite (Tauri SQL plugin).
- Backend: Supabase (Postgres, RLS, Deno Edge Functions).
- Validation: Zod.
- Crypto: @noble/ed25519 and @noble/hashes.
- Tests: vitest, fast-check, Testing Library.

Because this stack provides boring, proven tech that addresses the constraints of our offline-first deployment context.
