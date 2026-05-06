# Quickstart: Manage Outgoing Payment Requests

## Prerequisites

- Install dependencies with `npm install` if needed.
- Configure Supabase environment variables as documented by the existing create request feature.
- Apply the `payment_requests` schema update so `status` supports both `pending` and `withdrawn`.

## Run Locally

```bash
npm run dev
```

Open the local Vite URL and sign in with the demo user from `src/mock-data.js`.

## Verification Commands

```bash
npm run check
npm run test:api
npm run test:e2e:desktop
```

Playwright coverage is intentionally desktop-only for this feature.

## Acceptance Verification

1. Open the Payment Request section and select the outgoing view.
2. Confirm only requests where the demo user is sender are listed.
3. Confirm each row shows amount, status, recipient, and request date.
4. Filter by status and recipient, then clear filters.
5. Select an outgoing request and confirm the separate detail view matches the selected row.
6. Withdraw a pending request from the list, cancel confirmation, and confirm status remains unchanged.
7. Withdraw a pending request from the list, confirm, and verify status changes to `withdrawn`.
8. Withdraw a pending request from the detail view, confirm, and verify detail status changes to `withdrawn`.
9. Confirm non-pending requests cannot be withdrawn and show a clear explanation.
10. Select Create Request from the Payment Request screen and verify the existing create request screen opens.

## Responsive Checks

Manual viewport checks are required for tablet and mobile because Playwright is desktop-only by request:

- Desktop: no overlap in list, filters, detail, or confirmation states.
- Tablet: filters/actions wrap without horizontal scrolling.
- Mobile: list rows stack, buttons remain tappable, and confirmation content fits.

## Responsive Verification Results

Checked on 2026-05-06 after implementation:

- Desktop: outgoing list, filters, detail metadata, and confirmation dialog render without overlap.
- Tablet: filter controls and row actions wrap into available width without horizontal scrolling.
- Mobile: rows stack vertically, buttons remain full-width/tappable, and confirmation content fits in the viewport.
