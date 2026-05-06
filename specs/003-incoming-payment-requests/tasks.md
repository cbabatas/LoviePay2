---
description: "Task list for Incoming Payment Requests feature"
---

# Tasks: Manage Incoming Payment Requests

**Input**: Design documents from `/specs/003-incoming-payment-requests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/backend-api.md, contracts/supabase-schema.md, contracts/ui-flow.md, quickstart.md

**Tests**: Automated tests are included by default. API tests use `node --test` via `npm run test:api`. Desktop end-to-end tests use Playwright via `npm run test:e2e:desktop`. Tablet and mobile responsive checks are documented manual steps because Playwright is desktop-only.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- File paths are absolute from the repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm working tree state and ensure dependencies are in sync before any incoming-specific changes.

- [X] T001 Verify branch `003-incoming-payment-requests` is checked out and run `npm install` from the repository root to ensure dependencies match `package.json`
- [X] T002 Run baseline `npm run check`, `npm run test:api`, and `npm run test:e2e:desktop` to confirm the existing outgoing flow is green before adding incoming code

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Schema, mock data, shared helpers, and shared API plumbing required by every incoming user story. No user story work begins until this phase is complete.

**⚠️ CRITICAL**: All user stories depend on these tasks.

- [X] T003 Update `supabase/payment-requests.sql` to drop and re-add `payment_requests_status_check` allowing `('pending','withdrawn','declined','expired')` and add `create index if not exists payment_requests_recipient_status_created_idx on public.payment_requests (recipient_id, status, created_at desc)` per `specs/003-incoming-payment-requests/contracts/supabase-schema.md`
- [X] T004 [P] Extend `src/mock-data.js` to seed incoming `payment_requests` rows for the demo user covering: one pending within the 7-day window, one already `declined`, one stored-`pending` whose `created_at` sits exactly on the 7-day boundary so reads promote it to `expired`, and one clearly older-than-7-days stored-`pending` row, plus any sender records (`friends`) needed to display them
- [X] T005 [P] Add expiry derivation and decline eligibility helpers in `src/payment-request.js`: `computeExpiresAt(createdAt)` (`createdAt + 7 days` UTC), `computeDaysRemaining(expiresAt, now)` (`max(0, floor((expiresAt - now)/1 day))`), `isPastExpiry(createdAt, now)` (`now >= createdAt + 7 days`), and `canDeclineIncoming(request, now)` (true only when stored `status === 'pending'` and not past expiry)
- [X] T006 [P] Add a `filterIncomingPaymentRequests(requests, { status, senderQuery }, friendsById)` helper in `src/payment-request.js` that filters the recipient-scoped list by stored `status` (after server-applied promotion) and by `senderQuery` matched via the existing `normalizeSearch` helper against sender name, email, phone, note, currency, amount, and date
- [X] T007 In `api/payment-requests.js`, add a shared `promoteExpiredOnRead(row, now)` helper that, for any row whose stored `status === 'pending'` and `now >= created_at + 7 days`, performs a Supabase update setting `status = 'expired'` and `updated_at = now`, returns the promoted row, and otherwise returns the row unchanged; ensure it is reused by list, detail, and decline paths
- [X] T008 In `api/payment-requests.js`, add a shared response shaper that augments each returned row with derived `expiresAt` and `daysRemaining` fields per `contracts/backend-api.md` (using helpers from T005), so list/detail/decline responses are consistent
- [X] T009 Extend the request router in `api/payment-requests.js` to recognize `GET /api/payment-requests?direction=incoming`, `GET /api/payment-requests/:id?direction=incoming`, and `PATCH /api/payment-requests/:id/decline`, while preserving existing outgoing/create/withdraw routes and continuing to return `405` with a correct `Allow` header for unrecognized method/path combinations

**Checkpoint**: Foundation ready — user stories can now be implemented in priority order.

---

## Phase 3: User Story 1 - View Incoming Requests List (Priority: P1) 🎯 MVP

**Goal**: A user can open the Incoming Requests tab and see a recipient-scoped list with sender, amount, status, creation date, and days remaining; expired rows render read-only and outgoing rows never appear.

**Independent Test**: Sign in as the demo user, open the Payment Request screen, switch to the Incoming Requests tab, and verify the list renders with all required fields and respects expiry boundary behavior.

### Tests for User Story 1 ⚠️

> Write these tests before the corresponding implementation and ensure they fail first.

- [X] T010 [P] [US1] In `tests/api/payment-requests.validation.test.js`, add tests for `listIncomingPaymentRequests` covering: returns only rows where `recipient_id === currentUser.id`, never returns outgoing rows, sorts newest-first by `created_at`, and includes derived `expiresAt`/`daysRemaining` per `contracts/backend-api.md`
- [X] T011 [P] [US1] In `tests/api/payment-requests.validation.test.js`, add a test for read-time expiry promotion in list: a stored-`pending` row whose `created_at` is exactly 7 days before injected `now` is returned with `status: "expired"`, `daysRemaining: 0`, and an `updated_at` equal to the promotion time; a Supabase update was issued for that row
- [X] T012 [P] [US1] In `tests/api/payment-requests.validation.test.js`, add a test that returns `incoming_list_failed` when the underlying Supabase select rejects
- [X] T013 [P] [US1] In `tests/e2e/incoming-payment-requests.desktop.spec.js`, add a Playwright desktop spec that navigates to the Payment Request screen, switches to the Incoming Requests tab, and asserts each visible row shows sender name, amount with currency, status, creation date, and days remaining; an outgoing-only request is not present; an expired row is rendered read-only with no Decline action

### Implementation for User Story 1

- [X] T014 [US1] Implement `listIncomingPaymentRequests({ currentUser })` in `api/payment-requests.js`: select rows where `recipient_id = currentUser.id`, ordered by `created_at desc`, run `promoteExpiredOnRead` (T007) over each stored-`pending` row, then shape via T008; map underlying errors to `incoming_list_failed`
- [X] T015 [US1] Wire `GET /api/payment-requests?direction=incoming` in the router (added in T009) to `listIncomingPaymentRequests` and return the `{ paymentRequests }` payload defined in `contracts/backend-api.md`
- [X] T016 [US1] Add `fetchIncomingPaymentRequests()` in `src/request-api.js` that calls `GET /api/payment-requests?direction=incoming` and returns the parsed `paymentRequests` array, surfacing API errors to the caller
- [X] T017 [US1] In `src/main.js`, add an Incoming Requests tab as a sibling of the existing Outgoing tab on the Payment Request screen; selecting it triggers the incoming list load and resets any outgoing-tab filters/selection per `contracts/ui-flow.md`
- [X] T018 [US1] In `src/main.js` (and supporting helpers in `src/payment-request.js` if needed), render the incoming list rows with sender display name, amount with currency, status pill, creation date, and days remaining; use `daysRemaining = 0` plus an "expired" presentation for stored `expired`/`declined`/`withdrawn` rows; do not render any Decline action in this story
- [X] T019 [US1] In `src/main.js`, implement loading, empty, and error states for the incoming list per `contracts/ui-flow.md`; the empty state copy is task-focused and consistent with the outgoing empty state
- [X] T020 [US1] In `src/styles.css`, add or extend styles required by the Incoming tab, list rows, status pill, and empty/loading/error states so the layout is responsive on desktop, tablet, and mobile per `contracts/ui-flow.md` (no horizontal scrolling at tablet/mobile widths)
- [X] T021 [US1] Verify SC-001: opening the Incoming Requests tab on the demo dataset renders the list within 2 seconds under normal local conditions; record observation in the PR description if a measurement is requested

**Checkpoint**: User Story 1 is fully functional — the Incoming tab lists all current-user recipient requests with the required fields and respects the expiry boundary, with no decline UI yet.

---

## Phase 4: User Story 2 - Filter and Search Requests (Priority: P2)

**Goal**: A user can filter the incoming list by status and search by sender to quickly locate a specific request, with clear empty and no-results states.

**Independent Test**: With multiple incoming requests of varied status seeded, apply each status filter and several sender search queries, including one that yields zero matches, and verify the list updates correctly.

### Tests for User Story 2 ⚠️

- [X] T022 [P] [US2] In `tests/api/payment-requests.validation.test.js`, add unit tests for `filterIncomingPaymentRequests` (T006): status `pending` returns only stored-`pending` rows, `declined` returns only stored-`declined`, `expired` returns only stored-`expired`, empty status returns all, and `senderQuery` matches sender name, email, phone, note, currency, amount, and date via `normalizeSearch`; combined `status + senderQuery` intersects results
- [X] T023 [P] [US2] In `tests/e2e/incoming-payment-requests.desktop.spec.js`, add desktop Playwright coverage that selects the Pending, Declined, and Expired filters in turn, types a sender name in search, and asserts only matching rows are visible; entering a query that matches nothing renders the no-results state with a clear-filters affordance

### Implementation for User Story 2

- [X] T024 [US2] In `src/main.js`, add the status filter control (All, Pending, Declined, Expired) and sender search input on the Incoming tab per `contracts/ui-flow.md`, wired into client state alongside the list loaded in US1
- [X] T025 [US2] In `src/main.js`, integrate `filterIncomingPaymentRequests` (T006) so that filter and search changes update the rendered list within 1 second for typical demo data, applying after the recipient-scoped server result
- [X] T026 [US2] In `src/main.js`, implement the no-results state (filters match nothing) distinct from the empty state (no incoming requests at all), including a clear-filters action that restores the full incoming set
- [X] T027 [US2] In `src/styles.css`, ensure the filter row, status pill, search input, and no-results state are responsive and remain usable at tablet (~820 px) and mobile (~390 px) widths without horizontal scrolling

**Checkpoint**: Users can narrow the Incoming list by status and sender search, with explicit empty and no-results states.

---

## Phase 5: User Story 3 - View Request Detail (Priority: P2)

**Goal**: A user can open a dedicated detail page for an incoming request showing sender, amount, status, creation date, expiry date, and days remaining, with back navigation that preserves filters; outgoing or unknown ids return a not-found response.

**Independent Test**: From the Incoming list, tap a row and verify the detail page loads with all required fields; navigate back and confirm previously applied filters and search are preserved.

### Tests for User Story 3 ⚠️

- [X] T028 [P] [US3] In `tests/api/payment-requests.validation.test.js`, add tests for `getIncomingPaymentRequest` covering: returns the row when `recipient_id === currentUser.id`; returns `request_not_found` for outgoing rows or unknown ids; performs the read-time expiry promotion when accessed at or past the boundary; returns `incoming_detail_failed` on Supabase select error
- [X] T029 [P] [US3] In `tests/e2e/incoming-payment-requests.desktop.spec.js`, add Playwright coverage that selects a row from the Incoming list, asserts the detail page shows sender display info, amount with currency, status, creation date, expiry date, days remaining, and any required identifying info; the back action returns to the Incoming list with previously applied filters/search preserved

### Implementation for User Story 3

- [X] T030 [US3] Implement `getIncomingPaymentRequest({ id, currentUser })` in `api/payment-requests.js`: fetch the row by id, verify `recipient_id === currentUser.id` (otherwise return `request_not_found` without exposing outgoing data), run `promoteExpiredOnRead` (T007), shape via T008, and map underlying errors to `incoming_detail_failed`
- [X] T031 [US3] Wire `GET /api/payment-requests/:id?direction=incoming` in the router (added in T009) to `getIncomingPaymentRequest` and return the `{ paymentRequest }` payload defined in `contracts/backend-api.md`
- [X] T032 [US3] Add `fetchIncomingPaymentRequest(id)` in `src/request-api.js` that calls `GET /api/payment-requests/:id?direction=incoming` and returns the parsed `paymentRequest`, surfacing API errors to the caller
- [X] T033 [US3] In `src/main.js`, render the dedicated incoming detail view per `contracts/ui-flow.md`: sender display info, amount with currency, current displayed status, creation date, expiry date, days remaining, and any useful identifying info (note, shareable link reference, receiver account); selecting a list row opens this view and back navigation returns to the Incoming list with previously applied filters/search preserved
- [X] T034 [US3] In `src/main.js`, implement loading, unavailable (not-found / outgoing id), and error states for the incoming detail view, including a back navigation action in the unavailable state
- [X] T035 [US3] In `src/styles.css`, ensure the incoming detail layout is responsive on desktop, tablet, and mobile, and supports a wider master/detail-friendly desktop layout consistent with outgoing

**Checkpoint**: Users can drill into any current-user incoming request and return to a filtered list; outgoing or unknown ids cleanly resolve to a not-found state.

---

## Phase 6: User Story 4 - Decline a Request (Priority: P3)

**Goal**: A user can decline a pending incoming request from either the list or detail view, gated by a confirmation step, with the row immediately reflecting `declined` and no Decline option exposed for non-pending rows. Server enforces that only stored-`pending`, not-yet-expired requests can be declined and runs the expiry promotion first.

**Independent Test**: From the list, initiate Decline on a pending row, cancel and confirm in separate runs; from the detail view, initiate and confirm Decline; verify status updates to `declined` immediately and that expired/declined rows expose no Decline action.

### Tests for User Story 4 ⚠️

- [X] T036 [P] [US4] In `tests/api/payment-requests.validation.test.js`, add tests for `declineIncomingPaymentRequest` covering: requires `{ confirm: true }` and otherwise returns `decline_confirmation_required`; rejects requests where `recipient_id !== currentUser.id` with `request_not_found`; returns `decline_not_allowed` when stored status is `withdrawn` or `declined`; returns `decline_not_allowed` and the promoted `paymentRequest` (status `expired`, new `updated_at`) when the row was just promoted by the read-time check; returns `request_update_failed` when the underlying Supabase update fails
- [X] T037 [P] [US4] In `tests/api/payment-requests.validation.test.js`, add a test for the success path: a stored-`pending`, not-expired, current-user-recipient request with `{ confirm: true }` transitions to `status: "declined"` with a new `updated_at`, and the response shape matches `contracts/backend-api.md`
- [X] T038 [P] [US4] In `tests/e2e/incoming-payment-requests.desktop.spec.js`, add Playwright coverage that: initiates Decline from a list row and from the detail view, cancels the confirmation in one flow (status unchanged), confirms in another (row/detail updates to `declined` within 1 second), and asserts that expired and declined rows expose no Decline action in either view

### Implementation for User Story 4

- [X] T039 [US4] Implement `declineIncomingPaymentRequest({ id, currentUser, body })` in `api/payment-requests.js`: require `body.confirm === true` (else `decline_confirmation_required`); fetch the row and verify `recipient_id === currentUser.id` (else `request_not_found`); run `promoteExpiredOnRead` (T007) — if it promoted the row or stored status is not `pending`, return `decline_not_allowed` (and the promoted row when applicable per the contract); otherwise update the row to `status = 'declined'` with a new `updated_at`, shape via T008, and map underlying update errors to `request_update_failed`
- [X] T040 [US4] Wire `PATCH /api/payment-requests/:id/decline` in the router (added in T009) to `declineIncomingPaymentRequest` and return the `{ paymentRequest }` payload defined in `contracts/backend-api.md`
- [X] T041 [US4] Add `declineIncomingPaymentRequest(id)` in `src/request-api.js` that calls `PATCH /api/payment-requests/:id/decline` with `{ confirm: true }` and returns the parsed `paymentRequest`, surfacing API errors to the caller
- [X] T042 [US4] In `src/main.js`, expose a Decline action only on `pending` incoming list rows; tapping it opens the confirmation step (Confirm / Cancel) per `contracts/ui-flow.md`; confirm calls `declineIncomingPaymentRequest` and updates the affected row to `declined` within 1 second of backend success, removing the Decline action; cancel leaves status unchanged
- [X] T043 [US4] In `src/main.js`, expose a Decline action only on `pending` incoming detail views; tapping it shows the same confirmation step; confirm updates the detail view to `declined` and removes the Decline action; cancel leaves status unchanged; non-pending detail blocks Decline with a clear inline ineligible-action explanation (`expired`, `declined`, `withdrawn`)
- [X] T044 [US4] In `src/main.js`, render success state (short confirmation after a successful decline), error state (recoverable retry/dismiss when the API rejects with `request_update_failed` or network error), and ineligible-action state when the API returns `decline_not_allowed`, refreshing the row from the response payload when the server returns a promoted `expired` row
- [X] T045 [US4] In `src/styles.css`, add styles for the Decline button, confirmation dialog, success and error toasts, and ineligible-action affordance, ensuring the confirmation remains tappable and readable on tablet and mobile

**Checkpoint**: Decline works from list and detail with confirmation, the row updates immediately on success, and SC-005 holds — no Decline action is ever offered for expired or declined rows.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Cross-cutting verification once all user stories are complete.

- [X] T046 Run `npm run check`, `npm run test:api`, and `npm run test:e2e:desktop` and confirm all suites pass
- [X] T047 Manually verify tablet (~820 px) and mobile (~390 px) viewports for the Incoming tab, list, filters, detail, and decline confirmation per `specs/003-incoming-payment-requests/quickstart.md`; record any visual regressions in the PR description
- [X] T048 [P] Verify performance budgets: list visible within 2 seconds (SC-001), filter/search updates within 1 second, post-decline UI update within 1 second of backend success; note observations in the PR description
- [X] T049 [P] Audit `api/payment-requests.js` and `src/main.js` for duplication introduced during the feature and consolidate via existing helpers without changing behavior
- [X] T050 Walk through the verification matrix in `specs/003-incoming-payment-requests/quickstart.md` end-to-end on the dev server and confirm spec acceptance scenarios for US1–US4 are observed; ensure no outgoing request appears in any incoming surface

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately.
- **Foundational (Phase 2)**: Depends on Setup. BLOCKS all user stories.
- **User Story 1 (Phase 3, P1)**: Depends on Foundational. MVP.
- **User Story 2 (Phase 4, P2)**: Depends on Foundational and on US1's tab/list rendering (T017, T018) since filtering operates on the rendered incoming list.
- **User Story 3 (Phase 5, P2)**: Depends on Foundational and on US1's tab/list rendering (T017, T018) for navigation from list to detail. Independent of US2.
- **User Story 4 (Phase 6, P3)**: Depends on Foundational, on US1's list rendering (for list-source decline), and on US3's detail rendering (for detail-source decline).
- **Polish (Phase 7)**: Depends on all desired user stories being complete.

### Within Each User Story

- API/contract tests are written and fail before the corresponding handler/router is implemented.
- Helpers (Phase 2) → API handler → router wiring → client API wrapper → UI render → UI states → styles.
- Playwright desktop spec is added alongside, exercising the UI once the corresponding handler and UI exist.

### Parallel Opportunities

- Phase 2 tasks T004, T005, T006 are independent of each other and can run in parallel.
- All `[P]` tests within a single user story (e.g., T010–T013, T022–T023, T028–T029, T036–T038) touch the same two test files (`tests/api/payment-requests.validation.test.js` and `tests/e2e/incoming-payment-requests.desktop.spec.js`). Treat `[P]` here as "independent in subject matter" — order writes within each file to avoid merge conflicts; they can be authored in parallel by different developers if they coordinate on file regions or split into per-suite blocks.
- After Foundational completes, US2 and US3 implementation work can proceed in parallel by different developers once US1's tab/list rendering is in place.

---

## Parallel Example: User Story 1

```bash
# Authoring tests for User Story 1 in parallel:
Task: "Add list scoping/ordering tests in tests/api/payment-requests.validation.test.js" (T010)
Task: "Add list expiry-promotion test in tests/api/payment-requests.validation.test.js" (T011)
Task: "Add list error mapping test in tests/api/payment-requests.validation.test.js" (T012)
Task: "Add Incoming list desktop Playwright spec in tests/e2e/incoming-payment-requests.desktop.spec.js" (T013)

