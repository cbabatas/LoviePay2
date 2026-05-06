# Tasks: Pay Incoming Payment Requests

**Input**: Design documents from `/Users/cihanbabatas/LoviePay2/specs/004-pay-incoming-requests/`
**Prerequisites**: `plan.md`, `spec.md`, `research.md`, `data-model.md`, `contracts/`, `quickstart.md`
**Tests**: Automated API and desktop Playwright tasks are included because the feature specification and quickstart explicitly require them. Tablet and mobile responsive behavior is covered by manual verification tasks because Playwright automation is desktop-only for this feature.

**Organization**: Tasks are grouped by user story so each story can be implemented and verified independently after the shared foundation is complete.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel because it touches different files or only adds independent tests/notes
- **[Story]**: User story label for traceability (`US1`, `US2`, `US3`, `US4`)
- Every task description includes exact file paths

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish the feature work surface and executable test entry points.

- [X] T001 [P] Review feature scope and required commands in specs/004-pay-incoming-requests/plan.md and package.json
- [X] T002 [P] Create desktop pay-flow Playwright spec scaffold with reusable fixtures in tests/e2e/pay-incoming-payment-requests.desktop.spec.js

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared payment status, account, API, and test infrastructure that must exist before user story implementation begins.

**Critical**: No user story implementation should begin until this phase is complete.

- [X] T003 Update paid status, account balance fields, payment_transactions table, ledger_entries table, indexes, and idempotency constraints in supabase/payment-requests.sql
- [X] T004 [P] Extend demo source-account data with ownerId/displayName/balance/accountCode fields and accounting seed collections in src/mock-data.js
- [X] T005 [P] Add paid status, payment error messages, source-account eligibility helpers, and payability helpers in src/payment-request.js
- [X] T006 [P] Add payIncomingPaymentRequest client function and payment error mapping support in src/request-api.js
- [X] T007 Add reusable multi-table Supabase/accounting mock helpers for payment tests in tests/api/payment-requests.validation.test.js
- [X] T008 Add shared pay-operation structure for request/account/transaction/ledger shaping in api/payment-requests.js

**Checkpoint**: Foundation ready; user story phases can start.

---

## Phase 3: User Story 1 - Pay a Pending Incoming Request (Priority: P1) MVP

**Goal**: A current user can pay a pending incoming request from the list or detail view, see a 2-3 second processing state, and see the request become paid with the selected balance reduced.

**Independent Test**: Open a pending incoming request for the demo user, initiate Pay from list and detail, confirm with one eligible account, verify processing feedback, paid status, and exact balance deduction.

### Tests for User Story 1

- [X] T009 [P] [US1] Add API tests for successful pending payment, balance deduction, and paid request status in tests/api/payment-requests.validation.test.js
- [X] T010 [P] [US1] Add desktop e2e tests for paying from incoming list and detail with visible 2-3 second processing in tests/e2e/pay-incoming-payment-requests.desktop.spec.js

### Implementation for User Story 1

- [X] T011 [US1] Implement PATCH /api/payment-requests/:id/pay routing, confirm=true validation, and current-user incoming scoping in api/payment-requests.js
- [X] T012 [US1] Implement pending request status update to paid and exact source balance deduction in api/payment-requests.js
- [X] T013 [US1] Add incoming list/detail Pay buttons and payment confirmation dialog state in src/main.js
- [X] T014 [US1] Wire Pay confirm/cancel behavior, 2-3 second simulated processing, and repeated-click blocking in src/main.js
- [X] T015 [US1] Add payment confirmation, processing, success, and responsive dialog styles in src/styles.css
- [X] T016 [US1] Update incoming list/detail in-memory request and account state after successful payment in src/main.js
- [X] T017 [US1] Run US1 coverage with package.json scripts and record any deviations against specs/004-pay-incoming-requests/quickstart.md

**Checkpoint**: US1 is independently functional and testable as the MVP.

---

## Phase 4: User Story 2 - Choose an Eligible Source Account (Priority: P2)

**Goal**: The user sees only current-user accounts matching the request currency, gets automatic selection when exactly one account is eligible, and must select an account when multiple are eligible.

**Independent Test**: Use EUR, USD, and GBP demo accounts to verify only matching-currency accounts appear; one eligible account defaults; multiple eligible accounts require selection; no matching account blocks confirmation.

### Tests for User Story 2

- [X] T018 [P] [US2] Add API/helper tests for currency filtering, one-account defaulting, multi-account selection requirement, and no matching account blocking in tests/api/payment-requests.validation.test.js
- [X] T019 [P] [US2] Add desktop e2e tests for matching-currency account selection, default selection, disabled confirmation, and no-account state in tests/e2e/pay-incoming-payment-requests.desktop.spec.js

### Implementation for User Story 2

