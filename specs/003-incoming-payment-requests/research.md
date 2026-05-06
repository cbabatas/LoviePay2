# Research: Manage Incoming Payment Requests

All Technical Context items are resolved. No `NEEDS CLARIFICATION` markers remain.

## Decision: Reuse the existing Vite + lightweight Node handler architecture

- **Decision**: Implement the Incoming tab inside the existing Vite app and extend `api/payment-requests.js` with recipient-scoped operations.
- **Rationale**: Outgoing requests already follow this pattern; Incoming is a sibling capability and benefits from shared validation, formatting, and UI modules.
- **Alternatives considered**: A separate route or service for incoming requests was rejected as unnecessary duplication for a small demo app and would violate Simplicity Before Abstraction.

## Decision: Server-side recipient scoping is mandatory

- **Decision**: All incoming list/detail/decline operations filter by `recipient_id = current demo user.id` server-side. Outgoing requests must never appear in incoming responses.
- **Rationale**: Required to satisfy FR-001 and to prevent cross-user data exposure even in a demo environment. Mirrors the existing outgoing scoping approach.
- **Alternatives considered**: Client-side filtering only — rejected because it cannot enforce access for shared-id direct fetches and breaks if mock data evolves.

## Decision: Expiry is promoted to a stored status on read

- **Decision**: Compute `expiresAt = created_at + 7 days` and `daysRemaining = floor((expiresAt - now)/1 day)` at the moment of read. When a read observes a stored-`pending` row whose `now >= expiresAt`, the server promotes the stored status to `expired` and sets `updated_at` to the promotion time before returning the row. No background job is required; promotion is opportunistic on read.
- **Rationale**: Satisfies FR-003, FR-004, and the explicit user direction that an expired record's stored `status` MUST become `expired` and `updated_at` MUST change at that time. Read-time promotion avoids a scheduled job while still persisting the terminal state. The 7-day boundary is unambiguous: at exactly 7 days the request is promoted.
- **Alternatives considered**: A scheduled job — rejected as unnecessary operational complexity for the demo. Presentation-only `expired` (no stored change) — rejected because it conflicts with the requirement that the stored status and `updated_at` reflect expiry.

## Decision: Both `declined` and `expired` are persisted statuses

- **Decision**: Extend the `payment_requests` status check constraint to allow `pending`, `withdrawn`, `declined`, and `expired`. Decline is recipient-initiated and writes `declined`; expiry is system-promoted on read and writes `expired`.
- **Rationale**: Decline is a recipient-initiated terminal state distinct from sender withdrawal. Expiry is now a stored terminal state per the user direction, so the constraint must permit it.
- **Alternatives considered**: Reusing `withdrawn` for either case — rejected because it conflates sender and recipient/system terminations and breaks existing outgoing semantics. Keeping `expired` as a derived-only label — rejected because it conflicts with the requirement that `status` and `updated_at` change when the record expires.

## Decision: Decline requires confirmation and pending status server-side

- **Decision**: `PATCH /api/payment-requests/:id/decline` requires `{ confirm: true }` in the body, must verify the request belongs to the current recipient, and must run the read-time expiry promotion before deciding eligibility. If the row is `pending` and not yet expired, transition it to `declined` and update `updated_at`. If promotion occurs (or the row is otherwise non-pending), decline fails with `decline_not_allowed` and the response reflects the current stored status.
- **Rationale**: Satisfies FR-005, FR-009, FR-010, and SC-005 by preventing accidental, unauthorized, or invalid declines and by ensuring an expiring row is promoted to `expired` rather than silently declined past the boundary.
- **Alternatives considered**: Confirming only on the client — rejected because a stale UI could submit a decline against an already-expired/declined request. Promoting to `expired` only on list reads — rejected because decline could then race past the boundary.

## Decision: Filtering and search use existing patterns

- **Decision**: Client-side status filter (pending, declined, expired, all) and sender search are applied after the recipient-scoped server result, using the existing `normalizeSearch` helper and a new `filterIncomingPaymentRequests` helper. Filtering compares against the stored status returned by the server (which has already applied read-time expiry promotion).
- **Rationale**: Mirrors the existing outgoing filter approach and keeps the implementation small. Real-time UI updates remain within the 1-second budget for typical demo data.
- **Alternatives considered**: Server-side filters — rejected as unnecessary for the small demo dataset and inconsistent with the existing outgoing pattern.

## Decision: Responsive design with desktop-only Playwright

- **Decision**: The Incoming tab, list, filters, detail, and confirmation use the existing responsive CSS conventions to work cleanly on desktop, tablet, and mobile. Automated end-to-end coverage runs via `npm run test:e2e:desktop` only; tablet and mobile behavior is verified manually with browser viewport checks.
- **Rationale**: Matches the user input for this plan ("as responsive design and only playwright for desktop") and the established outgoing-feature pattern.
- **Alternatives considered**: Adding Playwright projects for tablet/mobile viewports — rejected per the explicit user input scoping Playwright to desktop only.

## Decision: Mock data extends to cover incoming pending, declined, expired, and boundary cases

- **Decision**: Add at least one incoming pending row within the 7-day window, one incoming declined row, one incoming row exactly at the 7-day boundary (expired), and one incoming row clearly older than 7 days, alongside the existing outgoing rows. Update `recipient_id` to the current demo user where applicable.
- **Rationale**: Allows acceptance scenarios for list display, filter coverage, expiry rendering, decline flow, and boundary edge case to be exercised both by manual demo and by Playwright.
- **Alternatives considered**: Generating dynamic dates in tests instead of seeding mock data — partially adopted: tests may inject `now` for deterministic boundary checks, but seed data also covers the visual demo path.
