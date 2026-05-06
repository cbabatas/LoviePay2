# Feature Specification: Pay Incoming Payment Requests

**Feature Branch**: `004-pay-incoming-requests`  
**Created**: 2026-05-06  
**Status**: Draft  
**Epic**: LP-001 Payment Request Feature  
**Input**: User description: "Build a feature that allows users to process (pay) an incoming payment request."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Pay a Pending Incoming Request (Priority: P1)

As a user who received a payment request, I want to pay a pending incoming request after reviewing the payment details so the request is completed and no longer requires action.

**Why this priority**: Paying a pending incoming request is the primary business outcome of the feature and creates the minimum useful end-to-end flow.

**Independent Test**: Can be fully tested by opening a pending incoming request for the current user, initiating payment, confirming with an eligible account, and verifying the request becomes paid with the payer's balance updated.

**Acceptance Scenarios**:

1. **Given** a pending incoming request and one eligible account with the same currency and sufficient balance, **When** the user initiates payment from the detail page and confirms, **Then** the request is marked "paid", the account balance is reduced by the request amount, and the updated status is visible.
2. **Given** a pending incoming request appears in the incoming request list, **When** the user initiates payment from the list and confirms with an eligible account, **Then** the request is marked "paid" and the list reflects the new status.
3. **Given** the payment is processing, **When** the user views the payment action, **Then** a loading state is shown for 2 to 3 seconds and repeated payment actions are blocked until processing completes.

---

### User Story 2 - Choose an Eligible Source Account (Priority: P2)

As a user with multiple accounts, I want to see only accounts that match the request currency and choose which eligible account funds the payment so I do not accidentally pay from the wrong balance.

**Why this priority**: Account selection protects users from paying in the wrong currency or from the wrong source when multiple valid funding accounts exist.

**Independent Test**: Can be tested by preparing accounts in multiple currencies, opening a pending request, and verifying that only matching-currency accounts are available and selection is required only when more than one eligible account exists.

**Acceptance Scenarios**:

1. **Given** a pending EUR request and the user has EUR and USD accounts, **When** the user initiates payment, **Then** only EUR accounts are shown as eligible source accounts.
2. **Given** exactly one eligible account exists for the request currency, **When** the user initiates payment, **Then** that account is selected by default before confirmation.
3. **Given** more than one eligible account exists for the request currency, **When** the user initiates payment, **Then** the user must select one eligible account before the confirmation action can complete.
4. **Given** no eligible account exists for the request currency, **When** the user initiates payment, **Then** payment is blocked and the system explains that no matching-currency account is available.

---

### User Story 3 - Block Ineligible or Unsafe Payments (Priority: P2)

As a user, I need the system to prevent invalid payments so expired, declined, already paid, or underfunded requests cannot incorrectly move money or change status.

**Why this priority**: Financial correctness and user trust require the system to reject invalid payment attempts before balances or records change.

**Independent Test**: Can be tested by attempting payment on non-pending requests and pending requests with insufficient eligible balance, then verifying no request status, balance, transaction, or ledger change occurs.

**Acceptance Scenarios**:

1. **Given** an incoming request is expired, declined, or already paid, **When** the user views it in the list or detail page, **Then** the system does not offer a payment action.
2. **Given** a pending request and an eligible account with insufficient balance, **When** the user attempts to confirm payment with that account, **Then** payment is prevented, an insufficient-balance error is shown, and the request remains pending.
3. **Given** a payment attempt fails before completion, **When** the failure is reported, **Then** no partial balance deduction, paid status, transaction record, or ledger entry remains.

---

### User Story 4 - Preserve Accounting Consistency (Priority: P3)

As a business stakeholder, I need every successful payment to create auditable transaction and ledger records so account balances can be reconciled with payment request activity.

**Why this priority**: Accounting records are required for traceability and consistency, but they depend on the payment flow being valid and confirmed first.

**Independent Test**: Can be tested by completing one payment and verifying that exactly one payment transaction exists for the request, corresponding debit and credit ledger entries exist, and total debits equal total credits.

**Acceptance Scenarios**:

1. **Given** a pending request is successfully paid, **When** the payment completes, **Then** one transaction record is created for that payment request with the required payment attributes.
2. **Given** a successful payment transaction exists, **When** its ledger entries are reviewed, **Then** at least one debit entry and one credit entry exist and the total debit amount equals the total credit amount in the request currency.
3. **Given** the same payment request is submitted more than once through repeated user actions or retries, **When** processing completes, **Then** only one successful payment, one balance deduction, and one payment transaction are recorded for that request.

### Edge Cases