- [X] T020 [US2] Implement current-user source-account lookup and request-currency eligibility filtering in api/payment-requests.js
- [X] T021 [US2] Implement account eligibility, default-selection, and confirm-enabled helper logic in src/payment-request.js
- [X] T022 [US2] Render eligible account selector, selected balance summary, and no-matching-account blocked state in src/main.js
- [X] T023 [US2] Add responsive account selector, balance summary, and no-account styles in src/styles.css
- [X] T024 [US2] Preserve selected source account state across dialog re-renders and request refreshes in src/main.js
- [X] T025 [US2] Run US2 targeted checks with package.json scripts and compare results to specs/004-pay-incoming-requests/quickstart.md

**Checkpoint**: US2 account selection behavior works independently without breaking US1.

---

## Phase 5: User Story 3 - Block Ineligible or Unsafe Payments (Priority: P2)

**Goal**: Non-pending, stale, underfunded, cross-currency, and failed payment attempts are blocked without changing request status, balances, transactions, or ledger entries.

**Independent Test**: Attempt to pay declined, expired, paid, withdrawn, stale, no-account, insufficient-balance, exact-balance, and simulated-failure requests; verify only the exact-balance case can complete and all blocked cases leave data unchanged.

### Tests for User Story 3

- [X] T026 [P] [US3] Add API tests for non-pending status blocking, stale status refresh, insufficient balance, exact-balance success, and simulated failure without partial mutation in tests/api/payment-requests.validation.test.js
- [X] T027 [P] [US3] Add desktop e2e tests for non-pending rows hiding Pay, insufficient/no-account errors, and retry blocking in tests/e2e/pay-incoming-payment-requests.desktop.spec.js

### Implementation for User Story 3

- [X] T028 [US3] Enforce pending-only eligibility and expiry freshness checks immediately before payment mutation in api/payment-requests.js
- [X] T029 [US3] Enforce selected account ownership, currency match, sufficient balance, and exact-balance allowance in api/payment-requests.js
- [X] T030 [US3] Implement payment commit failure handling that returns payment_processing_failed without retaining partial changes in api/payment-requests.js
- [X] T031 [US3] Hide Pay actions for non-pending incoming list/detail rows and render latest terminal status in src/main.js
- [X] T032 [US3] Render server-sourced payment error and blocked states in list/detail/confirmation surfaces in src/main.js
- [X] T033 [US3] Add blocked, insufficient-balance, stale-status, and failure visual states for payment UI in src/styles.css
- [X] T034 [US3] Run unsafe-payment checks with package.json scripts and compare results to specs/004-pay-incoming-requests/quickstart.md

**Checkpoint**: US3 invalid-payment protection works independently and preserves US1/US2 behavior.

---

## Phase 6: User Story 4 - Preserve Accounting Consistency (Priority: P3)

**Goal**: Every successful payment creates exactly one payment transaction, balanced debit/credit ledger entries, and no duplicate balance deductions or transactions on retries.

**Independent Test**: Complete one payment and verify one transaction with required fields, at least one debit and one credit ledger entry, balanced totals, paid status in incoming/outgoing views, and idempotent duplicate attempts.

### Tests for User Story 4

- [X] T035 [P] [US4] Add API tests for payment transaction field completeness, balanced debit/credit ledger entries, and duplicate idempotency in tests/api/payment-requests.validation.test.js
- [X] T036 [P] [US4] Add desktop e2e test proving duplicate clicks submit one pay request and leave one paid state in tests/e2e/pay-incoming-payment-requests.desktop.spec.js

### Implementation for User Story 4

- [X] T037 [US4] Create exactly one succeeded payment transaction per paid request and return shaped transaction data in api/payment-requests.js
- [X] T038 [US4] Create balanced debit and credit ledger entries with source and offset account codes in api/payment-requests.js
- [X] T039 [US4] Implement idempotent duplicate handling for repeated pay submissions and retries in api/payment-requests.js
- [X] T040 [US4] Add paid status formatting, filtering, and payability behavior for incoming and outgoing helpers in src/payment-request.js
- [X] T041 [US4] Refresh shared request state so incoming and outgoing views show paid after payment completion in src/main.js
- [X] T042 [US4] Add paid status options/chips to incoming and outgoing views and styles in src/main.js and src/styles.css
- [X] T043 [US4] Run accounting and idempotency checks with package.json scripts and compare results to specs/004-pay-incoming-requests/quickstart.md

**Checkpoint**: US4 accounting and idempotency invariants are independently verified.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final verification, responsive checks, and cleanup across the full feature.

- [X] T044 [P] Add manual tablet and mobile responsive verification notes for 820px and 390px widths in specs/004-pay-incoming-requests/quickstart.md
- [X] T045 [P] Add Supabase deployment notes for paid status, accounts, transactions, and ledger schema changes in specs/004-pay-incoming-requests/quickstart.md
- [X] T046 Run npm run check via package.json and fix reported JavaScript issues in src/main.js
- [X] T047 Run npm run test:api via package.json and fix payment API regressions in tests/api/payment-requests.validation.test.js
- [ ] T048 Run npm run test:e2e:desktop via package.json and fix pay-flow regressions in tests/e2e/pay-incoming-payment-requests.desktop.spec.js
- [X] T049 [P] Review payment UI at desktop/tablet/mobile widths and resolve overflow or wrapping defects in src/styles.css

