# LoviePay

A lightweight peer‑to‑peer payment request built with Vite, vanilla JS, and Supabase. Users can create, send, view, decline, and pay payment requests.

## Live Demo

https://lovie-pay.vercel.app/log-in

The deployed app is fully testable without a local setup. Sign in as the demo user from the log‑in page and explore the Payment Request screen (Outgoing / Incoming tabs).

## Demo User 

1. 
email: ayla.demo@example.test
password: 1234

2. 
email: mika.korhonen@example.test
password: 1234

## Project Overview

LoviePay implements four feature slices, each scoped under [specs/](specs/) using Spec‑Kit:

1. [001-create-payment-request](specs/001-create-payment-request/) — Create a payment request to a friend.
2. [002-outgoing-payment-requests](specs/002-outgoing-payment-requests/) — Manage requests you sent (list, filter, detail, withdraw).
3. [003-incoming-payment-requests](specs/003-incoming-payment-requests/) — Manage requests sent to you (list, filter, detail, decline, 7‑day expiry).
4. [004-pay-incoming-requests](specs/004-pay-incoming-requests/) — Pay a pending incoming request, debiting the payer account and crediting the recipient via a four‑entry ledger.

Each spec folder contains the generated `spec.md`, `plan.md`, `research.md`, `data-model.md`, `quickstart.md`, `tasks.md`, and `contracts/`.

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (ES2022), [Vite](https://vitejs.dev/) 6
- **Backend**: Lightweight serverless handlers in [api/](api/) deployed on Vercel
- **Database**: [Supabase](https://supabase.com/) Postgres (schema in [supabase/payment-requests.sql](supabase/payment-requests.sql))
- **Testing**: `node --test` for API/validation tests, [Playwright](https://playwright.dev/) for desktop E2E
- **Hosting**: Vercel ([vercel.json](vercel.json))

### AI Tools Used

- [GitHub Spec‑Kit](https://github.com/github/spec-kit) for spec/plan/tasks generation (artifacts checked into `specs/`)
- [Claude Code](https://claude.com/claude-code) and [Codex] (https://openai.com/codex/) for implementation, refactoring, and review.

## Local Setup

### Prerequisites

- Node.js 20+ and npm
- A Supabase project with the schema from [supabase/payment-requests.sql](supabase/payment-requests.sql) applied

### Install

```bash
git clone https://github.com/cbabatas/LoviePay2.git
cd LoviePay2
npm install
```

### Configure environment

Copy `.env.example` to `.env` and fill in your Supabase values:

```bash
cp .env.example .env
```

```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sb_secret_your_service_role_key
```

The service role key is server‑only — never commit it or expose it to the browser.

### Apply database schema

Run the SQL in [supabase/payment-requests.sql](supabase/payment-requests.sql) against your Supabase project (re‑running is safe).

### Run the dev server

```bash
npm run dev
```

Open http://127.0.0.1:5173/ and navigate to `/log-in`.

## Running Tests

### Syntax check

```bash
npm run check
```

### API / unit tests (`node --test`)

```bash
npm run test:api
```

### E2E tests (Playwright, desktop)

```bash
npx playwright install        # first time only
npm run test:e2e:desktop
```

E2E specs live in [tests/e2e/](tests/e2e/) and cover the create, outgoing, incoming, and pay flows.

## Project Structure

```
api/                    # Serverless handlers (payment requests, customer accounts, supabase client)
src/                    # Frontend entry, screens, mock data, request API
supabase/               # SQL schema
specs/                  # Spec‑Kit artifacts per feature
tests/
├── api/                # node --test suites
└── e2e/                # Playwright desktop specs
playwright.config.js
vercel.json
vite.config.js
```

## Screen Recording

_(To be added by the author.)_
