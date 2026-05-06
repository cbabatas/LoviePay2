# UI Flow Contract: Incoming Payment Requests

## Payment Request Section

Required screen-level elements:

- An Incoming Requests tab that is a sibling of the existing Outgoing Requests tab on the Payment Request screen.
- Switching to the Incoming tab loads the recipient-scoped list and surfaces incoming-specific filters and actions.
- Tab state is preserved while the user navigates within the Incoming flow (list <-> detail) and reset cleanly when switching tabs.
- Loading, empty, no-results, error, success, confirmation, and ineligible-action states are present as applicable.

## Incoming List

Each visible row must show:

- Sender display name (with available secondary contact detail where useful).
- Amount with currency.
- Current displayed status (`pending`, `declined`, `expired`, or `withdrawn` if visible).
- Creation date.
- Days remaining until expiry (whole days, rounded down). For `expired`, `declined`, and `withdrawn` rows the value is `0` and is presented as "expired" or otherwise read-only.

List behavior:

- Contains only current-user incoming requests (`recipient_id` equals current demo user).
- Selecting a row opens the dedicated incoming detail view for that same request.
- Pending rows expose a Decline action.
- Non-pending rows (declined, expired, withdrawn) do not expose an active Decline action and must communicate that decline is unavailable.

## Filters

Initial supported controls:

- Status filter with options that include at minimum: All, Pending, Declined, Expired.
- Sender text search against visible sender name, email, phone, note, currency, amount, and date.
- Clear filters action.

States:

- Empty state: current user has no incoming requests.
- No-results state: incoming requests exist but active filters match none.
- Filter changes update the list within 1 second for typical demo data.
- Filters apply against the stored `status` returned by the server, which has already applied read-time expiry promotion, so the Expired filter surfaces rows whose stored status is `expired`.

## Detail View

Required content:

- Sender display information.
- Amount with currency.
- Current displayed status.
- Creation date and expiry date.
- Days remaining until expiry.
- Additional identifying information such as note, shareable link reference, and receiver account where useful.
- Back navigation to the Incoming list, preserving the previously applied filters and search.

Behavior:

- Detail opens only for current-user incoming requests.
- Missing or unavailable request shows an unavailable state and back navigation.
- Pending detail exposes Decline.
- Non-pending detail blocks Decline with a clear explanation.

## Decline Confirmation

Required behavior:

- Decline from list and detail both show a confirmation step before status update.
- Confirm calls the backend decline operation.
- Cancel or dismiss leaves the status unchanged.
- Backend success updates the relevant list row and detail view to `declined` and removes the Decline action.
- Backend ineligible or stale-status response keeps the current backend status visible and communicates that decline is unavailable.
- Backend failure shows a recoverable error state.

## Empty, Loading, Error, and Success States

- Loading: show a non-blocking indicator while the incoming list or detail is being fetched.
- Empty: shown when no incoming requests exist for the current user; copy is task-focused and consistent with the outgoing empty state.
- No-results: shown when filters match nothing; offers a clear-filters affordance.
- Error: shown when list, detail, or decline fails; includes a recovery action (retry or dismiss).
- Success: short confirmation after a successful decline.
- Ineligible-action: rendered inline near the Decline action whenever decline is not available, with reasoning (expired, declined, withdrawn).

## Responsive Design

Responsive requirements:

- Desktop: list and detail may use a wider multi-column or master/detail-friendly layout consistent with the outgoing view.
- Tablet: filters, status pill, and Decline action remain visible without horizontal scrolling.
- Mobile: list items stack cleanly, filter and search controls wrap, and the confirmation step remains usable.

Verification:

- Playwright automation is desktop-only.
- Tablet and mobile responsiveness are verified manually with browser viewport checks documented in `quickstart.md`.
