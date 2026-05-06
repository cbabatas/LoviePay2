create extension if not exists "pgcrypto";

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null,
  recipient_id text not null,
  receiver_account_id text not null,
  amount numeric not null check (amount > 0 and amount < 1000000),
  currency text not null,
  note text,
  status text not null default 'pending' check (status = 'pending'),
  hash text not null unique,
  shareable_link text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists payment_requests_hash_idx
  on public.payment_requests (hash);

create index if not exists payment_requests_sender_id_idx
  on public.payment_requests (sender_id);

create index if not exists payment_requests_recipient_id_idx
  on public.payment_requests (recipient_id);

create index if not exists payment_requests_created_at_idx
  on public.payment_requests (created_at desc);
