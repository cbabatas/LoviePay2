# Tasks: Create Payment Request

**Input**: Design documents from `/specs/001-create-payment-request/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Tests**: Automated tests are included because the specification and quickstart require JavaScript checks, backend validation tests, and desktop Playwright flow tests. Tablet and mobile responsive checks are manual only per the feature plan.

**Organization**: Tasks are grouped by user story so each story can be implemented and tested independently after shared setup and foundation work.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files and does not depend on incomplete tasks
- **[Story]**: Maps to the user story in spec.md
- Every task includes an exact repository file path

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the minimal browser app, backend endpoint surface, and verification scripts.

- [X] T001 Create `package.json` with `check`, `test:api`, `test:e2e:desktop`, and `dev` scripts plus Node ESM configuration in `/Users/cihanbabatas/LoviePay2/package.json`
- [X] T002 [P] Create static app entry point with module script and root mount element in `/Users/cihanbabatas/LoviePay2/index.html`
- [X] T003 [P] Create source and test directories with placeholder keep files in `/Users/cihanbabatas/LoviePay2/src/.gitkeep`, `/Users/cihanbabatas/LoviePay2/api/.gitkeep`, `/Users/cihanbabatas/LoviePay2/tests/api/.gitkeep`, and `/Users/cihanbabatas/LoviePay2/tests/e2e/.gitkeep`
- [X] T004 [P] Configure Playwright desktop test settings for Chromium only in `/Users/cihanbabatas/LoviePay2/playwright.config.js`
- [X] T005 [P] Document required Supabase environment variables in `/Users/cihanbabatas/LoviePay2/.env.example`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared mock data, backend validation primitives, Supabase schema contract, and app shell that all user stories need.

**CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Create demo user, active friends, inactive friend, and receiver account fixtures in `/Users/cihanbabatas/LoviePay2/src/mock-data.js`
- [X] T007 Implement shared amount parsing, active-recipient lookup, self-recipient exclusion, receiver-account lookup, and currency derivation helpers in `/Users/cihanbabatas/LoviePay2/src/payment-request.js`
- [X] T008 Implement backend Supabase client initialization that reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` only on the server in `/Users/cihanbabatas/LoviePay2/api/supabase-client.js`
- [X] T009 Implement backend create-request validation helpers and stable error codes in `/Users/cihanbabatas/LoviePay2/api/payment-request-validation.js`
- [X] T010 Create Supabase `payment_requests` table SQL with amount, status, hash uniqueness, and recommended indexes in `/Users/cihanbabatas/LoviePay2/supabase/payment-requests.sql`
- [X] T011 [P] Build base responsive CSS tokens, shell layout, form controls, validation, empty, loading, error, and success state styles in `/Users/cihanbabatas/LoviePay2/src/styles.css`
- [X] T012 Create app bootstrap that renders mock sign-in and prevents unrelated navigation links in `/Users/cihanbabatas/LoviePay2/src/main.js`
- [X] T013 Create a syntax-check script for app, API, and test JavaScript files in `/Users/cihanbabatas/LoviePay2/scripts/check-js.mjs`

**Checkpoint**: Foundation ready - user story implementation can now begin in priority order or in parallel by separate owners.

---

## Phase 3: User Story 1 - Create a Valid Payment Request (Priority: P1) MVP

**Goal**: A demo user can sign in, select an active recipient, choose a receiver account, enter a valid amount and optional note, submit the request, and see a pending request confirmation with a public shareable link.

**Independent Test**: Sign in with mock credentials, choose an active friend and receiver account, enter an amount greater than zero and less than 1,000,000, submit, and verify the backend returns and the UI shows a pending request with sender, recipient, amount, derived currency, unique hash, and shareable link.

### Tests for User Story 1

- [X] T014 [P] [US1] Add backend success tests for valid request creation, pending status, derived currency, generated hash, shareable link, and Supabase insert payload in `/Users/cihanbabatas/LoviePay2/tests/api/payment-requests.validation.test.js`
- [X] T015 [P] [US1] Add desktop Playwright happy-path test for mock sign-in through success confirmation in `/Users/cihanbabatas/LoviePay2/tests/e2e/create-payment-request.desktop.spec.js`

### Implementation for User Story 1

- [X] T016 [US1] Implement `POST /api/payment-requests` handler with backend sender derivation, validation, unique hash generation, shareable link generation, and Supabase insert in `/Users/cihanbabatas/LoviePay2/api/payment-requests.js`
- [X] T017 [US1] Implement browser API client for create-request submission and backend error mapping in `/Users/cihanbabatas/LoviePay2/src/request-api.js`
- [X] T018 [US1] Implement mock sign-in success path, sidebar user details, receiver account selection, derived currency display, amount input, optional note, submit loading state, creation error state, and success confirmation in `/Users/cihanbabatas/LoviePay2/src/main.js`
- [X] T019 [US1] Add valid-request form composition and client-side pre-submit validation integration in `/Users/cihanbabatas/LoviePay2/src/payment-request.js`
- [X] T020 [US1] Wire accessible success, loading, and creation error visual states for the valid request flow in `/Users/cihanbabatas/LoviePay2/src/styles.css`

