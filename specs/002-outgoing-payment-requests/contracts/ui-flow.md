# UI Flow Contract: Outgoing Payment Requests

## Payment Request Section

Required screen-level elements:

- Outgoing requests tab or equivalent outgoing view.
- Create Request button available from the Payment Request screen regardless of selected tab or active filters.
- Loading, empty, no-results, error, and update-success states where applicable.

Create Request behavior:

- Opens the existing create request screen.
- Does not depend on outgoing filters or current outgoing selection.

## Outgoing List

Each visible item must show:

- Amount with currency.
- Current status.
- Recipient display name, with available contact detail where useful.
- Request date.

List behavior:

- Contains only current-user outgoing requests.
- Selecting a row opens a separate detail view for that same request.
- Pending rows expose a Withdraw action.
- Non-pending rows do not expose an active Withdraw action and must communicate that withdrawal is unavailable.

## Filters

Initial supported controls:

- Status filter.
- Recipient text search against visible recipient details.
- Clear filters action.

States:

- Empty state: current user has no outgoing requests.
- No-results state: outgoing requests exist, but active filters match none.
- Filter changes update the list within 1 second for typical demo data.

## Detail View

Required content:

- Amount with currency.
- Current status.
- Recipient display information.
- Request date.
- Additional available identifying information such as note, shareable link, and receiver account.
- Back navigation to outgoing list.

Behavior:

- Detail opens only for current-user outgoing requests.
- Missing or unavailable request shows an unavailable state and back navigation.
- Pending detail exposes Withdraw.
- Non-pending detail blocks Withdraw with a clear explanation.

## Withdrawal Confirmation

Required behavior:

- Withdraw from list and detail both show a confirmation step before status update.
- Confirm calls the backend withdraw operation.
- Cancel or dismiss leaves status unchanged.
- Backend success updates the relevant list row and detail view to `withdrawn`.
- Backend ineligible or stale-status response keeps the current backend status visible and communicates that withdrawal is unavailable.
- Backend failure shows a recoverable error state.

## Responsive Design

Responsive requirements:

- Desktop: list and detail may use a wider multi-column or master/detail-friendly layout.
- Tablet: filters and actions remain visible without horizontal scrolling.
- Mobile: list items stack cleanly, controls wrap, and confirmation remains usable.

Verification:

- Playwright automation is desktop-only.
- Tablet and mobile responsiveness are verified manually with browser viewport checks.
