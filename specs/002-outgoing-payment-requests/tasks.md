# Tasks: Manage Outgoing Payment Requests

**Input**: Design documents from `/specs/002-outgoing-payment-requests/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md
**Tests**: Include automated API and desktop e2e test tasks for changed behavior. Tablet and mobile responsiveness are verified manually because the plan limits Playwright automation to desktop only.
**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on incomplete tasks
- **[Story]**: User story label for story phases only
- Every task includes exact file paths

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Confirm the existing Vite, Node API, Supabase, and Playwright project is ready for outgoing request work.

- [X] T001 Verify required npm scripts exist for check, API tests, desktop e2e tests, and local dev in package.json
- [X] T002 [P] Review outgoing API, schema, and UI contracts before implementation in specs/002-outgoing-payment-requests/contracts/backend-api.md
- [X] T003 [P] Review responsive and acceptance verification steps before implementation in specs/002-outgoing-payment-requests/quickstart.md

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared data, schema, API mapping, and client helpers that all outgoing stories depend on.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 Update Supabase status constraint, updated_at column handling, and sender/status indexes for outgoing withdrawal support in supabase/payment-requests.sql
- [X] T005 Add outgoing and incoming payment request seed records plus recipient display metadata for list/detail fallback and tests in src/mock-data.js
- [X] T006 Extend payment request error messages with outgoing list/detail/withdraw error codes and unavailable-action copy in src/payment-request.js
- [X] T007 Add shared outgoing request row-to-client mapping with updatedAt support while preserving create response shape in api/payment-requests.js
- [X] T008 [P] Add client API helpers for listOutgoingPaymentRequests, getOutgoingPaymentRequest, and withdrawPaymentRequest in src/request-api.js
- [X] T009 Add lightweight route/view state for payment request section, create flow, outgoing list, and outgoing detail in src/main.js

**Checkpoint**: Foundation ready - user story implementation can now begin.

---

## Phase 3: User Story 1 - View Outgoing Requests (Priority: P1) MVP

**Goal**: Users can open Payment Request, select the outgoing view, and see only requests where the current demo user is the sender with amount, status, recipient, and date.

**Independent Test**: Open Payment Request, select outgoing, and verify only sender-scoped outgoing rows appear with the required visible attributes; empty outgoing state appears when there are no outgoing records.

### Tests for User Story 1

- [X] T010 [P] [US1] Add API tests for GET outgoing list sender scoping, newest-first ordering, row mapping, and incoming exclusion in tests/api/payment-requests.validation.test.js
- [X] T011 [P] [US1] Add desktop e2e test for opening Payment Request outgoing tab and verifying required row attributes in tests/e2e/outgoing-payment-requests.desktop.spec.js

### Implementation for User Story 1

- [X] T012 [US1] Implement GET /api/payment-requests?direction=outgoing sender-scoped list operation in api/payment-requests.js
- [X] T013 [US1] Wire outgoing list loading, empty, error, and populated states to listOutgoingPaymentRequests in src/main.js
- [X] T014 [US1] Render outgoing rows with formatted amount, status, recipient display, and request date in src/main.js
- [X] T015 [US1] Add outgoing list formatting helpers for amount, recipient lookup, status labels, date display, and outgoing-only scoping fallback in src/payment-request.js
- [X] T016 [US1] Style Payment Request tabs, outgoing list rows, empty state, loading state, and error state for desktop/tablet/mobile in src/styles.css

**Checkpoint**: User Story 1 is fully functional and testable independently.

---

## Phase 4: User Story 2 - Filter Outgoing Requests (Priority: P2)

**Goal**: Users can filter outgoing requests by visible status and recipient information, then clear filters, without incoming requests ever appearing.

**Independent Test**: Apply status and recipient filters to a known outgoing set, verify only matching outgoing rows remain, verify no-results state, then clear filters and confirm the full outgoing set returns.

### Tests for User Story 2

- [X] T017 [P] [US2] Add helper tests for status filtering, recipient query filtering, clear behavior, and no incoming leakage in tests/api/payment-requests.validation.test.js
- [X] T018 [P] [US2] Add desktop e2e test for status filter, recipient search, no-results, and clear filters in tests/e2e/outgoing-payment-requests.desktop.spec.js

### Implementation for User Story 2

- [X] T019 [US2] Implement filterOutgoingPaymentRequests helper for status and recipient visible-details matching in src/payment-request.js
- [X] T020 [US2] Add outgoing status filter, recipient search input, and clear filters action to Payment Request UI in src/main.js
- [X] T021 [US2] Apply filters after outgoing sender scoping and render no-results separately from empty outgoing state in src/main.js
- [X] T022 [US2] Style filter controls, wrapped action rows, and no-results state for desktop/tablet/mobile in src/styles.css

**Checkpoint**: User Stories 1 and 2 both work independently.

---

## Phase 5: User Story 3 - View Request Details (Priority: P3)

**Goal**: Users can select an outgoing request and open a separate detail view for the same sender-scoped request.

**Independent Test**: Select an outgoing row, verify the detail view opens for that exact request with amount, status, recipient, date, note/shareable link/account where available, and verify non-sender or missing records show unavailable state with back navigation.

### Tests for User Story 3

- [X] T023 [P] [US3] Add API tests for GET outgoing detail success, request_not_found for incoming records, and request_not_found for missing records in tests/api/payment-requests.validation.test.js
- [X] T024 [P] [US3] Add desktop e2e test for selecting an outgoing row, matching detail content, and returning to outgoing list in tests/e2e/outgoing-payment-requests.desktop.spec.js

### Implementation for User Story 3

- [X] T025 [US3] Implement GET /api/payment-requests/:id?direction=outgoing detail operation with sender scoping in api/payment-requests.js
- [X] T026 [US3] Add row selection navigation and detail route state for outgoing request IDs in src/main.js
- [X] T027 [US3] Render outgoing detail view with amount, status, recipient, date, note, shareable link, receiver account, unavailable state, and back navigation in src/main.js
- [X] T028 [US3] Add detail-specific formatting helpers for receiver account labels and unavailable request handling in src/payment-request.js
- [X] T029 [US3] Style separate outgoing detail, back navigation, metadata sections, and unavailable state for desktop/tablet/mobile in src/styles.css

**Checkpoint**: User Stories 1, 2, and 3 all work independently.

---

## Phase 6: User Story 4 - Withdraw Eligible Requests (Priority: P4)

**Goal**: Users can withdraw pending outgoing requests from list or detail after confirmation; ineligible requests are blocked and cancel/dismiss preserves status.

**Independent Test**: From list and detail, cancel a pending withdrawal and verify unchanged status; confirm a pending withdrawal and verify withdrawn status; verify non-pending and stale-status requests cannot be withdrawn and show a clear explanation.

### Tests for User Story 4

- [X] T030 [P] [US4] Add API tests for PATCH withdraw confirmation required, pending-to-withdrawn success, sender scoping, ineligible status blocking, and update failure codes in tests/api/payment-requests.validation.test.js
- [X] T031 [P] [US4] Add desktop e2e test for list withdrawal cancel, list withdrawal confirm, detail withdrawal confirm, and ineligible withdrawal messaging in tests/e2e/outgoing-payment-requests.desktop.spec.js

### Implementation for User Story 4

- [X] T032 [US4] Implement PATCH /api/payment-requests/:id/withdraw with confirm true, sender_id predicate, status pending predicate, updated_at refresh, and stable error codes in api/payment-requests.js
- [X] T033 [US4] Add withdrawal eligibility helper and status transition constants for pending and withdrawn requests in src/payment-request.js
- [X] T034 [US4] Render list-level withdraw actions only for pending rows and blocked messaging for non-pending rows in src/main.js
- [X] T035 [US4] Render detail-level withdraw action for pending requests and blocked messaging for non-pending detail records in src/main.js
- [X] T036 [US4] Add withdrawal confirmation modal/dialog state with confirm, cancel, dismiss, pending, success, backend error, and stale-status handling in src/main.js
- [X] T037 [US4] Update list and detail state from backend withdraw response while preserving status on cancel or failed confirmation in src/main.js
- [X] T038 [US4] Style withdraw buttons, ineligible explanations, confirmation dialog, success banner, and recoverable error states in src/styles.css

**Checkpoint**: User Stories 1 through 4 all work independently.

---

## Phase 7: User Story 5 - Open Create Request Screen (Priority: P5)

**Goal**: Users can select Create Request from the Payment Request screen regardless of active tab, filters, or selected outgoing request.

**Independent Test**: From outgoing list, filtered/no-results state, and detail view, select Create Request and verify the existing create request screen opens properly.

### Tests for User Story 5

- [X] T039 [P] [US5] Add desktop e2e coverage for Create Request from outgoing list, filtered state, and detail view in tests/e2e/outgoing-payment-requests.desktop.spec.js

### Implementation for User Story 5

- [X] T040 [US5] Add screen-level Create Request action outside outgoing tab/filter state and route it to the existing create request form in src/main.js
- [X] T041 [US5] Preserve existing create payment request form behavior after adding Payment Request section navigation in src/main.js
- [X] T042 [US5] Style the screen-level Create Request action consistently across Payment Request section states in src/styles.css

**Checkpoint**: All user stories are independently functional.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, responsive checks, and cleanup across the completed feature.

- [X] T043 [P] Add or update desktop e2e fixture notes for outgoing request seed assumptions in tests/e2e/outgoing-payment-requests.desktop.spec.js
- [X] T044 [P] Document manual tablet and mobile responsive verification results in specs/002-outgoing-payment-requests/quickstart.md
- [X] T045 Run npm run check and fix any syntax or lint issues in api/payment-requests.js, src/main.js, src/payment-request.js, src/request-api.js, and src/styles.css
- [X] T046 Run npm run test:api and fix any failing API behavior in api/payment-requests.js, api/payment-request-validation.js, src/payment-request.js, and tests/api/payment-requests.validation.test.js
- [X] T047 Run npm run test:e2e:desktop and fix any failing desktop flow behavior in src/main.js, src/styles.css, src/request-api.js, and tests/e2e/outgoing-payment-requests.desktop.spec.js
- [X] T048 Verify quickstart acceptance steps 1-10 and responsive checks are complete in specs/002-outgoing-payment-requests/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - blocks all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion - MVP
- **User Story 2 (Phase 4)**: Depends on User Story 1 list data and rendering
- **User Story 3 (Phase 5)**: Depends on User Story 1 outgoing list selection
- **User Story 4 (Phase 6)**: Depends on User Story 1 list and User Story 3 detail surfaces
- **User Story 5 (Phase 7)**: Depends on Payment Request section navigation from User Story 1 and should be validated against later states
- **Polish (Phase 8)**: Depends on all desired user stories being complete

### User Story Dependencies

- **US1 View Outgoing Requests (P1)**: Starts after Foundational; no dependency on other stories
- **US2 Filter Outgoing Requests (P2)**: Starts after US1 because filters operate on the outgoing list
- **US3 View Request Details (P3)**: Starts after US1 because detail opens from outgoing rows
- **US4 Withdraw Eligible Requests (P4)**: Starts after US1 for list withdrawal and after US3 for detail withdrawal
- **US5 Open Create Request Screen (P5)**: Starts after US1 navigation exists; validate again after US2-US4 states exist

### Within Each User Story

- Automated tests are listed before implementation tasks and should fail before implementation when practical
- Backend/API behavior before client integration where a story uses an endpoint
- Helpers before UI wiring
- UI state wiring before styling polish
- Each story should reach its checkpoint before moving to the next priority

---

## Parallel Opportunities

- T002 and T003 can run in parallel during setup
- T008 can run in parallel with T004-T007 because it is a client API wrapper file
- T010 and T011 can run in parallel for US1
- T017 and T018 can run in parallel for US2
- T023 and T024 can run in parallel for US3
- T030 and T031 can run in parallel for US4
- T039 can run while T040-T042 are implemented if selectors and expected navigation are agreed
- T043 and T044 can run in parallel during polish

---

## Parallel Example: User Story 1

```bash
Task: "T010 [P] [US1] Add API tests for GET outgoing list sender scoping, newest-first ordering, row mapping, and incoming exclusion in tests/api/payment-requests.validation.test.js"
Task: "T011 [P] [US1] Add desktop e2e test for opening Payment Request outgoing tab and verifying required row attributes in tests/e2e/outgoing-payment-requests.desktop.spec.js"
```

---

## Parallel Example: User Story 2

```bash
Task: "T017 [P] [US2] Add helper tests for status filtering, recipient query filtering, clear behavior, and no incoming leakage in tests/api/payment-requests.validation.test.js"
Task: "T018 [P] [US2] Add desktop e2e test for status filter, recipient search, no-results, and clear filters in tests/e2e/outgoing-payment-requests.desktop.spec.js"
```

---

## Parallel Example: User Story 3

```bash
Task: "T023 [P] [US3] Add API tests for GET outgoing detail success, request_not_found for incoming records, and request_not_found for missing records in tests/api/payment-requests.validation.test.js"
Task: "T024 [P] [US3] Add desktop e2e test for selecting an outgoing row, matching detail content, and returning to outgoing list in tests/e2e/outgoing-payment-requests.desktop.spec.js"
```

---

## Parallel Example: User Story 4

```bash
Task: "T030 [P] [US4] Add API tests for PATCH withdraw confirmation required, pending-to-withdrawn success, sender scoping, ineligible status blocking, and update failure codes in tests/api/payment-requests.validation.test.js"
Task: "T031 [P] [US4] Add desktop e2e test for list withdrawal cancel, list withdrawal confirm, detail withdrawal confirm, and ineligible withdrawal messaging in tests/e2e/outgoing-payment-requests.desktop.spec.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: US1 View Outgoing Requests
4. Stop and validate with npm run check, npm run test:api, and the US1 desktop e2e path
5. Demo the outgoing list before adding filters, detail, withdrawal, or create navigation refinements

### Incremental Delivery

1. Add US1 outgoing list and validate independently
2. Add US2 filters and validate independently
3. Add US3 detail view and validate independently
4. Add US4 withdrawal and validate independently from list and detail
5. Add US5 Create Request entry point and validate from every Payment Request state
6. Finish Phase 8 checks and manual responsive verification

### Parallel Team Strategy

1. Complete Setup and Foundational together
2. After Foundation, split API tests and e2e tests in parallel with implementation for each story
3. Keep src/main.js edits coordinated because most UI tasks share that file
4. Keep src/styles.css polish grouped after UI states exist to reduce conflicts