**Checkpoint**: User Story 1 is fully functional and independently testable as the MVP.

---

## Phase 4: User Story 2 - Find and Select a Recipient (Priority: P2)

**Goal**: A demo user can search active friends by name, email, or phone, select exactly one recipient, and see the selected recipient reflected in the form while the current demo user never appears.

**Independent Test**: Use known name, email, and phone fragments from mock friends and verify matching active friends appear, the demo user is excluded, no-match searches show an empty state, and selecting a result updates the payment request form.

### Tests for User Story 2

- [X] T021 [P] [US2] Add unit tests for friend search by name, email, phone, active-only filtering, current-user exclusion, and empty results in `/Users/cihanbabatas/LoviePay2/tests/api/payment-requests.validation.test.js`
- [X] T022 [P] [US2] Add desktop Playwright tests for recipient search, empty state, exact single selection, and selected-recipient display in `/Users/cihanbabatas/LoviePay2/tests/e2e/create-payment-request.desktop.spec.js`

### Implementation for User Story 2

- [X] T023 [US2] Implement recipient search helpers for normalized name, email, and phone matching with active-only and self-exclusion filtering in `/Users/cihanbabatas/LoviePay2/src/payment-request.js`
- [X] T024 [US2] Implement recipient search input, result list, empty state, and single-selection behavior in `/Users/cihanbabatas/LoviePay2/src/main.js`
- [X] T025 [US2] Add recipient result, selected-recipient, and empty-state styling that works in desktop, tablet, and mobile layouts in `/Users/cihanbabatas/LoviePay2/src/styles.css`

**Checkpoint**: User Story 2 works independently and can be validated without creating a request.

---

## Phase 5: User Story 3 - Prevent Invalid Requests (Priority: P3)

**Goal**: Invalid requests are blocked with clear feedback on the client and rejected by the backend before Supabase insert.

**Independent Test**: Attempt submissions with missing, zero, negative, non-numeric, and 1,000,000-or-greater amounts; missing, inactive, nonexistent, and self recipients; missing receiver accounts; unsupported currencies; and forbidden client-provided derived fields, then verify no request is created.

### Tests for User Story 3

- [X] T026 [P] [US3] Add backend rejection tests for invalid amount, missing recipient, nonexistent recipient, inactive recipient, self recipient, missing receiver account, nonexistent receiver account, unsupported currency, and forbidden client-derived fields in `/Users/cihanbabatas/LoviePay2/tests/api/payment-requests.validation.test.js`
- [X] T027 [P] [US3] Add desktop Playwright tests for invalid amount messages, missing recipient message, missing receiver account message, and no-success-state behavior in `/Users/cihanbabatas/LoviePay2/tests/e2e/create-payment-request.desktop.spec.js`

### Implementation for User Story 3

- [X] T028 [US3] Harden backend validation to reject bypassed client fields for sender, currency, status, hash, shareable link, created time, and malformed payloads before Supabase insert in `/Users/cihanbabatas/LoviePay2/api/payment-request-validation.js`
- [X] T029 [US3] Return stable backend error responses with `invalid_amount`, `recipient_required`, `recipient_not_found`, `recipient_inactive`, `self_recipient_not_allowed`, `receiver_account_required`, `receiver_account_not_found`, `unsupported_currency`, and `request_creation_failed` codes in `/Users/cihanbabatas/LoviePay2/api/payment-requests.js`
- [X] T030 [US3] Add client-side validation messages for amount, recipient, receiver account, inactive recipient, self recipient, and unsupported account currency in `/Users/cihanbabatas/LoviePay2/src/main.js`
- [X] T031 [US3] Style inline validation feedback so errors remain readable without overlap on desktop, tablet, and mobile in `/Users/cihanbabatas/LoviePay2/src/styles.css`

**Checkpoint**: User Story 3 is independently testable and all invalid direct backend attempts are rejected before storage.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, responsiveness, documentation, and performance checks across all completed stories.

