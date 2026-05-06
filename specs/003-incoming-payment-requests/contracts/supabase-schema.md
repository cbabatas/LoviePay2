# Supabase Schema Contract: Incoming Payment Requests

## Required schema delta

Extend the existing `public.payment_requests` table to allow the `declined` status and add an index for recipient-scoped queries.

```sql
alter table public.payment_requests
  drop constraint if exists payment_requests_status_check;

alter table public.payment_requests
  add constraint payment_requests_status_check
  check (status in ('pending', 'withdrawn', 'declined', 'expired'));

create index if not exists payment_requests_recipient_status_created_idx
  on public.payment_requests (recipient_id, status, created_at desc);
```

## Final state of `supabase/payment-requests.sql`

```sql
create extension if not exists "pgcrypto";

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  recipient_id text not null,
  receiver_account_id text not null,
  amount numeric not null check (amount > 0 and amount < 1000000),
  currency text not null,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'withdrawn', 'declined', 'expired')),
  hash text not null unique,
  shareable_link text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists payment_requests_hash_idx
  on public.payment_requests (hash);

create index if not exists payment_requests_sender_id_idx
  on public.payment_requests (sender_id);

create index if not exists payment_requests_recipient_id_idx
  on public.payment_requests (recipient_id);

create index if not exists payment_requests_created_at_idx
  on public.payment_requests (created_at desc);

create index if not exists payment_requests_sender_status_created_idx
  on public.payment_requests (sender_id, status, created_at desc);

create index if not exists payment_requests_recipient_status_created_idx
  on public.payment_requests (recipient_id, status, created_at desc);
```

## Notes

- `expired` is part of the persisted enum. The API handler promotes a stored-`pending` row to `expired` and updates `updated_at` on read whenever `now >= created_at + 7 days`; no background job is required.
- The added recipient index supports the new incoming list and detail queries without affecting existing outgoing access patterns.
- No row-level security changes are required because access is enforced in the API handler against the demo user context, consistent with the existing approach.