- If a request changes from pending to expired, declined, or paid while the user is viewing the list or detail page, payment must be blocked and the current status must be shown before any balance change occurs.
- If the user double-clicks, taps repeatedly, refreshes during processing, or retries the same request after a timeout, the same request must not be paid more than once.
- If the selected account balance becomes insufficient between account selection and confirmation, payment must be rejected with an insufficient-balance message.
- If an eligible account has a balance exactly equal to the request amount, payment is allowed and the resulting account balance is zero.
- If all matching-currency accounts are insufficient, the user can see that payment is unavailable because of insufficient balance and no account can complete confirmation.
- If a request currency has no matching user account, no cross-currency payment or conversion is offered.
- If accounting record creation cannot be completed, the request must remain unpaid and the source account balance must remain unchanged.
- If an outgoing view also displays the same request to the sender, it must reflect the paid status after successful processing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Users MUST be able to initiate payment for a pending incoming payment request from the incoming request detail page.
- **FR-002**: Users MUST be able to initiate payment for a pending incoming payment request directly from the incoming request list.
- **FR-003**: System MUST allow payment only when the request status is "pending".
- **FR-004**: System MUST prevent payment for expired, declined, paid, withdrawn, or otherwise non-pending requests and communicate that the request cannot be paid.
- **FR-005**: System MUST show only the current user's accounts whose currency matches the payment request currency as eligible source accounts.
- **FR-006**: System MUST prevent payment when no matching-currency source account exists.
- **FR-007**: System MUST automatically select the source account when exactly one eligible account exists.
- **FR-008**: System MUST require the user to select one eligible source account before confirmation when multiple eligible accounts exist.
- **FR-009**: System MUST show the selected source account, request amount, currency, and recipient/sender context before final confirmation.
- **FR-010**: System MUST validate that the selected source account has a balance greater than or equal to the request amount immediately before processing the payment.
- **FR-011**: System MUST prevent payment when the selected source account balance is insufficient and show a clear insufficient-balance error.
- **FR-012**: System MUST simulate payment processing with a visible loading state lasting 2 to 3 seconds.
- **FR-013**: System MUST block repeated payment submissions for the same request while payment processing is in progress.
- **FR-014**: System MUST deduct the payment amount from the selected source account balance only after all payment eligibility checks pass.
- **FR-015**: System MUST mark the payment request as "paid" after a successful payment.
- **FR-016**: System MUST reflect the paid status in both incoming and outgoing request views after successful payment.
- **FR-017**: Each successful payment MUST create exactly one payment transaction record for the payment request.
- **FR-018**: Each payment transaction record MUST include id, payment_request_id, type, amount, currency, status, and created_at.
- **FR-019**: The payment transaction type for this feature MUST identify the transaction as a payment.
- **FR-020**: Each successful payment transaction MUST create corresponding ledger entries.
- **FR-021**: Each ledger entry MUST include id, transaction_id, account_id, entry_type, amount, currency, account_code, and created_at.
- **FR-022**: Each successful payment transaction MUST include at least one debit ledger entry and at least one credit ledger entry.
- **FR-023**: For each payment transaction, total debit amount MUST equal total credit amount in the transaction currency.
- **FR-024**: Payment operations MUST be idempotent so the same payment request cannot create more than one successful payment transaction or more than one source-account balance deduction.
- **FR-025**: System MUST prevent duplicate payments caused by repeated clicks, repeated taps, refreshes, retries, or delayed responses.
- **FR-026**: System MUST ensure that request status, account balance, transaction record, and ledger entries are updated consistently as one completed payment outcome.
- **FR-027**: If payment processing fails at any point before completion, System MUST leave the request status, account balances, transaction records, and ledger entries as they were before the attempt.
- **FR-028**: System MUST provide consistent loading, success, blocked, and error states anywhere payment can be initiated or confirmed.
- **FR-029**: System MUST keep payment processing simulated and MUST NOT require or perform external payment, settlement, banking, or card-network integrations.

### Key Entities

- **Incoming Payment Request**: A payment request where the current user is the recipient. Key attributes include id, sender, recipient, amount, currency, status, creation date, and expiry-related details from the request lifecycle.
- **Source Account**: A user-owned account eligible to fund a payment when its currency matches the request currency. Key attributes include id, display name, currency, balance, and account code where available for ledger recording.
- **Payment Transaction**: The auditable record of a successful payment request payment. Required attributes are id, payment_request_id, type, amount, currency, status, and created_at.
- **Ledger Entry**: An accounting entry associated with a payment transaction. Required attributes are id, transaction_id, account_id, entry_type, amount, currency, account_code, and created_at.
- **Request Status**: The lifecycle state that determines payment eligibility. "Pending" is payable; expired, declined, paid, withdrawn, and any other non-pending states are not payable.
- **Payment Confirmation**: The user confirmation step that presents the chosen funding account and payment details before processing begins.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At least 90% of users can successfully pay a pending incoming request from the detail page in under 45 seconds during acceptance testing.
- **SC-002**: At least 90% of users can successfully pay a pending incoming request from the list in under 45 seconds during acceptance testing.
- **SC-003**: 100% of payment attempts for non-pending requests are blocked before any account balance, request status, transaction, or ledger record changes.
- **SC-004**: 100% of successful payments reduce the selected source account balance by exactly the request amount and mark the request paid.
- **SC-005**: 100% of successful payments create one payment transaction with all required transaction fields populated.
- **SC-006**: 100% of successful payment transactions create balanced ledger entries with at least one debit and one credit entry.
- **SC-007**: 100% of duplicate payment attempts for the same request result in no more than one successful payment, one balance deduction, and one payment transaction.
- **SC-008**: 100% of insufficient-balance payment attempts show a clear error and leave all balances and request statuses unchanged.
- **SC-009**: Payment processing feedback is visible for 2 to 3 seconds for 100% of confirmed payment attempts that begin processing.
- **SC-010**: Updated paid status is visible from both incoming and outgoing request views within 2 seconds after successful payment completion under normal conditions.

## Assumptions

- Users are already authenticated or represented by the existing demo user context before accessing incoming payment requests.
- The current user is the payer for incoming requests, and the sender of the request is the party expecting payment.
- Account balances and payment request statuses are denominated in a single currency per account/request; no currency conversion is included.
- The account used to record the offsetting ledger entry for the payment is available in the product's accounting configuration.
- A successful simulated payment is considered final for this feature; refunds, chargebacks, reversals, and external settlement are outside this feature unless introduced by a later specification.
- The existing incoming and outgoing request views are part of LP-001 and can display the shared request status after it changes to paid.
- User-facing dates and currency amounts follow the formatting conventions already used in the Payment Request experience.
