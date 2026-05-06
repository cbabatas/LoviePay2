# Backend API Contract: Outgoing Payment Requests

The existing payment request API should continue to support create request behavior and add outgoing management operations. All outgoing operations derive the current user from the server-side demo user context.

## List Outgoing Requests

`GET /api/payment-requests?direction=outgoing`

Returns requests where `sender_id` equals the current demo user id. Incoming requests must not be returned.

### Success Response

```json
{
  "paymentRequests": [
    {
      "id": "uuid",
      "senderId": "demo_user_001",
      "recipientId": "friend_001",
      "receiverAccountId": "acct_eur_main",
      "amount": 125.5,
      "currency": "EUR",
      "note": "Dinner split",
      "status": "pending",
      "hash": "unique-public-hash",
      "shareableLink": "/r/unique-public-hash",
      "createdAt": "2026-05-06T12:00:00.000Z",
      "updatedAt": "2026-05-06T12:00:00.000Z"
    }
  ]
}
```

Ordering: newest first by `created_at`.

## Get Outgoing Request Detail

`GET /api/payment-requests/:id?direction=outgoing`

Returns one request only when it belongs to the current user as sender.

### Success Response

```json
{
  "paymentRequest": {
    "id": "uuid",
    "senderId": "demo_user_001",
    "recipientId": "friend_001",
    "receiverAccountId": "acct_eur_main",
    "amount": 125.5,
    "currency": "EUR",
    "note": "Dinner split",
    "status": "pending",
    "hash": "unique-public-hash",
    "shareableLink": "/r/unique-public-hash",
    "createdAt": "2026-05-06T12:00:00.000Z",
    "updatedAt": "2026-05-06T12:00:00.000Z"
  }
}
```

If the request does not exist or is not outgoing for the current user, return a not-found style response without exposing incoming request details.

## Withdraw Outgoing Request

`PATCH /api/payment-requests/:id/withdraw`

Withdraws a current-user outgoing request only when its current status is `pending`.

### Request Body

```json
{
  "confirm": true
}
```

### Success Response

```json
{
  "paymentRequest": {
    "id": "uuid",
    "senderId": "demo_user_001",
    "recipientId": "friend_001",
    "receiverAccountId": "acct_eur_main",
    "amount": 125.5,
    "currency": "EUR",
    "note": "Dinner split",
    "status": "withdrawn",
    "hash": "unique-public-hash",
    "shareableLink": "/r/unique-public-hash",
    "createdAt": "2026-05-06T12:00:00.000Z",
    "updatedAt": "2026-05-06T12:05:00.000Z"
  }
}
```

### Error Responses

Use stable error codes for tests:

- `request_not_found`: Request does not exist or is not outgoing for the current user.
- `withdraw_confirmation_required`: Confirmation was missing or false.
- `withdraw_not_allowed`: Request is not currently eligible for withdrawal.
- `request_update_failed`: Supabase update failed or returned an unexpected result.

The backend must preserve the existing status for all error cases.
