# 005 - Hub Offline Session Validity

- Status: decided
- Date: 2026-10-02

## Context and Problem Statement

The teacher hub is used in schools with intermittent internet. Teachers sign in once when they have internet, but the application needs to remain usable for daily operations (scanning cards, printing IDs, viewing rosters) when offline. We need to decide how long this offline session remains valid before requiring a network re-authentication.

## Decision Drivers

1. **Security:** The hub contains PII (student names, roster data) and cryptographic material (school's private key for signing ID cards).
2. **Convenience:** Teachers may go weeks without internet, bringing their laptop to a cyber cafe occasionally. Forcing a login every 24 hours makes the product useless.
3. **Revocation:** If a laptop is lost, the server can revoke access, but the laptop won't know until it reconnects.

## Considered Options

1. **Infinite offline session (No expiry):** The simplest approach. Relies on OS-level login for security.
2. **Fixed Time Limit (e.g., 7 days or 30 days):** Enforces a check-in to ensure the device hasn't been compromised or the teacher hasn't left the school.
3. **Infinite with local PIN / Password:** The JWT is stored indefinitely, but accessing the app requires a local PIN.

## Decision

We will use **Option 3 (Infinite with local PIN / Password)**. 

The initial Supabase authentication fetches the user session and the school's private key. These secrets are stored in the OS Credential Store (via `keyring` in Tauri). The hub application itself will be protected by an offline PIN (or password, relying on the OS's credential store for encryption/decryption access). 

As long as the teacher knows the OS password/PIN or the app's local PIN, they can unlock the local SQLite database and credential store indefinitely without internet. However, if they connect to the internet, the app will attempt a session refresh. If the session has been revoked on the server, the local session and database will be wiped/locked.

## Consequences

- **Good:** Teachers are never locked out just because the internet has been down for a month.
- **Bad:** A stolen unlocked laptop has indefinite access to that school's offline data until it connects to the internet. (Acceptable risk given rural conditions and that the data is limited to one school's roster).
