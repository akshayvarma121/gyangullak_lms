# Gyan Gullak Threat Model

This document outlines the security stance of Gyan Gullak (classes 6-10 offline learning & rewards). The system is designed to operate primarily offline in rural Indian schools. We favor resilience and data integrity over perfect prevention, relying heavily on cryptographic signatures and central verification.

## 1. Cheating Student (Local DB edits, Event replays, Forged points)
- **Prevented:** Students cannot forge points on the central ledger. The server (Edge Function) recalculates points based on the actual quiz answers (Invariant 2). Replayed events are dropped due to idempotent UUIDs and strict hash-chain sequencing. Direct local DB tampering invalidates the hash chain unless re-signed, which requires the device private key.
- **Detected:** Broken hash chains and invalid signatures are flagged and dropped by `sync-push`.
- **Residual Risk:** A highly technical student with root access could extract the device private key and script valid-looking quiz attempts. We accept this because they are still limited by the `app_config` daily point caps and must supply correct answers to earn points.

## 2. Stolen or Photographed QR Card
- **Prevented:** The QR card contains no PII (only an opaque UUID and a cryptographic signature). It cannot be used to scrape names or phone numbers.
- **Detected:** The teacher scanning the card will see a mismatch between the student standing in front of them and the name displayed on the Hub. 
- **Mitigation Implemented:** Teachers can revoke a student's card in the Hub, which rotates the `card_issued_after` timestamp on the server and generates a new token. Old tokens are rejected.
- **Residual Risk:** A thief can spend points at the Hub if the teacher carelessly scans without verifying the student's face. 

## 3. Rooted Phone
- **Prevented:** Rooting the phone cannot compromise the central ledger.
- **Detected:** We do not employ heavy DRM or root detection (SafetyNet/Play Integrity) as it breaks compatibility with many cheap or older borrowed Android devices.
- **Residual Risk:** A rooted device allows extraction of the device key or the unencrypted local SQLite database.

## 4. Clock Tampering
- **Prevented:** A student setting their phone clock back to retry daily caps or forward to bypass cooldowns is mitigated by the server's sanity checks.
- **Detected:** The `sync-push` endpoint checks the `client_ts` of incoming events against the `server_ts`. Events too far in the past (> 30 days) or future (> 1 hour) are permanently rejected.
- **Residual Risk:** Small timezone drifts or clock skews within the 1-hour window are accepted.

## 5. Malicious or Careless Teacher
- **Prevented:** Teachers cannot modify the core `points_ledger` directly without creating a traceable, signed `gullak.credit` or `gullak.redeem` event.
- **Detected:** Every manual points intervention is signed by the Teacher Hub's device key, creating an immutable audit trail. Abnormal behaviors (e.g., granting massive amounts of points) are flagged in the `audit_log`.
- **Residual Risk:** A teacher could show favoritism and manually grant maximum points to a single student. 

## 6. Lost Hub Laptop
- **Prevented:** The Hub's offline session doesn't expose the Supabase `SERVICE_ROLE` key; it only holds a limited JWT and a device key.
- **Detected:** None automatically.
- **Mitigation Implemented:** A Hub device can be revoked via the web portal or another authenticated Hub. Once marked `revoked` in the `devices` table, the server permanently rejects all future syncs from that laptop.
- **Residual Risk:** An attacker with the laptop can see the local SQLite cache (roster, points history) until the session expires or the device is wiped.

## 7. Replayed Batches (Network Glitches or Intentional)
- **Prevented:** Replaying a network payload of events does not yield double points. The server tracks every `event_id` and rejects duplicates (Invariant 3).
- **Detected:** The server responds with `accepted` and a `idempotent` reason for already-seen events, allowing the client to safely clear its queue.
- **Residual Risk:** None. This is fully mitigated.

## 8. Leaked Parent Phone Numbers
- **Prevented:** Guardians' phone numbers are isolated by strict Row-Level Security (RLS) on the `guardians` table, accessible only to authenticated teachers. They are never synced to the student APK.
- **Detected:** Supabase access logs.
- **Residual Risk:** A teacher exporting the roster to a CSV and losing the file on a public computer.

## 9. Content Answers Bundled in the APK
**Honest Note:** Because the student app must work entirely offline from the first launch, the quiz answers are bundled inside the APK. A determined student can reverse-engineer the APK, read the JSON content bundle, and extract the answer key. 
**What this means for the product:** The server protects the points ledger, not the answer key. We accept this because our primary goal is learning. If a student is motivated enough to decompile the app and extract the answers, they are engaging deeply with the material (or learning to hack, which is a valuable meta-skill). The economy remains protected by strict daily point caps.
