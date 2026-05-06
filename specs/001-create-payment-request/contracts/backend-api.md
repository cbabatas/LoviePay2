# Backend API Contract: Create Payment Request

This feature exposes one backend operation for creating payment requests. The backend validates every request before inserting a record into Supabase.

## Create Payment Request

`POST /api/payment-requests`

### Request Body

```json
{
  "recipientId": "friend_001",
  "receiverAccountId": "acct_001",
  "amount": 125.5,
  "note": "Dinner split"
}
```

The sender is derived from the mock current user on the backend and must not be accepted from client input.

### Backend Validation

The backend must reject the request before Supabase insert when:

- Amount is empty, non-numeric, zero, negative, or 1,000,000 or greater.
- Recipient does not exist in mock friend data.
- Recipient is inactive.
- Recipient is the current demo user.
- Current demo user appears as a friend record.
- Receiver account does not exist in mock receiver account data.
- Receiver account has no supported currency.
- Client attempts to provide or override currency, status, sender, hash, shareable link, or created time.

The backend must derive:

- `senderId` from the mock current user.
- `currency` from the selected receiver account.
- `status` as `pending`.
- `hash` as a unique value.
- `shareableLink` from the unique hash.
- `createdAt` from the server time.

### Success Response

```json
{
  "paymentRequest": {
    "id": "uuid",
    "senderId": "demo_user_001",
    "recipientId": "friend_001",
    "receiverAccountId": "acct_001",
    "amount": 125.5,
    "currency": "EUR",
    "note": "Dinner split",
    "status": "pending",
    "hash": "unique-public-hash",
    "shareableLink": "/r/unique-public-hash",
    "createdAt": "2026-05-06T12:00:00.000Z"
  }
}
```

### Error Response

```json
{
  "error": {
    "code": "invalid_amount",
    "message": "Amount must be greater than zero and less than 1,000,000."
  }
}
```

Error codes should be stable enough for tests:

- `invalid_amount`
- `recipient_required`
- `recipient_not_found`
- `recipient_inactive`
- `self_recipient_not_allowed`
- `receiver_account_required`
- `receiver_account_not_found`
- `unsupported_currency`
- `request_creation_failed`
