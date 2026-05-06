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
    check (status in ('pending', 'withdrawn', 'declined', 'expired', 'paid')),
  hash text not null unique,
  shareable_link text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.payment_requests
  drop constraint if exists payment_requests_status_check;

alter table public.payment_requests
  add constraint payment_requests_status_check
  check (status in ('pending', 'withdrawn', 'declined', 'expired', 'paid'));

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

create table if not exists public.accounts (
  id text primary key,
  owner_id text not null,
  display_name text not null,
  account_number text not null,
  account_type text not null
    check (account_type in ('current_account', 'term_deposit')),
  currency text not null,
  balance numeric not null check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backfill columns when upgrading an existing accounts table
alter table public.accounts
  add column if not exists account_number text;

update public.accounts
  set account_number = id
  where account_number is null;

alter table public.accounts
  alter column account_number set not null;

alter table public.accounts
  add column if not exists account_type text;

update public.accounts
  set account_type = 'current_account'
  where account_type is null;

alter table public.accounts
  alter column account_type set not null;

alter table public.accounts
  drop constraint if exists accounts_account_type_check;

alter table public.accounts
  add constraint accounts_account_type_check
  check (account_type in ('current_account', 'term_deposit'));

alter table public.accounts
  drop column if exists account_code;

create unique index if not exists accounts_account_number_idx
  on public.accounts (account_number);

create index if not exists accounts_owner_currency_idx
  on public.accounts (owner_id, currency);

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id),
  type text not null check (type in ('payment')),
  amount numeric not null check (amount > 0),
  currency text not null,
  status text not null check (status in ('succeeded')),
  source_account_id text not null,
  created_at timestamptz not null default now()
);

create unique index if not exists payment_transactions_request_success_idx
  on public.payment_transactions (payment_request_id)
  where status = 'succeeded';

create index if not exists payment_transactions_source_account_idx
  on public.payment_transactions (source_account_id);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid not null references public.payment_transactions(id),
  account_id text not null,
  entry_type text not null check (entry_type in ('debit', 'credit')),
  amount numeric not null check (amount > 0),
  currency text not null,
  account_code text not null,
  created_at timestamptz not null default now()
);

create index if not exists ledger_entries_transaction_idx
  on public.ledger_entries (transaction_id);
