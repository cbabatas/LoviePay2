# Research: Manage Outgoing Payment Requests

## Decision: Extend the existing payment request API boundary

**Rationale**: The current project already has `api/payment-requests.js` for payment request creation and `api/payment-request-validation.js` for server-side validation. Adding outgoing list/detail/withdraw behavior to the same payment request boundary keeps the implementation small and makes sender scoping and status transitions enforceable on the server.

**Alternatives considered**: A new outgoing-only endpoint module would split one resource across multiple files without a current need. A client-only implementation would be simpler to render but would not enforce access control or withdrawal eligibility.

## Decision: Treat outgoing requests as `sender_id === current demo user id`

**Rationale**: The spec defines outgoing requests as requests created by the current user. The existing create endpoint derives `sender_id` from `demoUser.id`, so outgoing queries can use the same source of truth.

**Alternatives considered**: Marking records with a separate direction field was rejected because direction is derivable from sender/recipient relationships and would create duplicated state.

## Decision: Allow only `pending` to `withdrawn` status transition

**Rationale**: The spec states pending requests are eligible by default and non-pending requests must be blocked. The backend should check the current row status immediately before update to handle stale list/detail screens.

**Alternatives considered**: Allowing the frontend to decide eligibility was rejected because status can change while a screen is open. Supporting additional eligible statuses is deferred until a product rule defines them.

## Decision: Add status support to Supabase schema instead of a separate audit table

**Rationale**: The feature needs the current request status to update from `pending` to `withdrawn`. The existing table already has a `status` column, so widening the check constraint and recording `updated_at` is enough for this demo feature.

**Alternatives considered**: A separate status history table would provide audit detail but is unnecessary because no audit or reporting requirement exists.

## Decision: Filter on visible attributes in the frontend, after outgoing scoping

**Rationale**: The demo scale is small, and filtering by visible status and recipient information can update instantly after the outgoing set is loaded. The backend remains responsible for returning only current-user outgoing requests.

**Alternatives considered**: Server-side filter query parameters were considered but would add endpoint complexity before the product needs pagination or large request history.

## Decision: Responsive UI design with desktop-only Playwright automation

**Rationale**: The user explicitly requested responsive design and Playwright only for desktop. Implementation should use CSS media queries and resilient layouts for tablet/mobile, while automated e2e coverage stays on the desktop project in `playwright.config.js`.

**Alternatives considered**: Adding mobile Playwright projects would improve regression coverage but conflicts with the requested desktop-only Playwright scope.
