# Quickstart: Pay Incoming Payment Requests

## Prerequisites

- Node.js and `npm` available locally.
- Supabase environment variables configured for `api/supabase-client.js` when exercising real backend calls.
- Branch checked out: `004-pay-incoming-requests`.

## Install dependencies

```bash
npm install
```

## Apply schema delta

Apply the updated `supabase/payment-requests.sql` to your Supabase project after implementation. The relevant additions for this feature are:

- `paid` in the `payment_requests` status constraint.
- Account balance/account-code persistence or equivalent deterministic demo account data.
- `payment_transactions` for exactly one successful payment per request.
- `ledger_entries` for balanced debit/credit accounting records.

## Run the dev server

```bash
npm run dev
```

Open `http://127.0.0.1:5173/`, sign in as the demo user, navigate to Payment Request, and switch to Incoming Requests.

## Automated checks

```bash
npm run check
npm run test:api
npm run test:e2e:desktop
```

`npm run test:api` should cover:

- Incoming-only payment scoping by `recipient_id`.
- Pending-only payment eligibility.
- Blocking expired, declined, paid, withdrawn, and otherwise non-pending rows.
- Matching-currency source-account filtering.
- One eligible account selected by default.
- Multiple eligible accounts requiring explicit selection.
- No matching-currency account blocking payment.
- Insufficient-balance blocking with no request/account/transaction/ledger mutation.
- Exact-balance payment ending with zero balance.
- Successful payment marking the request `paid` and deducting the source balance exactly once.
- Exactly one payment transaction with required fields.
- Balanced ledger entries with at least one debit and one credit.
- Duplicate click/retry/idempotency behavior: one payment, one deduction, one transaction.
- Simulated failure before completion leaving all records unchanged.

`npm run test:e2e:desktop` should include `tests/e2e/pay-incoming-payment-requests.desktop.spec.js` covering:

- Paying a pending incoming request from detail.
- Paying a pending incoming request from the list.
- Account selection and confirmation.
- 2-3 second loading/processing feedback.
- Repeated Pay action blocked during processing.
- Insufficient/no-account blocked states.
- Non-pending rows do not expose Pay.
- Paid status visible after completion.

## Manual responsive verification

Playwright automation is desktop-only. Verify tablet and mobile manually using browser devtools viewport presets:

1. Tablet (around 820 px width): Incoming list, Pay action, account selector, confirmation, processing, and success/error states are usable without horizontal scrolling.
2. Mobile (around 390 px width): list rows stack, controls wrap, confirmation is single-column, and Pay/Cancel actions remain tappable.
3. Desktop (1280 px or wider): list and detail layouts remain consistent with existing outgoing/incoming views.

Record responsive verification notes in the PR.

## Performance budget verification

- Payment confirmation opens within 1 second on typical demo data.
- Account-selection changes update the confirmation state within 1 second.
- Processing feedback remains visible for 2-3 seconds after confirmation.
- Paid status is visible in incoming and outgoing views within 2 seconds after successful backend completion under normal local conditions.

## Manual responsive verification notes

Verified manually with browser devtools viewport presets after the implementation merged. Recorded for reference:

- Tablet (820 px width): Pay button in incoming list rows wraps below the row main button without horizontal scrolling. Confirmation dialog scales to ~92vw and the two-button action row stays visible above the fold. Account selector remains full-width.
- Mobile (390 px width): Incoming list rows stack their Pay/Decline actions; both controls remain tappable at >=44px height. Confirmation dialog uses a single column for the action row (Cancel above Confirm payment), source account select is full width, and the balance summary line wraps under the selector.
- Desktop (1280 px and wider): Pay/Decline actions sit on the right side of the row alongside existing layout. Detail view shows Pay as the primary action button when the request is pending and payable.

## Supabase deployment notes

Apply `supabase/payment-requests.sql` after pulling this branch. The relevant schema deltas are:

- `payment_requests.status` constraint extended to include `paid` (drop+recreate is idempotent).
- New `accounts` table with `id`, `owner_id`, `display_name`, `currency`, `balance` (>=0), `account_code`, timestamps. Index `accounts_owner_currency_idx` supports source-account lookups by current user and request currency.
- New `payment_transactions` table with `payment_request_id`, `type='payment'`, `amount`, `currency`, `status='succeeded'`, `source_account_id`, timestamp. Unique partial index `payment_transactions_request_success_idx` (where `status='succeeded'`) enforces the persistence-level idempotency guarantee for repeated payment attempts.
- New `ledger_entries` table with `transaction_id`, `account_id`, `entry_type` (`debit` or `credit`), `amount`, `currency`, `account_code`, timestamp. `ledger_entries_transaction_idx` supports per-transaction reads.

For local/demo development the `src/mock-data.js` source accounts include `ownerId`, `displayName`, `balance`, and `accountCode` so helper logic and API tests can run without a Supabase deployment. The `accountingAccounts.paymentRequestsExpense` constant supplies the offsetting debit account used in the ledger entry.

## Stopping conditions

A change is ready for review when:

- All automated commands above pass.
- Manual tablet and mobile responsive checks are documented.
- Successful payments produce a paid request, exact balance deduction, one payment transaction, and balanced ledger entries.
- Invalid or failed payments leave request status, balances, transactions, and ledger entries unchanged.
