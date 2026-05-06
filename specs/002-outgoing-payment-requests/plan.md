# Implementation Plan: Manage Outgoing Payment Requests

**Branch**: `002-outgoing-payment-requests` | **Date**: 2026-05-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-outgoing-payment-requests/spec.md`

## Summary

Build `LP-001` outgoing payment request management into the existing browser demo. The feature adds a Payment Request section with an outgoing tab, a responsive outgoing request list, filters scoped to requests where the current demo user is the sender, a separate outgoing request detail view, pending-only withdrawal with confirmation from both list and detail surfaces, and a screen-level Create Request entry point that opens the existing create request flow. The backend will expose list/detail/withdraw operations over the existing Supabase `payment_requests` table while preserving the current create-request behavior.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2022, Node.js runtime for lightweight API handlers  
**Primary Dependencies**: Vite, Supabase JavaScript client, Playwright for desktop end-to-end verification only  
**Storage**: Supabase Postgres `payment_requests` table, extended to allow `withdrawn` status and outgoing read/update queries; static mock data for current demo user and recipient display details  
**Testing**: `npm run check`, focused API validation tests with `node --test`, desktop-only Playwright tests through `npm run test:e2e:desktop`; tablet and mobile responsive behavior verified by manual viewport checks only  
**Target Platform**: Modern browsers on desktop, tablet, and mobile  
**Project Type**: Frontend web application with lightweight backend payment request endpoints  
**Performance Goals**: Outgoing filters over a typical demo request list update within 1 second; list/detail navigation reflects the selected request within 1 second after data is available; confirmed withdrawal updates visible status within 1 second after backend success  
**Constraints**: Responsive UI must work on desktop, tablet, and mobile; Playwright automation is desktop-only; only requests where `sender_id` equals the current demo user are outgoing; incoming requests must not appear in outgoing list, filters, or outgoing detail flow; only `pending` requests can be withdrawn; withdrawal requires confirmation; no payment processing, payment completion, or recipient-side actions  
**Scale/Scope**: One independently deliverable management feature inside the existing small Vite app, covering outgoing list, filters, detail route/view, withdrawal confirmation/update, Create Request navigation, API contracts, Supabase schema adjustment, and focused desktop verification

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality**: PASS. The feature extends the existing payment request modules, endpoint boundary, mock data, and Supabase table instead of introducing a new framework or broad navigation system.
- **Testing**: PASS. API tests will cover sender scoping, filter behavior, detail access control, pending-only withdrawal, cancellation preservation at UI level, and ineligible status blocking. Desktop Playwright will cover list/filter/detail/withdraw/Create Request flows. Manual viewport checks document responsive tablet/mobile behavior because Playwright is constrained to desktop only.
- **UX Consistency**: PASS. The plan uses existing product labels and states from the create request flow, adding loading, empty, no-results, error, success, confirmation, and ineligible-action states for outgoing management.
- **Performance**: PASS. The list filtering and user-visible update budgets are measurable and intentionally scoped to the small demo data set plus Supabase round trips.
- **Simplicity**: PASS. The smallest viable design is to add outgoing read/update operations to the current lightweight backend and render list/detail states in the existing app shell.

## Project Structure

### Documentation (this feature)

```text
specs/002-outgoing-payment-requests/
|-- plan.md
|-- research.md
|-- data-model.md
|-- quickstart.md
|-- contracts/
|   |-- backend-api.md
|   |-- supabase-schema.md
|   `-- ui-flow.md
|-- checklists/
|   `-- requirements.md
`-- tasks.md
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
    `-- outgoing-payment-requests.desktop.spec.js
```

**Structure Decision**: Continue with the existing single Vite frontend plus lightweight Node API handlers. `api/payment-requests.js` should support create, outgoing list/detail, and withdraw operations with shared validation in `api/payment-request-validation.js`. `src/request-api.js` should own client calls, `src/payment-request.js` should own formatting/filter/eligibility helpers, `src/mock-data.js` should provide recipient display data and demo outgoing/incoming seed data for UI fallback or tests, and `src/main.js` should wire responsive UI states.

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

- **Code Quality**: PASS. The data model and contracts keep outgoing management local to existing payment request boundaries and document backend ownership of sender scoping and status transitions.
- **Testing**: PASS. The quickstart defines syntax checks, API tests, and desktop-only Playwright flows, with manual responsive checks for tablet/mobile.
- **UX Consistency**: PASS. The UI contract defines list, detail, empty, no-results, error, success, confirmation, and ineligible states using existing Payment Request language.
- **Performance**: PASS. Filter and update response budgets remain measurable and are included in verification notes.
- **Simplicity**: PASS WITH JUSTIFICATION. Extending the existing API handler is required to enforce outgoing-only access and withdrawal eligibility server-side; a client-only implementation would not satisfy the access and status-update requirements.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Additional backend read/update operations | Required to scope outgoing requests to the current sender and enforce pending-only withdrawal before status changes | Client-only filtering/updating cannot enforce FR-003, FR-012, FR-016, FR-018, or FR-019 |
