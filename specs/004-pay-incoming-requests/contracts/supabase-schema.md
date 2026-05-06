# Supabase Schema Contract: Pay Incoming Payment Requests

Update `supabase/payment-requests.sql` so payment completion can be represented and reconciled.

## `payment_requests`

Existing table. Extend the status constraint:

```sql
check (status in ('pending', 'withdrawn', 'declined', 'expired', 'paid'))
```

Rules:

- `paid` is a terminal status.
- Payment updates set `status = 'paid'` and `updated_at = now`.
- Payment update queries must guard on `status = 'pending'`.

Recommended index:

```sql
create index if not exists payment_requests_recipient_status_created_idx
  on public.payment_requests (recipient_id, status, created_at desc);
```

## `accounts`

If account balances are persisted in Supabase, add or extend an account table with:

- `id uuid primary key` or stable text id for demo compatibility.
- `owner_id text not null`.
- `display_name text not null`.
- `currency text not null`.
- `balance numeric not null check (balance >= 0)`.
- `account_code text not null`.
- `created_at timestamptz not null default now()`.
- `updated_at timestamptz not null default now()`.

Recommended indexes:

```sql
create index if not exists accounts_owner_currency_idx
  on public.accounts (owner_id, currency);
```

If implementation keeps balances in deterministic demo data for local fallback, the same fields must exist in `src/mock-data.js` so API/helper tests can verify eligibility and deduction behavior.

## `payment_transactions`

New table for successful payment records.

- `id uuid primary key default gen_random_uuid()`.
- `payment_request_id uuid not null references public.payment_requests(id)`.
- `type text not null check (type in ('payment'))`.
- `amount numeric not null check (amount > 0)`.
- `currency text not null`.
- `status text not null check (status in ('succeeded'))`.
- `source_account_id text not null`.
- `created_at timestamptz not null default now()`.

Constraints:

```sql
create unique index if not exists payment_transactions_request_success_idx
  on public.payment_transactions (payment_request_id)
  where status = 'succeeded';
```

This unique index is the persistence-level idempotency guard for duplicate payment attempts.

## `ledger_entries`

New table for accounting entries.

- `id uuid primary key default gen_random_uuid()`.
- `transaction_id uuid not null references public.payment_transactions(id)`.
- `account_id text not null`.
- `entry_type text not null check (entry_type in ('debit', 'credit'))`.
- `amount numeric not null check (amount > 0)`.
- `currency text not null`.
- `account_code text not null`.
- `created_at timestamptz not null default now()`.

Recommended indexes:

```sql
create index if not exists ledger_entries_transaction_idx
  on public.ledger_entries (transaction_id);
```

Rules:

- A successful payment transaction must have at least one debit and at least one credit entry.
- For each transaction, total debit amount must equal total credit amount in the same currency.
- API tests must verify this invariant after a successful payment.

## Atomicity

The payment implementation must treat the following as one completed outcome:

1. Source account balance reduced by request amount.
2. Payment request marked `paid`.
3. One successful payment transaction inserted.
4. Balanced ledger entries inserted.

If any step cannot be completed, all prior changes in the payment attempt must be rolled back or avoided. In Supabase/Postgres, prefer a transaction/RPC function for production-style atomicity. For this demo's lightweight handler tests, use a single server-owned operation with guarded updates and test doubles that prove no partial result is returned or retained on simulated failures.
