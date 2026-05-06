# Backend API Contract: Pay Incoming Payment Requests

The existing payment request API continues to support create, outgoing management, and incoming management operations. This feature adds a recipient-scoped Pay operation in the same handler. The backend derives the current demo user from the existing current-user context and treats that user as the payer for incoming requests.

## List Incoming Requests

`GET /api/payment-requests?direction=incoming`

Existing incoming list behavior remains, but rows whose payment has completed return `status: "paid"`. Pending rows remain payable only if they are incoming for the current user and have not been promoted to another terminal status.

## Get Incoming Request Detail

`GET /api/payment-requests/:id?direction=incoming`

Existing incoming detail behavior remains, with `paid` included as a terminal status. Non-pending rows must not include or imply Pay eligibility.

## Pay Incoming Request

`PATCH /api/payment-requests/:id/pay`

Pays a current-user incoming request only when the request is still `pending`, the selected source account belongs to the current user, the account currency matches the request currency, and the account has sufficient balance.

### Request Body

```json
{
  "confirm": true,
  "sourceAccountId": "acct_eur_main"
}
```

### Success Response

```json
{
  "paymentRequest": {
    "id": "uuid",
    "senderId": "friend_001",
    "recipientId": "demo_user_001",
    "receiverAccountId": "friend_001_acct_eur",
    "amount": 88.0,
    "currency": "EUR",
    "note": "Concert ticket",
    "status": "paid",
    "hash": "unique-public-hash",
    "shareableLink": "/r/unique-public-hash",
    "createdAt": "2026-05-06T13:00:00.000Z",
    "updatedAt": "2026-05-06T13:05:00.000Z"
  },
  "sourceAccount": {
    "id": "acct_eur_main",
    "displayName": "Everyday EUR",
    "currency": "EUR",
    "balance": 412.0,
    "accountCode": "1000"
  },
  "paymentTransaction": {
    "id": "txn_uuid",
    "paymentRequestId": "uuid",
    "type": "payment",
    "amount": 88.0,
    "currency": "EUR",
    "status": "succeeded",
    "createdAt": "2026-05-06T13:05:00.000Z"
  },
  "ledgerEntries": [
    {
      "id": "ledger_debit_uuid",
      "transactionId": "txn_uuid",
      "accountId": "expense_payment_requests",
      "entryType": "debit",
      "amount": 88.0,
      "currency": "EUR",
      "accountCode": "5000",
      "createdAt": "2026-05-06T13:05:00.000Z"
    },
    {
      "id": "ledger_credit_uuid",
      "transactionId": "txn_uuid",
      "accountId": "acct_eur_main",
      "entryType": "credit",
      "amount": 88.0,
      "currency": "EUR",
      "accountCode": "1000",
      "createdAt": "2026-05-06T13:05:00.000Z"
    }
  ]
}
```

### Required Backend Behavior

- Resolve the current user and fetch the request where `id = :id` and `recipient_id = currentUser.id`.
- Run the same expiry/status freshness checks used by incoming management before payment eligibility is decided.
- Reject when the request is missing or not incoming for the current user.
- Reject when `confirm` is not `true`.
- Reject when the request status is not exactly `pending`.
- Fetch the selected source account and verify `owner_id = currentUser.id`.
- Reject when no source account is selected and more than one eligible account exists.
- Reject when no account exists for the selected id.
- Reject when the selected account currency differs from the request currency.
- Reject when the selected account balance is less than the request amount.
- Commit request status, account balance, payment transaction, and ledger entries as one all-or-nothing outcome.
- Enforce idempotency so one request cannot create more than one successful payment transaction or more than one balance deduction.

### Error Responses

Stable error codes for tests:

- `request_not_found`: Request does not exist or is not incoming for the current user.
- `payment_confirmation_required`: Confirmation was missing or false.
- `payment_not_allowed`: Request is not currently pending/payable.
- `source_account_required`: A source account must be selected.
- `source_account_not_found`: Selected source account does not exist or does not belong to the current user.
- `source_account_currency_mismatch`: Selected account currency does not match the request currency.
- `source_account_insufficient_balance`: Selected account balance is lower than the request amount.
- `payment_already_completed`: A successful payment transaction already exists for the request.
- `payment_processing_failed`: Payment commit failed before completion; no partial changes remain.

When the request changed during payment, the response SHOULD include the latest `paymentRequest` so the UI can refresh status.

## Routing Summary

| Method | Path                                           | Operation                 |
|--------|------------------------------------------------|---------------------------|
| POST   | `/api/payment-requests`                        | Create (existing)         |
| GET    | `/api/payment-requests?direction=outgoing`     | List outgoing (existing)  |
| GET    | `/api/payment-requests/:id?direction=outgoing` | Outgoing detail (existing)|
| PATCH  | `/api/payment-requests/:id/withdraw`           | Withdraw (existing)       |
| GET    | `/api/payment-requests?direction=incoming`     | List incoming (existing)  |
| GET    | `/api/payment-requests/:id?direction=incoming` | Incoming detail (existing)|
| PATCH  | `/api/payment-requests/:id/decline`            | Decline (existing)        |
| PATCH  | `/api/payment-requests/:id/pay`                | Pay incoming (new)        |
