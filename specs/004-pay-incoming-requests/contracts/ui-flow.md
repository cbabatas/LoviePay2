# UI Flow Contract: Pay Incoming Payment Requests

The Pay flow extends the existing Incoming Requests tab. It must be responsive across desktop, tablet, and mobile, but automated Playwright coverage is desktop-only.

## Incoming List

Pending incoming rows show a Pay action when at least one matching-currency source account exists or when the user can open the flow to see why payment is blocked.

Rows with `paid`, `declined`, `expired`, `withdrawn`, or any other non-pending status do not show Pay. They continue to display status and detail navigation using existing list patterns.

List Pay action behavior:

- Opens payment confirmation for that request.
- Loads or derives eligible current-user accounts where account currency matches request currency.
- If exactly one eligible account exists, selects it by default.
- If multiple eligible accounts exist, requires account selection before confirmation.
- If no matching-currency account exists, shows a blocked state and disables confirmation.

## Incoming Detail

The detail page mirrors list behavior:

- Pending payable requests show Pay.
- Non-pending requests show the current terminal status and no Pay action.
- If the request status changes while detail is open, the next Pay attempt refreshes the latest status and blocks payment.

Back navigation returns to the Incoming list with the active filters preserved.

## Confirmation

The confirmation step must show:

- Sender/request context.
- Request amount and currency.
- Selected source account label.
- Source account balance.
- Confirmation action.
- Cancel/back action.

Validation states:

- No eligible account: explain that no matching-currency account is available.
- Multiple accounts with no selection: disable confirmation until one account is selected.
- Insufficient selected-account balance: show a clear insufficient-balance error and keep request pending.
- Account balance exactly equal to amount: allow payment.

## Processing State

After the user confirms:

- Show visible processing feedback for 2-3 seconds.
- Disable Pay and confirmation controls for that request while processing is active.
- Ignore repeated clicks/taps during processing.
- Keep the user on the same surface until the backend response is applied.

The simulated delay is a UI requirement; backend logic remains authoritative for the final payment result.

## Success State

After successful payment:

- The request status updates to `paid`.
- The selected source account balance reflects the deduction.
- The list row and detail view show paid status.
- The outgoing view for the same shared request also reflects `paid` when opened/refreshed.
- The user sees a concise success message.

## Error and Blocked States

Use existing alert/inline error styling and task-focused copy.

- Non-pending request: Pay is blocked and latest status is shown.
- Insufficient balance: payment is blocked and the request remains pending.
- No matching-currency account: payment is unavailable.
- Duplicate/retry after completion: show the current paid status without a second deduction.
- Commit failure: show payment failed and leave the prior status/balance visible.

## Responsive Design

- Desktop: account selection and confirmation can use the wider two-column/detail layout consistent with existing request views.
- Tablet: filters, list actions, account selector, and confirmation controls wrap without horizontal scrolling.
- Mobile: list rows stack, Pay controls remain tappable, confirmation content uses a single column, and fixed-width controls do not overflow.

Manual viewport checks cover tablet and mobile. Playwright tests cover desktop only.
