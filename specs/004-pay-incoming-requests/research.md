# Research: Pay Incoming Payment Requests

All Technical Context items are resolved. No clarification placeholders remain.

## Decision: Reuse the existing Vite + lightweight Node handler architecture

- **Decision**: Implement Pay actions inside the existing Incoming Requests tab and extend `api/payment-requests.js` with a recipient-scoped payment operation.
- **Rationale**: The create, outgoing, and incoming-management features already use this pattern. Paying an incoming request is a sibling operation that benefits from the same current-user resolution, request shaping, error handling, and UI modules.
- **Alternatives considered**: A new payment service or route namespace was rejected as unnecessary for the demo scope and would add coordination overhead without improving correctness.

## Decision: Server-side payment validation is mandatory

- **Decision**: The backend must re-read the request and selected account at confirmation time and validate recipient scoping, `pending` status, matching currency, account ownership, sufficient balance, and duplicate-payment state before any mutation.
- **Rationale**: The UI can become stale while the user is choosing an account or while simulated processing is visible. Server-side checks are required for FR-003 through FR-011 and the stale-status edge cases.
- **Alternatives considered**: Client-only eligibility checks were rejected because they cannot prevent direct API calls, stale-row payment, double submits, or balance races.

## Decision: Add `paid` as a stored request status

- **Decision**: Extend the `payment_requests` status constraint and client status helpers to include `paid`.
- **Rationale**: The existing lifecycle already stores terminal statuses such as `withdrawn`, `declined`, and `expired`. A successful payment is a terminal state that must be visible in both incoming and outgoing views.
- **Alternatives considered**: Deriving paid state only from transaction existence was rejected because the list/detail views already rely on stored request status and the spec explicitly requires the request to be marked `paid`.

## Decision: Model source accounts with balance and account code

- **Decision**: Extend demo account data and the persistence contract so current-user accounts include `id`, `displayName`/`label`, `owner_id`, `currency`, `balance`, and `account_code`.
- **Rationale**: Existing `receiverAccounts` provide ids, labels, and currencies but not the fields required to select a funding account, validate balance, deduct funds, or create ledger entries.
- **Alternatives considered**: Keeping balances only in component state was rejected because FR-014, FR-026, and duplicate-payment prevention require server-owned balance updates.

## Decision: Payment completion writes one transaction and balanced ledger entries

- **Decision**: A successful payment creates exactly one `payment_transactions` row with `type = 'payment'` and `status = 'succeeded'`, plus at least one debit and one credit `ledger_entries` row whose totals balance in the request currency.
- **Rationale**: This directly satisfies FR-017 through FR-023 and gives API tests a clear accounting invariant.
- **Alternatives considered**: Logging payment events in the request row was rejected because it would not provide the required transaction and ledger records.

## Decision: Payment operation is idempotent by request id

- **Decision**: Enforce a unique successful payment transaction per `payment_request_id`; update the request from `pending` to `paid` with a status guard; block or return the current paid outcome for repeated submits without additional balance deduction.
- **Rationale**: Required for FR-024 and FR-025. The same request must not produce duplicate transactions or duplicate debits from repeated clicks, refreshes, retries, or delayed responses.
- **Alternatives considered**: UI-only disabling was rejected because repeated network submissions can occur outside the UI and a refresh can replay a request.

## Decision: Simulated processing belongs to the UI flow, final authority stays with backend

- **Decision**: Show a 2-3 second processing state after confirmation and disable repeated Pay actions during that state. The backend still performs all final checks and returns the committed result.
- **Rationale**: Satisfies FR-012 and FR-013 while preserving correctness. Tests can assert the desktop loading state without depending on external payment systems.
- **Alternatives considered**: Adding backend sleep/delay was rejected because it slows API tests and mixes UI feedback requirements with data consistency logic.

## Decision: Responsive design with desktop-only Playwright

- **Decision**: The Pay flow must be responsive across desktop, tablet, and mobile using existing CSS patterns. Automated end-to-end coverage uses only `npm run test:e2e:desktop`; tablet and mobile behavior is verified manually by viewport checks.
- **Rationale**: Matches the user's explicit instruction: responsive design, only Playwright for desktop.
- **Alternatives considered**: Adding Playwright projects for mobile/tablet was rejected because it conflicts with the requested automation scope.
