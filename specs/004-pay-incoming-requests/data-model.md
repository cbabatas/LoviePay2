# Data Model: Pay Incoming Payment Requests

## Current User

Represents the acting demo user and payer for incoming requests.

- `id`: Stable user identifier. Must match `payment_requests.recipient_id` for payable incoming records.
- `fullName`: Display name used in the app shell.
- `email`: Demo sign-in identifier.
- `sourceAccounts`: User-owned funding accounts. This can extend the existing `receiverAccounts` demo data shape if the implementation keeps one account list.

## Incoming Payment Request

Supabase-backed request record where `recipient_id` equals the current user's `id`.

- `id`: UUID primary key.
- `sender_id`: User expecting payment. Required.
- `recipient_id`: Current user/payer id. Required.
- `receiver_account_id`: Account designated by the sender for receiving the requested payment.
- `amount`: Numeric amount greater than 0 and less than 1,000,000.
- `currency`: Supported currency.
- `note`: Optional request note.
- `status`: Stored lifecycle value. Allowed values after this feature: `pending`, `withdrawn`, `declined`, `expired`, `paid`.
- `hash`: Unique public hash from creation.
- `shareable_link`: Link derived from `hash`.
- `created_at`: Creation timestamp.
- `updated_at`: Last server-side lifecycle update timestamp.

### State Transitions

```text
pending -> paid            (payer confirms payment; server validates and commits)
pending -> declined        (existing incoming-management flow)
pending -> expired         (existing read-time expiry promotion)
pending -> withdrawn       (existing outgoing sender flow)
```

Rules:

- Only `pending` incoming requests can be paid.
- `paid`, `declined`, `expired`, and `withdrawn` are terminal for the Pay flow and must not expose Pay actions.
- The payment operation must re-check status immediately before mutation. If a request changed while the user was viewing it, payment fails without balance, transaction, or ledger changes.
- After successful payment, both incoming and outgoing views must show `paid`.

## Source Account

User-owned account eligible to fund a payment.

- `id`: Stable account identifier.
- `owner_id`: Must equal the current user id for Pay eligibility.
- `display_name`/`label`: User-facing account label.
- `currency`: Must match the payment request currency.
- `balance`: Current available balance in the account currency.
- `account_code`: Accounting code used on ledger entries.
- `updated_at`: Last balance update timestamp when persisted.

Validation:

- Eligible accounts are current-user accounts where `currency === payment_request.currency`.
- Exactly one eligible account is selected by default.
- More than one eligible account requires explicit selection before confirmation.
- No matching-currency account blocks payment.
- Balance must be greater than or equal to request amount immediately before processing.
- A balance exactly equal to the request amount is valid and results in zero balance.

## Payment Confirmation

Transient UI state for the Pay flow.

- `requestId`: Incoming payment request being paid.
- `source`: `list` or `detail`.
- `selectedAccountId`: Source account chosen by the user.
- `confirmed`: Boolean user decision.
- `processing`: Boolean state shown for 2-3 seconds after confirmation.

Rules:

- The confirmation view must show selected source account, request amount, currency, sender/recipient context, and final action.
- Confirmation is disabled until a valid eligible account is selected.
- Repeated clicks/taps are ignored while `processing` is true.

## Payment Transaction

Auditable record for one successful request payment.

- `id`: UUID primary key.
- `payment_request_id`: References `payment_requests.id`. Unique for successful request payments.
- `type`: Must be `payment` for this feature.
- `amount`: Payment amount.
- `currency`: Payment currency.
- `status`: `succeeded` for committed simulated payments.
- `source_account_id`: Account debited from the current user.
- `created_at`: Transaction creation timestamp.

Rules:

- Exactly one successful payment transaction may exist per payment request.
- A duplicate payment attempt must not create another successful transaction.

## Ledger Entry

Accounting entry associated with a payment transaction.

- `id`: UUID primary key.
- `transaction_id`: References `payment_transactions.id`.
- `account_id`: Account or accounting account affected by the entry.
- `entry_type`: `debit` or `credit`.
- `amount`: Entry amount.
- `currency`: Entry currency.
- `account_code`: Accounting code for reconciliation.
- `created_at`: Entry creation timestamp.

Rules:

- Each successful payment transaction must have at least one debit and at least one credit entry.
- For each transaction, total debit amount must equal total credit amount in the transaction currency.
- If ledger creation fails, the request remains unpaid and the source account balance remains unchanged.

## Payment Error State

Server-sourced error state rendered in list/detail/confirmation surfaces.

- `code`: Stable error code.
- `message`: User-facing explanation.
- `paymentRequest`: Optional latest request state when the request changed during payment.
- `account`: Optional latest account state for balance failures.

Rules:

- Insufficient balance leaves request and account unchanged.
- Non-pending request leaves request, account, transaction, and ledger records unchanged.
- Any failure before completion leaves all payment-related records as they were before the attempt.
