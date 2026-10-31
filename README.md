# Munshee — Finance SaaS Frontend

Munshee is the React/TypeScript client for the Finance SaaS backend. The backend is the source of truth for authentication, tenant-scoped records, balances, financial lifecycle transitions, reports, document processing, and AI responses. This frontend no longer uses seeded/localStorage business records.

## Stack

- React 19, TypeScript, Vite
- React Router, TanStack Query provider
- Axios API client with HttpOnly-cookie refresh flow and access-token memory handling
- React Hook Form, Zod, Tailwind CSS 4
- ECharts, Decimal.js, Lucide React

## Configure

Copy `.env.example` to `.env` and set the API base URL. Do not put backend secrets in frontend environment variables.

```env
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_APP_NAME=Munshee
```

For production, set `VITE_API_BASE_URL` to the deployed backend URL, for example `https://api.example.com/api/v1`. The backend `CLIENT_URL` must exactly match the deployed frontend origin and the API must allow credentialed CORS requests. HTTPS is required for production cookies.

## Run

```bash
npm ci
npm run dev
```

Quality checks:

```bash
npm run typecheck
npm run build
npm run preview
```

## API-connected modules

- Authentication: registration, login, logout, email verification/resend, password reset, token refresh.
- Dashboard data, accounts, categories, transactions, voiding, customers/vendors, invoices, bills, payments and reversals.
- Customer/vendor ledger data, recurring transaction rules, document upload to signed Cloudinary upload, OCR/AI extraction, review and conversion.
- Reports and server-generated insights, inventory/stock adjustments, notifications, team management, audit logs, subscriptions, currency rates/conversion, and Munshee AI Assistant.
- Invoice/bill PDF download and backend email actions.

## Important integration notes

- Access tokens stay in memory. Refresh tokens remain in the backend's HttpOnly cookie; the frontend never reads them.
- Financial data is fetched from `/api/v1` endpoints and writes are sent to backend services. The UI must not be used as an authorization boundary; the backend enforces tenant scope and roles.
- The backend currently supports inventory creation and stock adjustment, not general item editing. The backend's subscription module updates plan metadata but does not charge payments.
- Email sending depends on valid production SMTP configuration. Document uploads require valid Cloudinary credentials and OCR/AI require the corresponding backend services and Groq configuration.
- Currency conversion uses configured rates only; it does not fetch market prices.
- Do not commit `.env` or credentials.

## Deployment checklist

1. Configure `VITE_API_BASE_URL` to the deployed backend `/api/v1` URL.
2. Configure backend `CLIENT_URL` to the frontend origin.
3. Ensure backend CORS allows credentials and the production frontend uses HTTPS.
4. Keep the frontend and backend on the same site (for example `app.example.com` and `api.example.com`) because the backend refresh cookie uses `SameSite=Strict`. Separate hosting domains such as `*.netlify.app` and `*.onrender.com` can prevent the browser from sending that cookie.
5. Verify MongoDB, SMTP, Cloudinary, OCR service and Groq environment configuration on the backend.
6. Test register/login, verification, password reset, account/category creation, transaction posting/voiding, invoice/bill payments and reversals, document upload/process/convert, exports and email delivery against the production-like environment.

Some flows depend on external production services and could not be live-tested in this sandbox.
