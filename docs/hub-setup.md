# Teacher Hub Setup Guide

The Gyan Gullak Teacher Hub is designed for Windows laptops and works completely offline after the initial setup.

## Prerequisites for Dev

- Node.js v20+ and `pnpm`
- Rust (rustup) and C++ Build Tools (for Windows: Visual Studio Build Tools with "Desktop development with C++")
- Webview2 runtime (included in modern Windows 10/11)

## Initial Setup (Online)

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```
2. Start the Hub application in development mode:
   ```bash
   pnpm --filter @chalk/hub tauri dev
   ```
3. The first time the app launches, you will see the **Teacher Setup Wizard**.
4. Enter your Supabase Email and Password. 
   *(Note: You must have an internet connection for this step so the hub can authenticate and download your school's private keys and public keys into the OS secure credential store).*
5. Upon successful login, the application will pull your school's data, store the keys, and redirect you to the Roster view.

## Daily Operation (Offline)

Once the setup wizard is complete, the application operates offline.
- **Roster Management**: You can import students via CSV without an internet connection.
- **Print ID Cards**: You can view and print QR Code ID Cards directly from the Hub. The PDF rendering relies on standard HTML/CSS and is handled by the Chromium embedded WebView2 engine (no external PDF services are used, ensuring fonts like Noto Sans Devanagari render perfectly offline).

## CSV Import Format

For bulk roster import, the CSV file must contain the following headers:
`first_name, class_name, roll_number`

Example:
```csv
first_name, class_name, roll_number
Rahul, 8A, 101
Priya, 8A, 102
```

Rows missing required fields or containing duplicate roll numbers will be flagged in the UI for correction.

## Production Build

To build an installer for deployment on a clean machine:
```bash
pnpm --filter @chalk/hub tauri build
```
The MSI/NSIS installer will be located in `apps/hub/src-tauri/target/release/bundle/`. 
Deploy this installer to the teacher's laptop.
