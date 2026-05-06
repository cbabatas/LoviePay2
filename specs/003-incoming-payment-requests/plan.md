# Implementation Plan: Manage Incoming Payment Requests

**Branch**: `003-incoming-payment-requests` | **Date**: 2026-05-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/003-incoming-payment-requests/spec.md`

## Summary

Add an Incoming Requests tab to the existing Payment Request screen so the demo user can view, filter, search, open detail, and decline payment requests where they are the recipient. The UI is responsive across desktop, tablet, and mobile, while automated end-to-end coverage uses Playwright on desktop only. The backend extends the existing `payment_requests` Supabase table and `api/payment-requests.js` handler with recipient-scoped list/detail/decline operations and applies a 7-day expiry rule at query/display time. Expired requests are read-only; only pending requests can be declined and only after explicit confirmation.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2022, Node.js runtime for lightweight API handlers
**Primary Dependencies**: Vite, Supabase JavaScript client, Playwright for desktop end-to-end verification only
**Storage**: Supabase Postgres `payment_requests` table extended to allow `declined` status and recipient-scoped read/update queries; mock data continues to provide demo recipient/sender display details and incoming seed rows
**Testing**: `npm run check`, `npm run test:api` (`node --test`) for API and helper validation, `npm run test:e2e:desktop` (Playwright) for desktop incoming flow coverage; tablet and mobile responsive behavior verified by manual viewport checks
**Target Platform**: Modern browsers on desktop, tablet, and mobile
**Project Type**: Frontend web application with lightweight backend payment request endpoints
**Performance Goals**: Incoming list visible within 2 seconds of opening the tab under normal conditions (SC-001); status filter and sender search update the displayed list within 1 second for typical demo data; confirmed decline updates visible status within 1 second after backend success
**Constraints**: Responsive UI must work on desktop, tablet, and mobile; Playwright automation is desktop-only; only requests where `recipient_id` equals the current demo user are incoming; outgoing requests must not appear in incoming list, filters, or incoming detail flow; expiry is 7 days after `created_at` and is enforced at read time without a background job — the server promotes a stored-`pending` row to `status = 'expired'` and updates `updated_at` whenever a read observes the boundary; expired and declined requests are read-only; only `pending` requests can be declined and only after explicit confirmation
**Scale/Scope**: One independently deliverable management feature within the existing Vite app, covering the Incoming Requests tab, list with sender/amount/status/date/days-remaining display, status + sender search filters, dedicated detail view with back navigation, decline-with-confirmation from list and detail, server-side recipient scoping, expiry derivation, focused API tests, and desktop Playwright coverage

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality**: PASS. The feature extends the existing payment request modules (`api/payment-requests.js`, `src/payment-request.js`, `src/request-api.js`, `src/main.js`, `src/mock-data.js`, `supabase/payment-requests.sql`) and reuses existing helpers, tab pattern, and UI states rather than introducing new abstractions or navigation systems.
- **Testing**: PASS. `node --test` will cover recipient scoping, status/search filtering, expiry derivation at the boundary day, decline confirmation requirement, decline status guard against non-pending requests, and not-found behavior for outgoing or unknown ids. Desktop Playwright will cover Incoming tab navigation, list rendering, filter+search, detail open/back, decline-from-list and decline-from-detail with confirmation, and read-only treatment of expired/declined rows. Manual viewport checks document tablet and mobile responsive behavior because Playwright is desktop-only.
- **UX Consistency**: PASS. The Incoming tab mirrors the existing Outgoing tab structure, uses the same status/filter/search/detail patterns and labels, and defines loading, empty, no-results, error, success, confirmation, and ineligible-action states reusing existing copy and components.
- **Performance**: PASS. List visibility, filter response, and post-decline UI update budgets are explicit (SC-001 plus 1-second filter/update budgets) and scoped to demo data plus a single Supabase round trip per operation.
- **Simplicity**: PASS. The smallest viable design is to add `declined` and `expired` to the existing status enum and add three recipient-scoped operations to the existing handler, with read-time expiry promotion (no background job).

## Project Structure

### Documentation (this feature)

```text
specs/003-incoming-payment-requests/
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
    `-- incoming-payment-requests.desktop.spec.js
```

