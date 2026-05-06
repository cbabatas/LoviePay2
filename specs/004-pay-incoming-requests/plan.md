# Implementation Plan: Pay Incoming Payment Requests

**Branch**: `004-pay-incoming-requests` | **Date**: 2026-05-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-pay-incoming-requests/spec.md`

## Summary

Extend the existing incoming payment request experience so the demo user can pay pending incoming requests from the list or detail page. The feature adds an account-selection and confirmation flow, eligible source-account filtering by currency, simulated 2-3 second processing, duplicate-submission protection, a `paid` request status, balance deduction, one payment transaction per paid request, and balanced ledger entries. The UI remains responsive across desktop, tablet, and mobile; automated Playwright verification is desktop-only.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2022, Node.js runtime for lightweight API handlers  
**Primary Dependencies**: Vite, Supabase JavaScript client, Playwright for desktop end-to-end verification only  
**Storage**: Supabase Postgres `payment_requests` table extended to include `paid`; new payment-supporting tables or schema sections for demo source accounts, payment transactions, and ledger entries; existing mock data extended with account balances and account codes for local/demo fallback  
**Testing**: `npm run check`, `npm run test:api` (`node --test`) for API/helper validation, `npm run test:e2e:desktop` (Playwright) for desktop pay-flow coverage; tablet and mobile responsive behavior verified by manual viewport checks  
**Target Platform**: Modern browsers on desktop, tablet, and mobile  
**Project Type**: Frontend web application with lightweight backend payment request endpoints  
**Performance Goals**: Payment confirmation opens within 1 second for typical demo data; confirmed payment shows a visible processing state for 2-3 seconds; paid status is visible in incoming and outgoing views within 2 seconds after successful backend completion; account-selection changes render within 1 second  
**Constraints**: Responsive UI must work on desktop, tablet, and mobile; Playwright automation is desktop-only; only requests where `recipient_id` equals the current demo user are payable as incoming requests; only `pending` requests can be paid; expired, declined, paid, withdrawn, and any other non-pending status must not expose pay actions; eligible source accounts must be current-user accounts whose currency matches the request currency; no currency conversion or external payment/settlement integration; payment processing is simulated but balance, status, transaction, and ledger updates must be committed as one consistent outcome  
**Scale/Scope**: One independently deliverable payment feature in the existing Vite app, covering Pay actions in incoming list/detail, account eligibility and confirmation UI, server-side payment operation, request status propagation to outgoing views, account balance updates, payment transaction and ledger records, schema updates, focused API tests, desktop Playwright coverage, and manual responsive checks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality**: PASS. The feature extends the existing payment request modules (`api/payment-requests.js`, `api/payment-request-validation.js`, `src/payment-request.js`, `src/request-api.js`, `src/main.js`, `src/mock-data.js`, `src/styles.css`, `supabase/payment-requests.sql`) and keeps payment rules server-owned rather than introducing a separate service or new framework.
- **Testing**: PASS. API tests will cover incoming-only payment scoping, pending-only eligibility, currency-matched account filtering, single-account defaulting, multiple-account selection requirement, no-account and insufficient-balance blocking, duplicate/idempotent payment attempts, atomic failure behavior, transaction creation, balanced ledger entries, and paid-status propagation. Desktop Playwright will cover list/detail Pay entry points, confirmation, loading state, duplicate-click blocking, insufficient/no-account UI states, and post-payment status updates. Tablet and mobile responsive behavior will be verified manually because Playwright is constrained to desktop only.
- **UX Consistency**: PASS. The Pay flow reuses the existing Incoming tab list/detail patterns, confirmation treatment, loading/error/success states, status chips, amount formatting, and task-focused Payment Request copy. New account-selection controls follow existing form styling and remain responsive.
- **Performance**: PASS. Confirmation display, account-selection responsiveness, 2-3 second processing feedback, and post-payment status propagation budgets are explicit and tied to a small demo dataset plus one backend payment operation.
- **Simplicity**: PASS WITH JUSTIFICATION. Adding payment transactions and ledger entries is extra schema surface, but it is directly required by FR-017 through FR-023. The implementation remains in the existing handler and schema file instead of adding a new service layer.

## Project Structure

### Documentation (this feature)

```text
specs/004-pay-incoming-requests/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- backend-api.md
|   |-- supabase-schema.md
|   `-- ui-flow.md
`-- tasks.md          (created by /speckit-tasks, not by /speckit-plan)
```

### Source Code (repository root)

```text
index.html
api/
|-- payment-requests.js
|-- payment-request-validation.js
`-- supabase-client.js

src/
|-- main.js
|-- mock-data.js
|-- payment-request.js
|-- request-api.js
`-- styles.css

supabase/
`-- payment-requests.sql

tests/
|-- api/
|   `-- payment-requests.validation.test.js
`-- e2e/
    |-- create-payment-request.desktop.spec.js
    |-- outgoing-payment-requests.desktop.spec.js
    |-- incoming-payment-requests.desktop.spec.js
    `-- pay-incoming-payment-requests.desktop.spec.js
```

**Structure Decision**: Continue with the existing single Vite frontend plus lightweight Node API handlers. Extend `api/payment-requests.js` with a recipient-scoped pay operation that performs final status, currency, balance, transaction, and ledger validation before committing a payment outcome. Keep shared helper logic in `src/payment-request.js`, client calls in `src/request-api.js`, demo source-account and accounting seed data in `src/mock-data.js`, and responsive UI wiring in `src/main.js`/`src/styles.css`. Update `supabase/payment-requests.sql` with `paid` status support and payment accounting tables/indexes. Add focused desktop Playwright coverage in `tests/e2e/pay-incoming-payment-requests.desktop.spec.js` and extend API coverage in `tests/api/payment-requests.validation.test.js`.

## Phase 0: Research

Research completed in [research.md](./research.md). All technical context decisions are resolved with no remaining clarification markers.

## Phase 1: Design & Contracts

Design artifacts completed:

- [data-model.md](./data-model.md)
- [contracts/backend-api.md](./contracts/backend-api.md)
- [contracts/supabase-schema.md](./contracts/supabase-schema.md)
- [contracts/ui-flow.md](./contracts/ui-flow.md)
- [quickstart.md](./quickstart.md)

Agent context updated in [AGENTS.md](../../AGENTS.md) to reference this plan.

## Post-Design Constitution Check

- **Code Quality**: PASS. The data model and contracts keep the feature inside existing payment-request module boundaries and clearly document server ownership of state, balance, transaction, and ledger consistency.
- **Testing**: PASS. The quickstart maps `npm run check`, `npm run test:api`, and `npm run test:e2e:desktop` to the spec's acceptance scenarios, with manual responsive checks for tablet and mobile.
- **UX Consistency**: PASS. The UI contract defines Pay actions, account selection, confirmation, loading, success, blocked, and error states using the existing Incoming tab structure and product labels.
- **Performance**: PASS. The 2-3 second simulated processing state and the 1-2 second user-visible update budgets remain measurable in API and desktop UI verification.
- **Simplicity**: PASS WITH JUSTIFICATION. New transaction and ledger persistence is required for the accounting success criteria; keeping it in the existing API handler and schema file is the smallest design that satisfies those requirements.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| New payment transaction and ledger persistence | FR-017 through FR-023 require auditable transaction records and balanced ledger entries for every successful payment | Marking a request `paid` without accounting records would fail the accounting consistency requirements |
| Server-owned multi-record payment operation | FR-024 through FR-027 require idempotency and all-or-nothing updates across status, balance, transaction, and ledger records | Client-side sequencing cannot prevent duplicate deductions or partial updates after failures |
