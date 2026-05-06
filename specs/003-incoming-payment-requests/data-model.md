# Data Model: Manage Incoming Payment Requests

## Current User

Represents the acting demo user.

- `id`: Stable user identifier. Must match `payment_requests.recipient_id` for incoming records.
- `fullName`: Display name used in the app shell.
- `email`: Demo sign-in identifier.
- `receiverAccounts`: Existing accounts; not directly used for incoming display but required for cross-feature consistency.

## Incoming Payment Request

Supabase-backed request record where `recipient_id` equals the current user's `id`.

- `id`: UUID primary key.
- `sender_id`: The other user who created the request. Required.
- `recipient_id`: Current user id. Required.
- `receiver_account_id`: Account on the sender side. Required by schema; not central to incoming display but may be shown for completeness.
- `amount`: Numeric amount greater than 0 and less than 1,000,000.
- `currency`: Supported currency.
- `note`: Optional request note.
- `status`: Stored lifecycle value. Allowed values: `pending`, `withdrawn`, `declined`, `expired`.
- `hash`: Unique public hash from creation.
- `shareable_link`: Link derived from `hash`.
- `created_at`: Used as the basis for expiry derivation and list/detail display.
- `updated_at`: Last server-side update time, set when the request transitions to `declined` or `expired`.

### Derived fields (computed at read time)

- `expiresAt`: `created_at + 7 days` (UTC).
- `daysRemaining`: `max(0, floor((expiresAt - now) / 1 day))`.
- `canDecline`: `true` only when stored `status === pending` and the request has not reached `expiresAt`.

### State Transitions

```text
pending -> declined        (recipient confirms decline; server-enforced)
pending -> expired         (server promotes stored status when read after expiresAt; updated_at set to promotion time)
```

Rules:

- Expiry promotion is a stored state change, not a derived presentation. When a read-side operation observes a stored-`pending` row whose `now >= expiresAt`, the server MUST update that row to `status = 'expired'` and set `updated_at` to the time of promotion before returning it. Subsequent reads return the already-promoted row unchanged.
- Only stored `pending` requests that are not yet expired are eligible for decline. Decline operations MUST run the same expiry promotion check first; if promotion occurs, decline MUST fail with `decline_not_allowed` and return the now-`expired` row without further changes.
- `declined` and `expired` are terminal stored states for incoming requests.
- `withdrawn` rows are sender-initiated terminations; they may exist but are not in scope for this feature's actions and must remain read-only in the incoming UI if visible.
- Outgoing requests (where `sender_id` equals the current user) MUST NOT be returned by incoming operations.
- If a request is no longer eligible at decline confirmation time (already declined, withdrawn, expired, or not pending), decline must fail without changing the stored status further.

## Sender

Display data used to label the sender on incoming rows and the detail page. Sourced from the existing `friends` mock data set (extended as needed for incoming-only senders).

- `id`: Matches `payment_requests.sender_id`.
- `fullName`: Primary display label.
- `email`: Secondary searchable detail.
- `phone`: Optional searchable detail.
- `active`: Existing eligibility flag. Historical incoming requests can still display inactive senders.

## Filter Criteria

Client-side state used to narrow the already recipient-scoped incoming requests.

- `status`: Optional value drawn from the stored status set: `pending`, `declined`, `expired`, or empty (all).
- `senderQuery`: Optional text query matched against visible sender name, email, phone, note, currency, amount, and date.

Validation:

- Filters apply only after the incoming request set is scoped to current-user recipient records.
- The status filter compares against the stored `status` after the server has applied the read-time expiry promotion described above, so the Expired filter returns rows whose stored status is `expired`.
- Clearing filters restores the complete incoming request set.
- Empty state (no incoming requests at all) is distinct from no-results (filters match zero rows).

## Decline Confirmation

Transient UI state that prevents accidental decline.

- `requestId`: The incoming request being declined.
- `source`: `list` or `detail`.
- `confirmed`: Boolean user decision.

Rules:

- No status change occurs until the user confirms.
- Cancel or dismiss leaves the request unchanged.
- Backend response is the source of truth for the final displayed status.

## Tab Navigation

Screen-level state on the Payment Request screen.

- `activeTab`: `outgoing` or `incoming`.
- Switching tabs MUST NOT carry the other tab's filters or selection into the active view.
- Selecting a request in the Incoming list opens a dedicated incoming detail view; back navigation returns to the Incoming list with previously applied filters preserved.
