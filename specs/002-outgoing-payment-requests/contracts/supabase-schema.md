# Supabase Schema Contract: Outgoing Payment Requests

The existing `public.payment_requests` table remains the storage surface for create and outgoing management.

## Required Table Shape

```sql
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  recipient_id text not null,
  receiver_account_id text not null,
  amount numeric not null check (amount > 0 and amount < 1000000),
  currency text not null,
  note text,
  status text not null default 'pending' check (status in ('pending', 'withdrawn')),
  hash text not null unique,
  shareable_link text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

## Indexes

```sql
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
```

## Status Rules

- New records are created with `status = 'pending'`.
- Withdraw updates set `status = 'withdrawn'` and refresh `updated_at`.
- Withdraw updates must include both `id` and `sender_id` predicates.
- Withdraw updates must include `status = 'pending'` as a predicate so stale clients cannot withdraw an ineligible request.

## Compatibility Note

If an existing local table was created with `check (status = 'pending')`, implementation must update the constraint before withdrawal can be stored.
