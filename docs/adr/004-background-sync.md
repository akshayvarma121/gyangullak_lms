# 004 - Background Sync Mechanism

## Context

Chalk (Gyan Gullak) requires events to be synced to the server whenever the device gets connectivity, as offline is the normal state. We need to decide how to trigger syncs. Options include foreground-only triggers (app open, resume, connectivity change) versus true background periodic jobs (e.g., Android WorkManager).

## Options

1. **Foreground-Only Sync Engine:** Hook into Capacitor's App lifecycle (`appStateChange`) and Network plugin (`networkStatusChange`).
2. **Capacitor Background Task Plugin:** `@capacitor-community/background-task` allows extending the foreground execution time briefly when the app is backgrounded, but it does not wake the app up periodically.
3. **True Background Periodic Sync (WorkManager):** Requires a native Android plugin (like `@capacitor/background-runner` which has specific architectural requirements and edge cases, or writing custom Java/Kotlin code).

## Decision

We will implement **Option 1: Foreground-Only Sync Engine**. We will NOT implement a WorkManager-based periodic job at this time. 

## Consequences

- **Reliability:** By relying on standard foreground lifecycles (app open, resume, and connectivity restored while the app is active), we avoid the well-documented unreliability of background execution across different Android OEMs (e.g., MIUI, ColorOS aggressively killing background jobs).
- **Honesty in UI:** We will not make false promises to the user that the app will sync silently while fully closed. If the user wants their points confirmed, they must open the app when they have internet.
- **Implementation:** The sync engine will listen to `Network.addListener('networkStatusChange')` and `App.addListener('appStateChange')`, and we will provide a manual "Sync Now" button.