---

## Dependencies & Execution Order

### Phase Dependencies

- Setup (Phase 1): No dependencies
- Foundational (Phase 2): Depends on Setup and blocks all user stories
- User Story 1 (Phase 3): Depends on Foundational
- User Story 2 (Phase 4): Depends on Foundational; can be implemented in parallel with US1 after shared helpers exist
- User Story 3 (Phase 5): Depends on Foundational; can be implemented in parallel but should be validated against US1/US2 behavior
- User Story 4 (Phase 6): Depends on Foundational; can be started after transaction/ledger schema exists, but final verification benefits from US1 payment completion
- Polish (Phase 7): Depends on the desired user stories being complete

### User Story Dependencies

- US1 (P1): No dependency on other stories after Phase 2; suggested MVP scope
- US2 (P2): No dependency on US1 for helper/API tests, but UI integration reuses the US1 confirmation dialog
- US3 (P2): No dependency on US2 for backend invalid-state protection, but UI blocked states integrate with US2 account selection
- US4 (P3): Depends on the pay operation from US1 and the server validation foundation; accounting can be tested independently through API helpers

### Within Each User Story

- Write automated tests first and confirm they fail for the missing behavior
- Implement backend validation and state transitions before wiring UI success states
- Implement helper/client functions before relying on them in `src/main.js`
- Complete story-specific verification before moving to the next priority when working sequentially

---

## Parallel Execution Examples

### User Story 1

```text
Task: T009 Add API tests in tests/api/payment-requests.validation.test.js
Task: T010 Add desktop e2e tests in tests/e2e/pay-incoming-payment-requests.desktop.spec.js
```

### User Story 2

```text
Task: T018 Add account eligibility API/helper tests in tests/api/payment-requests.validation.test.js
Task: T019 Add account selector desktop e2e tests in tests/e2e/pay-incoming-payment-requests.desktop.spec.js
```

### User Story 3

```text
Task: T026 Add unsafe-payment API tests in tests/api/payment-requests.validation.test.js
Task: T027 Add unsafe-payment desktop e2e tests in tests/e2e/pay-incoming-payment-requests.desktop.spec.js
```

### User Story 4

```text
Task: T035 Add accounting/idempotency API tests in tests/api/payment-requests.validation.test.js
Task: T036 Add duplicate-submit desktop e2e test in tests/e2e/pay-incoming-payment-requests.desktop.spec.js
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1 setup.
2. Complete Phase 2 foundation.
3. Complete Phase 3 / US1.
4. Stop and validate US1 using `npm run check`, `npm run test:api`, and the US1 desktop e2e coverage from `npm run test:e2e:desktop`.

### Incremental Delivery

1. Deliver US1 so pending incoming requests can be paid from list/detail.
2. Add US2 account eligibility and selection behavior.
3. Add US3 unsafe-payment blocking and no-partial-mutation guarantees.
4. Add US4 accounting and idempotency guarantees.
5. Finish Phase 7 responsive/manual verification and full regression checks.

### Parallel Team Strategy

1. One developer completes `supabase/payment-requests.sql` and `api/payment-requests.js` foundation.
2. One developer completes helper/client/UI wiring in `src/payment-request.js`, `src/request-api.js`, and `src/main.js`.
3. One developer adds API and desktop e2e coverage in `tests/api/payment-requests.validation.test.js` and `tests/e2e/pay-incoming-payment-requests.desktop.spec.js`.
4. Integrate by story checkpoints, starting with US1 MVP.

---

## Summary

- Total tasks: 49
- Setup tasks: 2
- Foundational tasks: 6
- US1 tasks: 9
- US2 tasks: 8
- US3 tasks: 9
- US4 tasks: 9
- Polish tasks: 6
- Parallel opportunities: 16 tasks marked `[P]`
- Suggested MVP scope: Phase 1 + Phase 2 + Phase 3 (US1)

## Independent Test Criteria

- US1: Pay a pending incoming request from list and detail; verify processing feedback, paid status, and exact balance deduction.
- US2: Verify matching-currency account filtering, single-account defaulting, multi-account required selection, and no-account blocking.
- US3: Verify non-pending, stale, insufficient, invalid-account, and simulated-failure attempts leave request/account/transaction/ledger state unchanged.
- US4: Verify one transaction, balanced ledger entries, paid status propagation, and idempotent duplicate submissions.

## Format Validation

All 49 tasks use the required checklist format: `- [ ] T### [P?] [US?] Description with file path`.
