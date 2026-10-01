# ADR-003: Brand Name Standardization and Application Identifiers

## Context
The project previously contained several legacy names, including "Gyan Seth", "School Chale Hum", "Vidya Points", "Pathshala", and "Gurukul". 
As part of the final branding process, it is required that the product name is standardized to "Gyan Gullak" (ज्ञान गुल्लक) and the wallet/point system to "Gullak" (गुल्लक), with points referred to as "Gullak Points" (गुल्लक पॉइंट).
These names must be driven purely from the `packages/brand` configuration to prevent hardcoded instances and simplify i18n.
Additionally, because the legacy name "schoolchalehum" was embedded deeply within the application identifier (`com.schoolchalehum.chalk`) and Supabase project ID, it must be removed.

## Decision
1. **Brand tokens as source of truth:** All user-facing product, wallet, and feature names will be sourced only from `packages/brand`. Hardcoding product names in UI components or i18n resource files is prohibited.
2. **Standardization:**
   - Product: "Gyan Gullak"
   - Points System / Wallet: "Gullak"
   - Currency: "Gullak Points"
3. **Application ID Change:** Because `com.schoolchalehum.chalk` contains a legacy name, we will change it to `com.gyangullak.chalk` across Capacitor and Android manifests. 

## Consequences
- The new Android Application ID (`com.gyangullak.chalk`) will cause the app to install as a completely separate application on devices.
- **Action Required by User:** Testers must uninstall the old app version from their test devices manually. Old local data (such as points and cached offline content) will not carry over to the new installation.
- Developers must rely entirely on `brandConfig` and never hardcode product terminology in HTML/JSX/JSON translation files.