# Foundational helpers in parallel (different files / different exports):
Task: "Seed incoming mock data in src/mock-data.js" (T004)
Task: "Add expiry/decline-eligibility helpers in src/payment-request.js" (T005)
Task: "Add filterIncomingPaymentRequests in src/payment-request.js" (T006)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational (CRITICAL — schema + helpers + router shell).
3. Complete Phase 3: User Story 1 — Incoming list visible end-to-end.
4. **STOP and VALIDATE**: Run automated suites and walk the Incoming tab manually. Demo if ready.

### Incremental Delivery

1. Setup + Foundational → foundation ready.
2. US1 → Incoming tab and list (MVP) → demo.
3. US2 → filters and search.
4. US3 → detail view and back navigation.
5. US4 → decline with confirmation from list and detail.
6. Polish → cross-cutting verification.

### Parallel Team Strategy

After Foundational and US1's tab/list rendering are in place:

- Developer A: US2 (filters/search) — `src/main.js` filter UI + `filterIncomingPaymentRequests` integration.
- Developer B: US3 (detail) — `getIncomingPaymentRequest` handler + detail UI.
- Developer C: prepares US4 helpers but waits for US3 detail rendering before integrating decline-from-detail.

---

## Notes

- `[P]` = different files (or independent subject matter inside the two shared test files), no dependencies on incomplete tasks.
- `[Story]` label maps each task to its user story for traceability.
- Each user story is independently testable per its acceptance scenarios in `spec.md`.
- Tests are written and observed failing before the corresponding implementation lands.
- Commit after each task or logical group; do not bypass hooks or signing.
- Stop at any checkpoint to validate the story end-to-end before proceeding.
- Avoid: cross-story dependencies that break independent testability, client-only enforcement of recipient scoping or decline eligibility, and any path that allows outgoing requests to surface in the Incoming flow.
