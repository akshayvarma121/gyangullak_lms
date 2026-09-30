# 002 - Open Decisions

- Status: pending
- Date: 2026-09-30

## Context and Problem Statement

Several key architectural and product decisions need to be finalized before building the respective modules.

## D-01: Offline Sync Strategy

- Options: CRDTs, Event Sourcing with timestamp resolution, Simple Last-Write-Wins.
- Recommendation: Event Sourcing since every event is an idempotent ledger entry that the server validates and recomputes.

## D-02: QR Code Data Format

- Options: Plain JSON, Base64 Encoded JSON, Custom Binary Format.
- Recommendation: Base64 Encoded JSON to balance debugging ease with spatial constraints.

## D-03: Database Schema for Points Ledger

- Options: Single append-only ledger table, snapshot tables, or both.
- Recommendation: Single append-only ledger table to maintain I1 invariant strictly.

## D-04: UI Framework/Component Library

- Options: TailwindCSS, Material UI, Chakra UI.
- Recommendation: TailwindCSS to keep bundle size minimal.

## D-05: Hub Auth Mechanism

- Options: Offline PIN, Password, JWT stored locally.
- Recommendation: Offline PIN synchronized from the server for teacher convenience.

## D-06: Content Distribution Mechanism

- Options: Bundled in APK with Over-The-Air (OTA) updates, only Bundled in APK.
- Recommendation: Bundled in APK with OTA updates to allow syllabus corrections without app store review.
