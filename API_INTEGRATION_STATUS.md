# Munshee frontend API integration status

## Connected workflows

- Auth: register, login, logout, refresh, email verification, resend verification, password reset, MFA setup/enable/disable.
- Business profile and settings.
- Accounts, categories, parties, transactions, transaction voiding.
- Invoices and bills, payment history, payment create/reverse, status changes, PDF downloads and backend email actions.
- Recurring transaction creation, status changes and manual execution.
- Document upload initialization, signed Cloudinary upload, upload completion, OCR, backend classification, AI extraction, review, secure content download, conversion and delete.
- Customer/vendor ledger endpoint, financial report endpoints, tax summary, backend insights.
- Inventory creation/stock adjustments, notifications/read status, team users, audit logs, subscription metadata, currency rates/conversion.
- Groq AI assistant, natural-language transaction draft, anomaly review and inventory advice.

## Intentionally not presented as supported

- Frontend role-switch preview and demo reset.
- General inventory item editing/deletion: the current backend only exposes inventory create and stock-adjustment actions.
- Editing an existing recurring rule: the current backend supports create, pause/resume and execution, not general rule updates.
- Autonomous posting from an AI-generated draft: the assistant returns a suggestion; the user must create the record through the normal transaction form.

## Verification performed in this build environment

- TypeScript/TSX syntax transpilation: passed for all source files.
- Local/alias import path scan: passed.
- ZIP/package JSON integrity: verified before delivery.
- Full `tsc --noEmit` / Vite production build: not completed because `npm ci` timed out while fetching/installing dependencies in this environment.
- Live backend, MongoDB, SMTP, Cloudinary, OCR and Groq integration: not run; these require the deployed API and valid external service configuration.
