# Gyan Gullak

**Offline-first learning and rewards platform for rural government schools.**

## The Ecosystem

1. **The App: Gyan Gullak**
   A digital savings account for education. 100% offline-first. Students use the app at home to learn and earn.

2. **The Currency: Coins (G-Coins)**
   A simple, universally understood gaming currency. Earned by completing homework at home or donating old textbooks. Spent on physical rewards.

3. **The Quizzes: Daily Bounties**
   High-stakes gamified homework taken on the mobile app. To prevent cheating offline, every completed bounty is cryptographically hashed locally before syncing to the cloud.

4. **The Offline Vault: Godaam**
   The heavy storage warehouse for premium content. Uses "Opportunistic Caching" to silently download lectures when a strong connection is detected, ensuring zero-buffer offline viewing later.

5. **The Physical Barter Store: Loot Bazaar**
   The ultimate school hangout and marketplace at the teacher's physical desk. Students redeem their earned Coins for real-world geometry boxes, sports gear, or stationary using their physical QR ID card (no phone needed).

6. **The Parent Update: e-Report**
   Clean, automated, and professional. Tracks micro-tags from Daily Bounties and auto-generates a weekly WhatsApp report for parents, highlighting where the student is excelling or struggling.

7. **The Teacher Hub**
   The offline command center (built on Tauri and SQLite). Handles Loot Bazaar transactions, syncs offline Bounties to the cloud at the end of the day, and triggers e-Reports.

## Setup Steps

1. Install Node.js (v20+) and pnpm (v9+).
2. Clone the repository: `git clone https://github.com/akshayvarma121/gyangullak_lms`
3. Run `pnpm install` in the root directory.
4. Run `pnpm check` to verify the setup (runs typecheck, lint, test, format, and check:names).
5. Copy `.env.example` to `.env` and configure as needed.
