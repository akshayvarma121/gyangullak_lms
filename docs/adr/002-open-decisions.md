# 002 - Open Decisions

- Status: pending
- Date: 2026-09-30

## Context and Problem Statement

Several key architectural and product decisions need to be finalized before building the respective modules.

## D-01: Naming (Decided)
- Status: decided
- Decision: The product name is Gyan Gullak. Gullak is the point system and wallet. 

## D-02: Offline Spending (Decided)
- Status: decided
- Decision: Students cannot spend unsynced points. They can reserve an item and complete it at the hub later.

## D-03: Hardware Roles (Decided)
- Status: decided
- Decision: Laptop runs the hub, tablet runs the student app.

## D-04: UI Framework/Component Library

- Options: TailwindCSS, Material UI, Chakra UI.
- Recommendation: TailwindCSS to keep bundle size minimal.

## D-05: Hub Auth Mechanism

- Options: Offline PIN, Password, JWT stored locally.
- Recommendation: Offline PIN synchronized from the server for teacher convenience.

## D-06: Content Distribution Mechanism

- Options: Bundled in APK with Over-The-Air (OTA) updates, only Bundled in APK.
- Recommendation: Bundled in APK with OTA updates to allow syllabus corrections without app store review.
