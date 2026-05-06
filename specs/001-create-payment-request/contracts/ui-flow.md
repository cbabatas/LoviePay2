# UI Flow Contract: Create Payment Request

This feature uses a backend create endpoint for validation and Supabase persistence. This document covers the user-facing browser flow; backend and storage contracts are documented in [backend-api.md](./backend-api.md) and [supabase-schema.md](./supabase-schema.md).

## Mock Sign-In

Required fields:

- Email
- Password

Behavior:

- Valid demo credentials enter the create request workspace.
- Invalid credentials show an actionable error.
- No registration, password reset, account recovery, permissions, or profile management links are exposed.

## Workspace Shell

Required sidebar content:

- Basic avatar
- Demo user's full name
- Customer number
- Menu name for payment request creation

Responsive behavior:

- Desktop: sidebar remains visible next to the create request workspace.
- Tablet: layout remains readable with sidebar and form content adapted to available width.
- Mobile: content stacks cleanly and remains usable without horizontal scrolling.

## Recipient Search and Selection

Inputs:

- Search query matching friend name, email, or phone.

Behavior:

- Active matching friends are shown as selectable results.
- The current demo user is not present in the friend list or search results.
- Inactive friends are not valid for submission.
- Empty search results show a clear empty state.
- Selecting a recipient updates the form with the selected friend.

## Request Form

Inputs:

- Selected recipient
- Amount
- Receiver account
- Optional note

Derived values:

- Currency is derived from the selected receiver account.

Submission rules:

- Amount must be greater than zero and less than 1,000,000.
- Recipient must exist, be active, and not be the current demo user.
- Receiver account must exist and have a supported currency.
- Currency cannot be manually overridden.

Success behavior:

- Submit the request to the backend create endpoint.
- Store a pending payment request in Supabase after backend validation succeeds.
- Generate a unique hash.
- Generate a public shareable link from the unique hash.
- Show confirmation with recipient, amount, currency, pending status, and shareable link.

Failure behavior:

- Validation failures block request creation.
- Creation failures do not store partial requests.
- User-facing errors describe what must be corrected.
- Backend validation errors are shown in the form without creating a request.

## Desktop Playwright Verification Contract

Desktop automated tests should cover:

- Valid mock sign-in.
- Searching by name, email, and phone.
- Creating a valid pending payment request.
- Confirming the backend-backed success response is shown in the UI.
- Amount validation for zero, negative, invalid, and 1,000,000 or greater values.
- Current demo user absence from search results.
- Derived currency from selected receiver account.
- Generated shareable link presence.

Tablet and mobile layout verification is manual only for this feature.
