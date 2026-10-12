# Northstar Finance — Frontend (Phase 2)

A React/TypeScript frontend prototype for the Finance SaaS product. The visual direction follows the provided Figma Make design: restrained blue accents, a light workspace, compact financial navigation, readable tables, and practical accounting workflows.

> **Phase boundary:** this package is the UI and local-interaction phase only. It does not make live requests to the Finance SaaS backend. Authentication, email verification, MFA, OCR extraction, email delivery, document upload/storage and exports that need server-side generation are simulated or presented as UI previews. Do not use this demo with real financial data.

## Stack

- React 19 + TypeScript + Vite
- Tailwind CSS 4 (available for styling) and a reusable, Radix-backed UI component layer inspired by shadcn/ui patterns
- React Router
- TanStack Query (provider configured for Phase 3)
- Axios (a centralized API client skeleton is included; currently not wired to pages)
- React Hook Form + Zod (authentication forms use schema validation)
- TanStack Table
- Apache ECharts via `echarts-for-react`
- Decimal.js for demo calculations involving money
- Lucide React icons

## Start locally

Requirements: Node.js 20.19+ or 22.12+ recommended, and npm.

```bash
npm install
cp .env.example .env
npm run dev
```

On Windows PowerShell:

```powershell
npm install
Copy-Item .env.example .env
npm run dev
```

Vite prints the local development URL after startup.

## Quality checks

```bash
npm run typecheck
npm run build
npm run preview
```

`npm run build` runs TypeScript checking before the Vite production build. Dependencies are intentionally not bundled in this ZIP; run `npm install` on a machine with npm registry access first.

## Demo behavior

- Default route opens the sample dashboard.
- Use the profile menu to switch between Owner, Admin and Employee role previews.
- Sign out to reach the authentication screens.
- Transactions, invoice/bill payments, account balances, recurring executions, documents, inventory adjustments, notifications, team actions, settings, currency rates and plan changes use local demo state.
- Demo data persists in `localStorage` under `northstar-finance-demo-data-v1`. To reset it, clear that key in browser storage and reload. Role/session preview values are stored separately.
- File upload accepts PDF, JPEG, PNG and WebP up to 15 MB in the UI, but file bytes are not uploaded to Cloudinary in this phase.
- “Process OCR” generates clearly identified simulated extraction content; it does not call PaddleOCR.
- Download/print and email controls are previews unless they use browser print or client-side CSV export. No email is sent.

## Feature map

- `src/features/auth`: login/register/verification/password reset/MFA demo states
- `src/features/dashboard`: finance overview and charting
- `src/features/transactions`: income, expense, transfer, transaction detail and void flow
- `src/features/accounts`: account list, create/edit, detail and activity
- `src/features/categories`: income/expense categories
- `src/features/parties`: customers, vendors, details and ledgers
- `src/features/invoices`: invoice builder, lifecycle, payments, reversal, email/PDF preview
- `src/features/bills`: bill builder, lifecycle, payments, reversal, email/PDF preview
- `src/features/ledger`: customer/vendor ledger views and period balances
- `src/features/recurring`: rules, execution and schedule state
- `src/features/documents`: local upload metadata, OCR mock, classification, review and conversion
- `src/features/reports`: reports and date filtering/export UI
- `src/features/insights`: deterministic finance insights (not a chatbot)
- `src/features/inventory`: item management and stock adjustments
- `src/features/notifications`: notifications and individual read state
- `src/features/team`: team/user role management preview
- `src/features/audit`: audit activity table and filters
- `src/features/subscription`: plan/limit management preview
- `src/features/settings`: business settings, currency rates/converter and security/MFA UI

## Structure

```text
src/
  app routes in App.tsx
  components/      reusable layout and UI primitives
  context/         local demo state and business-flow simulation
  data/            realistic sample records
  features/        feature-oriented screens
  lib/             utilities and API client foundation
  types/           shared TypeScript contracts
  styles.css       design tokens, responsive layout and components
```

## Phase 3 integration notes

The backend remains the source of truth for financial totals, balances, permissions and lifecycle transitions. Before wiring APIs:

1. Confirm the deployed backend URL and cookie/CORS configuration.
2. Connect the Axios client in `src/lib/api/client.ts`.
3. Implement access-token memory management and single-flight refresh handling using the backend's existing HttpOnly refresh cookie. Do not put refresh tokens in JavaScript storage.
4. Replace each feature's local-context operations with TanStack Query mutations and API queries, module by module.
5. Keep response shapes aligned with the actual backend; do not invent new endpoint paths or response keys.
6. Test tenant isolation and every financial effect using Postman and end-to-end tests.

## Security note

This is a local UI prototype. Role-based visibility is for UX and demo purposes only; it is not authorization. The backend must enforce permissions and tenant isolation. Do not commit `.env` files or real credentials.
