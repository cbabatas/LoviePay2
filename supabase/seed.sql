-- Demo seed data for LoviePay.
-- Idempotent: safe to re-run.

insert into public.accounts
  (id, owner_id, display_name, account_number, account_type, currency, balance, created_at, updated_at)
values
  -- Ayla (demo user) accounts
  ('user_001_acct_eur',        'user_001', 'Everyday EUR', 'FI21 1234 5600 0007 85',      'current_account', 'EUR',  412, now(), now()),
  ('user_001_acct_usd',      'user_001', 'Travel USD',   'US42 9988 7766 5544 33',      'current_account', 'USD',  280, now(), now()),
  ('user_001_acct_gbp',      'user_001', 'Family GBP',   'GB29 NWBK 6016 1331 9268 19', 'term_deposit',    'GBP',   56, now(), now()),
  -- Friend accounts referenced as receiver_account on incoming requests
  ('user_002_acct_eur',  'user_002',    'Everyday EUR', 'FI19 1010 0001 0001 11',      'current_account', 'EUR', 1000, now(), now()),
  ('user_006_acct_usd',  'user_006',    'Travel USD',   'US10 0005 0005 0005 0105',    'current_account', 'USD', 1000, now(), now()),
  ('user_007_acct_gbp',  'user_007',    'GBP Account',  'GB29 NWBK 0006 0006 0606 06', 'current_account', 'GBP', 1000, now(), now()),
  ('user_008_acct_eur',  'user_008',    'Personal EUR', 'FI19 1010 0007 0001 11',      'current_account', 'EUR', 1000, now(), now())
on conflict (id) do nothing;

insert into public.payment_requests
  (id, sender_id, recipient_id, receiver_account_id, amount, currency, note, status, hash, shareable_link, created_at, updated_at)
values
  -- Outgoing: Ayla requests money from friends → receiver_account is Ayla's
  ('e039ca67-aa00-4bb6-a69f-86051c725ea4', 'user_001', 'user_002',    'user_001_acct_eur',       125.50, 'EUR', 'Dinner split',                   'pending',   'hash_outgoing_001', '/r/hash_outgoing_001', '2026-05-06T12:00:00Z', '2026-05-06T12:00:00Z'),
  ('4ef20f5a-830b-4867-a0ec-d3ea6b6ea4e6', 'user_001', 'user_003',    'user_001_acct_usd',      48.75, 'USD', 'Taxi share',                     'withdrawn', 'hash_outgoing_002', '/r/hash_outgoing_002', '2026-05-05T09:30:00Z', '2026-05-05T10:00:00Z'),
  ('35eda6a1-6831-4467-8488-6f2fd8976251', 'user_001', 'user_004',    'user_001_acct_gbp',     210.00, 'GBP', '',                               'pending',   'hash_outgoing_003', '/r/hash_outgoing_003', '2026-05-04T16:15:00Z', '2026-05-04T16:15:00Z'),
  -- Incoming: friends request money from Ayla → receiver_account is the friend's
  ('33b2d1b5-cc13-4e06-af1d-f4b2c52e79e1', 'user_002',    'user_001', 'user_002_acct_eur',  88.00, 'EUR', 'Concert ticket',                 'pending',   'hash_incoming_001', '/r/hash_incoming_001', '2026-05-06T13:00:00Z', '2026-05-06T13:00:00Z'),
  ('a5099a43-d5d1-494a-b4cf-533c16eaf721', 'user_006',    'user_001', 'user_006_acct_usd',  32.40, 'USD', 'Birthday gift split',            'declined',  'hash_incoming_002', '/r/hash_incoming_002', '2026-05-03T09:00:00Z', '2026-05-03T11:30:00Z'),
  ('8ee581ea-8fb8-46bb-b4f8-8bbf488007b6', 'user_007',    'user_001', 'user_007_acct_gbp',  56.00, 'GBP', 'Boundary case (exactly 7 days)', 'expired',   'hash_incoming_003', '/r/hash_incoming_003', '2026-04-29T13:00:00Z', '2026-04-29T13:00:00Z'),
  ('d9ba4e1b-ecd4-4fe8-a13d-f8d7c69d1fe6', 'user_008',    'user_001', 'user_008_acct_eur', 145.75, 'EUR', 'Old shared dinner',              'expired',   'hash_incoming_004', '/r/hash_incoming_004', '2026-04-15T10:00:00Z', '2026-04-15T10:00:00Z')
on conflict (id) do nothing;