**Structure Decision**: Continue with the existing single Vite frontend plus lightweight Node API handlers. Extend `api/payment-requests.js` with `listIncomingPaymentRequests`, `getIncomingPaymentRequest`, and `declineIncomingPaymentRequest`, all scoped server-side to `recipient_id = current user`, plus a shared read-time expiry promotion step that updates stored-`pending` rows past their 7-day boundary to `status = 'expired'` with a new `updated_at`. Add expiry derivation and decline eligibility helpers to `src/payment-request.js`, add client wrappers to `src/request-api.js`, extend `src/mock-data.js` with additional incoming seed rows covering pending/declined/expired states and a request that sits exactly on the 7-day boundary, and wire the Incoming tab UI states into `src/main.js` and `src/styles.css`. Update `supabase/payment-requests.sql` to add `declined` and `expired` to the allowed status set and add a `(recipient_id, status, created_at desc)` index. Add desktop Playwright coverage in `tests/e2e/incoming-payment-requests.desktop.spec.js` and extend API tests in `tests/api/payment-requests.validation.test.js`.

## Phase 0: Research

Research completed in [research.md](./research.md). All technical context decisions are resolved with no remaining clarification markers.

## Phase 1: Design & Contracts

Design artifacts completed:

- [data-model.md](./data-model.md)
- [contracts/backend-api.md](./contracts/backend-api.md)
- [contracts/supabase-schema.md](./contracts/supabase-schema.md)
- [contracts/ui-flow.md](./contracts/ui-flow.md)
- [quickstart.md](./quickstart.md)

Agent context updated in [CLAUDE.md](../../CLAUDE.md) to reference this plan.

## Post-Design Constitution Check

- **Code Quality**: PASS. Data model, API contract, schema delta, and UI flow all extend existing modules; no new framework or shared abstraction is introduced.
- **Testing**: PASS. The quickstart enumerates `npm run check`, `npm run test:api`, and `npm run test:e2e:desktop` flows mapped to spec acceptance scenarios, plus manual responsive viewport checks for tablet and mobile.
- **UX Consistency**: PASS. The UI contract reuses the existing tab/list/detail/confirmation patterns and defines all required states (loading, empty, no-results, error, success, confirmation, ineligible) with consistent labels.
- **Performance**: PASS. SC-001 (2-second list visibility) plus the 1-second filter and post-decline update budgets remain measurable and tied to a small demo dataset and single Supabase round trips.
- **Simplicity**: PASS WITH JUSTIFICATION. Server-side recipient scoping plus a `declined` status addition are required to enforce FR-001, FR-005, FR-009, and FR-010 reliably; client-only filtering or status updates cannot prevent invalid actions or ensure read-only treatment of expired and declined records.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Additional backend recipient-scoped read/update operations | Required to scope incoming requests to the current recipient and enforce decline-only-when-pending before status changes | Client-only filtering/updating cannot enforce FR-001, FR-005, FR-009, FR-010, or FR-012 |
| `declined` and `expired` statuses added to schema enum | `declined` persists the recipient-initiated terminal state; `expired` is required because the stored `status` and `updated_at` MUST change when a request crosses the 7-day boundary | Reusing `withdrawn` conflates sender and recipient/system terminations; keeping `expired` derived-only conflicts with the requirement that the stored status and `updated_at` reflect expiry |
| Read-time expiry promotion in the API handler | Persists the `expired` state at the moment the boundary is crossed without requiring a scheduled job | A background job adds operational complexity not justified by the demo scope; presentation-only expiry would not update the stored status or `updated_at` |