- [X] T032 [P] Update quickstart implementation notes with mock credentials, local dev command, and Supabase SQL setup steps in `/Users/cihanbabatas/LoviePay2/specs/001-create-payment-request/quickstart.md`
- [X] T033 Run JavaScript syntax checks and fix any reported issues in `/Users/cihanbabatas/LoviePay2/package.json`, `/Users/cihanbabatas/LoviePay2/src/main.js`, `/Users/cihanbabatas/LoviePay2/src/payment-request.js`, `/Users/cihanbabatas/LoviePay2/src/request-api.js`, `/Users/cihanbabatas/LoviePay2/api/payment-requests.js`, `/Users/cihanbabatas/LoviePay2/api/payment-request-validation.js`, and `/Users/cihanbabatas/LoviePay2/api/supabase-client.js`
- [X] T034 Run backend validation tests and fix any failures in `/Users/cihanbabatas/LoviePay2/tests/api/payment-requests.validation.test.js`
- [X] T035 Run desktop Playwright tests and fix any failures in `/Users/cihanbabatas/LoviePay2/tests/e2e/create-payment-request.desktop.spec.js`
- [X] T036 Manually verify tablet and mobile responsive behavior and record results in `/Users/cihanbabatas/LoviePay2/specs/001-create-payment-request/quickstart.md`
- [X] T037 Verify recipient search returns matching results or empty state within 1 second and record any optimization notes in `/Users/cihanbabatas/LoviePay2/specs/001-create-payment-request/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately.
- **Foundational (Phase 2)**: Depends on Setup completion and blocks all user story work.
- **User Stories (Phases 3-5)**: Depend on Foundational completion.
- **Polish (Phase 6)**: Depends on all desired user stories being complete.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational and is the suggested MVP.
- **User Story 2 (P2)**: Can start after Foundational and can be tested independently through search and selection; it integrates naturally into the US1 form.
- **User Story 3 (P3)**: Can start after Foundational and can be tested independently through invalid submissions and direct backend validation.

### Within Each User Story

- Write automated tests first and confirm they fail before implementation where practical.
- Complete shared helpers before UI and endpoint wiring.
- Complete implementation before integration and checkpoint verification.
- Keep each story independently demonstrable before moving to the next priority.

---

## Parallel Opportunities

- Setup tasks T002-T005 can run in parallel after T001 ownership is clear.
- Foundational style work T011 and syntax script T013 can run in parallel with backend foundation tasks T008-T010 after T006-T007 are defined.
- US1 tests T014-T015 can run in parallel before US1 implementation.
- US2 tests T021-T022 can run in parallel before US2 implementation.
- US3 tests T026-T027 can run in parallel before US3 implementation.
- After Phase 2, US1, US2, and US3 can be assigned to separate developers if they coordinate changes to `/Users/cihanbabatas/LoviePay2/src/main.js`, `/Users/cihanbabatas/LoviePay2/src/payment-request.js`, and `/Users/cihanbabatas/LoviePay2/src/styles.css`.

---

## Parallel Example: User Story 1

```bash
Task: "T014 [P] [US1] Add backend success tests for valid request creation, pending status, derived currency, generated hash, shareable link, and Supabase insert payload in /Users/cihanbabatas/LoviePay2/tests/api/payment-requests.validation.test.js"
Task: "T015 [P] [US1] Add desktop Playwright happy-path test for mock sign-in through success confirmation in /Users/cihanbabatas/LoviePay2/tests/e2e/create-payment-request.desktop.spec.js"
```

## Parallel Example: User Story 2

```bash
Task: "T021 [P] [US2] Add unit tests for friend search by name, email, phone, active-only filtering, current-user exclusion, and empty results in /Users/cihanbabatas/LoviePay2/tests/api/payment-requests.validation.test.js"
Task: "T022 [P] [US2] Add desktop Playwright tests for recipient search, empty state, exact single selection, and selected-recipient display in /Users/cihanbabatas/LoviePay2/tests/e2e/create-payment-request.desktop.spec.js"
```

## Parallel Example: User Story 3

```bash
Task: "T026 [P] [US3] Add backend rejection tests for invalid amount, missing recipient, nonexistent recipient, inactive recipient, self recipient, missing receiver account, nonexistent receiver account, unsupported currency, and forbidden client-derived fields in /Users/cihanbabatas/LoviePay2/tests/api/payment-requests.validation.test.js"
Task: "T027 [P] [US3] Add desktop Playwright tests for invalid amount messages, missing recipient message, missing receiver account message, and no-success-state behavior in /Users/cihanbabatas/LoviePay2/tests/e2e/create-payment-request.desktop.spec.js"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup.
2. Complete Phase 2: Foundational.
3. Complete Phase 3: User Story 1.
4. Stop and validate User Story 1 independently with backend success tests and the desktop happy path.
5. Demo the mock sign-in to pending payment request confirmation flow.

### Incremental Delivery

1. Complete Setup and Foundational work.
2. Add US1 to create valid pending payment requests.
3. Add US2 to improve recipient search and selection.
4. Add US3 to harden invalid request prevention.
5. Finish polish checks across syntax, backend tests, desktop Playwright, and manual responsive verification.

### Parallel Team Strategy

1. Complete Setup and Foundational work together.
2. Assign US1 backend create flow, US2 recipient search, and US3 validation hardening to separate owners.
3. Coordinate shared file edits before merging story work.
4. Run final cross-story verification from Phase 6.

---

## Notes

- Demo user, friends, and receiver accounts remain mock data in `/Users/cihanbabatas/LoviePay2/src/mock-data.js`.
- Only system-generated payment request records are stored in Supabase.
- Backend validation must reject invalid direct calls before Supabase insert.
- Tablet and mobile verification is manual by plan; desktop Playwright is the only automated browser target.
