# Data Model: Manage Outgoing Payment Requests

## Current User

Represents the acting demo user.

- `id`: Stable user identifier. Must match `payment_requests.sender_id` for outgoing records.
- `fullName`: Display name used in the app shell.
- `email`: Demo sign-in identifier.
- `receiverAccounts`: Existing accounts used by create request flow.

## Outgoing Payment Request

Supabase-backed request record where `sender_id` equals the current user's `id`.

- `id`: UUID primary key.
- `sender_id`: Current user id. Required.
- `recipient_id`: Friend or recipient id. Required.
- `receiver_account_id`: Current user's account selected during creation. Required.
- `amount`: Numeric amount greater than 0 and less than 1,000,000.
- `currency`: Supported currency derived during creation.
- `note`: Optional request note.
- `status`: Request lifecycle value. Supported values for this feature: `pending`, `withdrawn`.
- `hash`: Unique public hash generated during creation.
- `shareable_link`: Link derived from `hash`.
- `created_at`: Request date used in list/detail display.
- `updated_at`: Last server-side update time for withdrawal and future status changes.

### State Transitions

```text
pending -> withdrawn
```

Rules:

- Only `pending` requests are eligible for withdrawal.
- `withdrawn` requests are terminal for this feature.
- Incoming or non-current-user requests must not be returned or updated by outgoing operations.
- If a request is no longer `pending` at confirmation time, withdrawal must fail without changing status.

## Recipient

Mock display data used to label the recipient on outgoing rows and detail pages.

- `id`: Matches `payment_requests.recipient_id`.
- `fullName`: Primary display label.
- `email`: Secondary display label and searchable visible detail.
- `phone`: Optional searchable visible detail.
- `active`: Existing create-request eligibility flag. Historical outgoing requests can still display inactive recipients.

## Filter Criteria

Client-side state used to narrow already scoped outgoing requests.

- `status`: Optional status value such as `pending` or `withdrawn`.
- `recipientQuery`: Optional text query matched against visible recipient name, email, phone, and request attributes.
- `dateRange`: Optional future extension; not required for initial implementation unless already present in visible controls.

Validation:

- Filters must apply only after the outgoing request set is scoped to current-user sender records.
- Clearing filters restores the complete outgoing request set.
- No-results state is distinct from empty outgoing state.

## Withdrawal Confirmation

Transient UI state that prevents accidental cancellation.

- `requestId`: The outgoing request being withdrawn.
- `source`: `list` or `detail`.
- `confirmed`: Boolean user decision.

Rules:

- No status change occurs until the user confirms.
- Cancel or dismiss leaves the request unchanged.
- Backend response is the source of truth for the final displayed status.

## Create Request Entry Point

Screen-level action on the Payment Request area.

- Opens the existing create request screen.
- Must remain available regardless of selected tab or active outgoing filters.
