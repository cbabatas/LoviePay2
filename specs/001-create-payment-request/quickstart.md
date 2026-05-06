# Quickstart: Create Payment Request

## Implementation Scope

Build the minimal create payment request demo described in [spec.md](./spec.md) and [plan.md](./plan.md). Keep the implementation limited to mock sign-in, demo friend search, receiver account selection, request validation, Supabase-backed pending request storage, and shareable link generation. Demo user, friend, and receiver account data remain mock data.

## Expected Commands

Implemented commands:

```bash
npm install
npm run dev
npm run check
npm run test:api
npm run test:e2e:desktop
```

Expected command purposes:

- `npm run check`: JavaScript syntax or static checks for changed source files.
- `npm run test:api`: Backend validation coverage for create payment request, including invalid payload rejection before Supabase insert.
- `npm run test:e2e:desktop`: Desktop-only Playwright coverage for the create request flow.

Local dev serves the app at:

```bash
http://127.0.0.1:5173/
```

## Environment

The backend create endpoint requires Supabase configuration for payment request persistence:

```bash
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Do not expose privileged Supabase credentials to browser code.

Create the required Supabase table before submitting real requests:

```bash
supabase/payment-requests.sql
```

## Mock Credentials

```text
Email: ayla.demo@loviepay.test
Password: demo-pass-001
```

## Manual Verification

1. Open the app in a desktop browser.
2. Sign in with the mock demo email and password.
3. Confirm the sidebar shows avatar, full name, customer number, and payment request menu name.
4. Search friends by name, email, and phone.
5. Confirm the current demo user never appears as a friend result.
6. Select an active recipient.
7. Enter a valid amount greater than zero and less than 1,000,000.
8. Select a receiver account and confirm the currency is derived from that account.
9. Add an optional note.
10. Send the request.
11. Confirm a pending request is stored in Supabase and shown with recipient, amount, currency, unique hash, and public shareable link.

## Validation Checks

Confirm no request is created when:

- Amount is empty.
- Amount is zero.
- Amount is negative.
- Amount is not numeric.
- Amount is 1,000,000 or greater.
- Recipient is missing.
- Recipient is inactive.
- Recipient is the current demo user.
- Receiver account is missing.
- Receiver account has no supported currency.

Confirm the backend rejects the same invalid cases even if client-side validation is bypassed.

## Responsive Checks

Responsive design must work well on desktop, tablet, and mobile.

Manual viewport checks:

- Desktop: 1280px wide or larger.
- Tablet: around 768px wide.
- Mobile: around 375px wide.

Pass criteria:

- No horizontal scrolling for normal content.
- Form controls remain readable and usable.
- Sidebar/user information remains accessible.
- Validation and success messages do not overlap content.
- Primary create request flow can be completed on each viewport.

Playwright is intentionally limited to desktop for this feature.

Verification recorded on 2026-05-06:

- Desktop Playwright flow passed on Chromium through `npm run test:e2e:desktop`.
- Manual rendered smoke checks passed at 1280px desktop, 768px tablet, and 375px mobile using local dev server screenshots.
- Tablet/mobile behavior remains manual by plan; responsive CSS stacks the sidebar, form, and summary without horizontal scrolling in the checked tablet and mobile viewports.
- Recipient search over the demo data returned visible matches immediately in the rendered smoke flow and is covered by backend helper tests; no optimization was needed for the current fixture size.
