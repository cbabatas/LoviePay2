# Supabase Schema Contract: Create Payment Request

Only system-generated payment request records are stored in Supabase for this feature. Demo user, friend, and receiver account data remain mock data.

## Table: payment_requests

Columns:

- `id`: UUID primary key.
- `sender_id`: Text, required.
- `recipient_id`: Text, required.
- `receiver_account_id`: Text, required.
- `amount`: Numeric, required, greater than zero and less than 1,000,000.
- `currency`: Text, required.
- `note`: Text, optional.
- `status`: Text, required, defaults to `pending`.
- `hash`: Text, required, unique.
- `shareable_link`: Text, required.
- `created_at`: Timestamp, required, defaults to creation time.

Required constraints:

- `amount > 0`
- `amount < 1000000`
- `status = 'pending'` for records created by this feature
- `hash` is unique

Recommended indexes:

- Unique index on `hash`.
- Index on `sender_id` for future outgoing request lookup.
- Index on `recipient_id` for future incoming request lookup.
- Index on `created_at` for future chronological request listing.

Security notes:

- Backend code must use server-side Supabase credentials and must not expose privileged credentials to the browser.
- Because this feature uses mock sign-in and no real authentication, direct browser writes to Supabase are out of scope.
- Row-level security policy design can be deferred until real authentication is introduced.
