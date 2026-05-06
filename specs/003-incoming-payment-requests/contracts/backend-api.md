# Backend API Contract: Incoming Payment Requests

The existing payment request API continues to support create and outgoing operations. Incoming operations are added in the same handler. All incoming operations derive the current user from the server-side demo user context and scope by `recipient_id`.

Expiry is enforced server-side at read time. When any incoming read (list, detail, or decline) observes a stored-`pending` row whose `now >= created_at + 7 days`, the server MUST update that row to `status = 'expired'` and set `updated_at` to the promotion time before returning it. Decline operations MUST run this promotion first and reject with `decline_not_allowed` if the row was promoted or is otherwise non-pending.

## List Incoming Requests

`GET /api/payment-requests?direction=incoming`

Returns requests where `recipient_id` equals the current demo user id. Outgoing requests must not be returned.

### Success Response

```json
{
  "paymentRequests": [
    {
      "id": "uuid",
      "senderId": "friend_001",
      "recipientId": "demo_user_001",
      "receiverAccountId": "acct_eur_main",
      "amount": 88.0,
      "currency": "EUR",
      "note": "Concert ticket",
      "status": "pending",
      "expiresAt": "2026-05-13T13:00:00.000Z",
      "daysRemaining": 6,
      "hash": "unique-public-hash",
      "shareableLink": "/r/unique-public-hash",
      "createdAt": "2026-05-06T13:00:00.000Z",
      "updatedAt": "2026-05-06T13:00:00.000Z"
    }
  ]
}
```

Ordering: newest first by `created_at`.

Notes:

- For each row, `expiresAt` and `daysRemaining` are always included as derived read-time fields.
- For any stored-`pending` row at or past `expiresAt`, the server promotes the stored `status` to `expired` and sets `updated_at` to the promotion time before returning. The returned row therefore carries `status: "expired"` and `daysRemaining: 0`.
- For stored `declined`, `expired`, or `withdrawn` rows, `daysRemaining` is `0`.

### Error Responses

- `incoming_list_failed`: Supabase select failed.

## Get Incoming Request Detail

`GET /api/payment-requests/:id?direction=incoming`

Returns one request only when it belongs to the current user as recipient.

### Success Response

```json
{
  "paymentRequest": {
    "id": "uuid",
    "senderId": "friend_001",
    "recipientId": "demo_user_001",
    "receiverAccountId": "acct_eur_main",
    "amount": 88.0,
    "currency": "EUR",
    "note": "Concert ticket",
    "status": "pending",
    "expiresAt": "2026-05-13T13:00:00.000Z",
    "daysRemaining": 6,
    "hash": "unique-public-hash",
    "shareableLink": "/r/unique-public-hash",
    "createdAt": "2026-05-06T13:00:00.000Z",
    "updatedAt": "2026-05-06T13:00:00.000Z"
  }
}
```

The detail read also performs the expiry promotion described above; the returned row reflects any promotion. If the request does not exist or is not incoming for the current user, return a not-found style response without exposing outgoing request details.

### Error Responses

- `request_not_found`: Request does not exist or is not incoming for the current user.
- `incoming_detail_failed`: Supabase select failed.

## Decline Incoming Request

`PATCH /api/payment-requests/:id/decline`

Declines a current-user incoming request only when its stored status is `pending` and it is not yet expired. Before evaluating eligibility, the server performs the read-time expiry promotion: if `now >= created_at + 7 days`, it updates the row to `status = 'expired'` with a new `updated_at` and rejects the decline with `decline_not_allowed`.

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
    "senderId": "friend_001",
    "recipientId": "demo_user_001",
    "receiverAccountId": "acct_eur_main",
    "amount": 88.0,
    "currency": "EUR",
    "note": "Concert ticket",
    "status": "declined",
    "expiresAt": "2026-05-13T13:00:00.000Z",
    "daysRemaining": 0,
    "hash": "unique-public-hash",
    "shareableLink": "/r/unique-public-hash",
    "createdAt": "2026-05-06T13:00:00.000Z",
    "updatedAt": "2026-05-06T13:05:00.000Z"
  }
}
```

### Error Responses

Use stable error codes for tests:

- `request_not_found`: Request does not exist or is not incoming for the current user.
- `decline_confirmation_required`: Confirmation was missing or false.
- `decline_not_allowed`: Request is not currently eligible for decline (already declined, withdrawn, or expired, or not stored as `pending`). When this code is returned because the row was just promoted to `expired`, the response body MAY include the promoted `paymentRequest` so the UI can refresh.
- `request_update_failed`: Supabase update failed or returned an unexpected result.

The backend must preserve the existing stored status for all error cases except the read-time expiry promotion, which is intentional and required.

## Routing Summary

| Method | Path                                          | Operation                |
|--------|-----------------------------------------------|--------------------------|
| POST   | `/api/payment-requests`                       | Create (existing)        |
| GET    | `/api/payment-requests?direction=outgoing`    | List outgoing (existing) |
| GET    | `/api/payment-requests/:id?direction=outgoing`| Outgoing detail (existing)|
| PATCH  | `/api/payment-requests/:id/withdraw`          | Withdraw (existing)      |
| GET    | `/api/payment-requests?direction=incoming`    | List incoming (new)      |
| GET    | `/api/payment-requests/:id?direction=incoming`| Incoming detail (new)    |
| PATCH  | `/api/payment-requests/:id/decline`           | Decline (new)            |

The handler must continue to return `405 Method Not Allowed` with an appropriate `Allow` header for unrecognized method/path combinations.
