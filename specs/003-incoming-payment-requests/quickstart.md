# Quickstart: Manage Incoming Payment Requests

## Prerequisites

- Node.js and `npm` available locally.
- Supabase environment variables configured for `api/supabase-client.js` (same as the create and outgoing flows).
- Branch checked out: `003-incoming-payment-requests`.

## Install dependencies

```bash
npm install
```

## Apply schema delta (once)

Apply the schema in `supabase/payment-requests.sql` to your Supabase project. The relevant changes for this feature are the extended status check (`pending`, `withdrawn`, `declined`, `expired`) and the new `payment_requests_recipient_status_created_idx` index. Re-running the SQL is safe.

## Run the dev server

```bash
npm run dev
```

Open `http://127.0.0.1:5173/`, sign in as the demo user, and navigate to the Payment Request screen. Switch to the Incoming Requests tab.

## Verification matrix

The following manual and automated steps map directly to spec acceptance scenarios and success criteria.

### Automated checks

```bash
npm run check
npm run test:api
npm run test:e2e:desktop
```

`npm run check` runs the project syntax check.
`npm run test:api` exercises Node API tests that cover:

- Recipient scoping for list and detail (US1, FR-001).
- Filter and search behavior on incoming results, including no-results state (US2, FR-006, FR-007).
- Detail access for current-user incoming requests only (US3, FR-008).
- Read-time expiry promotion at the 7-day boundary: a stored-`pending` row read at or past `created_at + 7 days` returns with `status: "expired"` and a new `updated_at` (FR-003, FR-004, edge cases).
- Decline confirmation requirement (FR-009).
- Decline status guard against non-pending or expired requests, including the case where decline triggers the promotion and is then rejected with `decline_not_allowed` (FR-005, FR-010, SC-005).
- Read-only treatment of expired and declined rows (FR-005).

`npm run test:e2e:desktop` exercises the Playwright desktop spec `tests/e2e/incoming-payment-requests.desktop.spec.js` which covers:

- Navigating to the Incoming Requests tab and seeing the list with sender, amount, status, date, days remaining (US1).
- Applying status filters and sender search, including the no-results state (US2).
- Opening a detail page from the list, viewing all required fields, and using back navigation (US3).
- Initiating Decline from the list and from the detail, confirming via the confirmation step, and observing the immediate status change to `declined` (US4, FR-012, SC-003).
- Cancelling the confirmation leaves the request unchanged.
- Expired and declined rows do not expose Decline (SC-005).

### Manual responsive verification

Playwright automation is desktop-only. Verify tablet and mobile manually using browser devtools viewport presets:

1. Tablet (e.g., iPad, ~820 px width): Incoming tab, filter row, list rows, detail page, and confirmation are usable without horizontal scrolling.
2. Mobile (e.g., iPhone 12, ~390 px width): list items stack, filter and search controls wrap, Decline confirmation step remains tappable.
3. Desktop (>= 1280 px): list and detail use the wider layout consistent with the outgoing view.

Record any visual regressions in the PR description.

## Performance budget verification

- SC-001: Open the Incoming tab on a typical demo data set; verify the list renders within 2 seconds under normal local network conditions.
- Filter and search interactions update the displayed list within 1 second for typical demo data.
- After confirming a decline, the row status updates to `declined` within 1 second of the backend success response.

## Stopping conditions

A change is ready for review when:

- All automated commands above pass.
- Manual viewport checks for tablet and mobile are noted in the PR.
- Spec acceptance scenarios for US1 through US4 are observed end to end on the running dev server.
- No outgoing request appears in the Incoming tab, list, detail, or decline path.
