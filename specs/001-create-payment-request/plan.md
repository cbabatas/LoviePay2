# Implementation Plan: Create Payment Request

**Branch**: `001-create-payment-request` | **Date**: 2026-05-06 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-create-payment-request/spec.md`

## Summary

Build `LP-001.1 Create Payment Request` as a minimal browser-based demo flow backed by a small create-request backend endpoint. The feature provides mock email/password sign-in, a simple left sidebar with demo user details, searchable demo friend recipients, receiver account selection with derived currency, amount validation for values greater than zero and less than 1,000,000, optional notes, Supabase-backed pending request storage, and unique public shareable link generation. The implementation intentionally excludes real authentication, registration, permissions, profile management, full navigation, payment processing, and request fulfillment.

## Technical Context

**Language/Version**: HTML5, CSS3, JavaScript ES2022, Node.js runtime for the create-request backend endpoint  
**Primary Dependencies**: Supabase client for backend persistence; Playwright may be introduced only for desktop end-to-end verification  
**Storage**: Supabase Postgres for system-generated payment request records; static mock data for demo user, receiver accounts, and friend list  
**Testing**: JavaScript syntax checks plus backend validation tests and desktop Playwright flow tests; tablet and mobile responsive behavior verified by manual viewport checks only  
**Target Platform**: Modern browsers on desktop, tablet, and mobile  
**Project Type**: Frontend web application with one lightweight backend create endpoint  
**Performance Goals**: Recipient search over demo data responds within 1 second; primary create-request flow completes in under 2 minutes during acceptance testing  
**Constraints**: Responsive UI must work on desktop, tablet, and mobile; Playwright automation is desktop-only; amount must be greater than zero and less than 1,000,000; current demo user must not appear in friend data or recipient search; backend must re-validate all request creation rules before Supabase insert; no payment processing or real identity system  
**Scale/Scope**: One independently deliverable demo feature with one mock sign-in screen, one create-request workspace, demo data, Supabase payment request persistence, one backend create endpoint, and focused validation states

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Code Quality**: PASS. The approach introduces a small app structure with a single backend create endpoint and keeps behavior local to the create request feature. No shared abstraction or framework is added without a current requirement.
- **Testing**: PASS. Backend validation tests cover server-side rejection and successful Supabase insert behavior. Desktop Playwright covers the primary user path and important invalid cases. JavaScript syntax checks cover parse regressions. Mobile and tablet are explicitly manual responsive checks because the user constrained Playwright to desktop only.
- **UX Consistency**: PASS. The flow includes requested sidebar user information and required loading, empty, validation error, creation error, and success states. Labels use canonical terms from the spec: demo user, friend, receiver account, payment request, pending, shareable link.
- **Performance**: PASS. The plan carries measurable budgets from the spec: search response within 1 second and valid request completion under 2 minutes.
- **Simplicity**: PASS. A static browser app with mock data plus one backend persistence endpoint is the smallest design that satisfies the Supabase storage and backend validation requirements.

## Project Structure

### Documentation (this feature)

```text
specs/001-create-payment-request/
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
`-- payment-requests.js

src/
|-- main.js
|-- mock-data.js
|-- payment-request.js
|-- request-api.js
`-- styles.css

tests/
|-- api/
|   `-- payment-requests.validation.test.js
`-- e2e/
    `-- create-payment-request.desktop.spec.js
```

**Structure Decision**: Use a small frontend app plus a single backend endpoint. `index.html` hosts the mock sign-in and create request flow, `src/mock-data.js` owns demo user/friend/account data, `src/payment-request.js` owns client-side validation helpers, `src/request-api.js` calls the backend create endpoint, and `src/main.js` wires UI interactions. `api/payment-requests.js` re-validates request creation rules, generates the unique hash/shareable link, and inserts valid payment requests into Supabase. Desktop-only Playwright tests live under `tests/e2e/`; backend validation tests live under `tests/api/`.

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

- **Code Quality**: PASS. Data and behavior boundaries are documented before implementation; Supabase persistence is limited to system-generated payment request records.
- **Testing**: PASS. Contract and quickstart define syntax checks, backend validation coverage, desktop Playwright coverage, and manual tablet/mobile responsive verification.
- **UX Consistency**: PASS. UI states and responsive behavior are documented in the UI contract.
- **Performance**: PASS. Search and task-completion budgets remain measurable and are included in quickstart verification.
- **Simplicity**: PASS WITH JUSTIFICATION. The backend endpoint is the only added complexity and is required for Supabase persistence plus backend validation.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| Backend endpoint for a demo feature | Required to store payment request records in Supabase and enforce backend validation before storage | Browser-only local storage cannot satisfy Supabase persistence or backend validation |
