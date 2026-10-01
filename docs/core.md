# Core Package

The `@chalk/core` package is the pure, fully tested heart of the system. It contains zero IO and zero UI dependencies.

## Modules

### Crypto

- `canonicalize(obj: unknown): string`: Deterministic JSON serialization with stable key sorting and no whitespace. Used for hashing and signing.
- `ed25519.ts`: Wrappers around `@noble/ed25519` for generating keys, signing, and verifying signatures.
- `qr.ts`: Utilities for encoding and decoding the `QRTokenPayload` (school_id, student_id, issued_at) into a Base64URL string signed with the school's private key. Also contains a short, human-readable link code generator using a custom unambiguous alphabet.

### Events

- `schema.ts`: Defines Zod schemas for `LedgerEvent` and all supported payloads (`device.claim`, `quiz.attempt`, `gullak.credit`, `gullak.redeem`, `gullak.reverse`).
- `chain.ts`: Utilities for hashing events and verifying a device's hash chain (`prev_hash` checking and signature verification).

### Scoring

- `scoreAttempt`: Pure function to evaluate a quiz attempt and calculate points earned, utilizing injected configuration (`pass_mark_percent`, `base_points`, `reattempt_points`).

### Sync

- `machine.ts`: A pure state machine handling the event sync process (idle, syncing, backoff, offline, error). It supports batching, exponential backoff with jitter (via injected RNG), partial rejection handling, and duplicate delivery logic.
- `store.ts`: The `LedgerStore` interface for decoupling the state machine from actual database or file system implementations, along with an `InMemoryLedgerStore` used primarily for testing.

## Event Format

```json
{
  "id": "uuid",
  "student_id": "uuid",
  "device_id": "uuid",
  "seq": 0,
  "prev_hash": "string | null",
  "kind": "quiz.attempt",
  "payload": {
    "quiz_id": "uuid",
    "answers": {
      "q1": "A"
    }
  },
  "client_ts": "2024-01-01T00:00:00Z",
  "content_version": "v1.0.0",
  "signature": "hex-string"
}
```
