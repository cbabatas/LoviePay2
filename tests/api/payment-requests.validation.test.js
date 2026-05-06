import test from "node:test";
import assert from "node:assert/strict";
import {
  createPaymentRequest,
  getOutgoingPaymentRequest,
  listOutgoingPaymentRequests,
  withdrawOutgoingPaymentRequest
} from "../../api/payment-requests.js";
import { demoUser, friends } from "../../src/mock-data.js";
import {
  canWithdrawPaymentRequest,
  filterOutgoingPaymentRequests,
  searchFriends,
  validatePaymentRequestForm
} from "../../src/payment-request.js";

function createSupabaseMock({ data, error } = {}) {
  const calls = [];
  const supabase = {
    from(table) {
      calls.push({ table, payload: null });
      return {
        insert(payload) {
          calls.at(-1).payload = payload;
          return {
            select() {
              return {
                single() {
                  return Promise.resolve({
                    data: data ?? { id: "request_001", ...payload },
                    error: error ?? null
                  });
                }
              };
            }
          };
        }
      };
    }
  };

  return { supabase, calls };
}

function createMultiTableSupabaseMock(initialTables, options = {}) {
  const tables = {};
  for (const [name, rows] of Object.entries(initialTables ?? {})) {
    tables[name] = (rows ?? []).map((row) => ({ ...row }));
  }
  const calls = [];
  const failures = options.failures ?? {};

  function applyFilters(rows, filters) {
    return rows.filter((row) =>
      filters.every((filter) => row[filter.field] === filter.value)
    );
  }

  const supabase = {
    from(tableName) {
      if (!tables[tableName]) tables[tableName] = [];
      const rows = tables[tableName];
      const tableFailures = failures[tableName] ?? {};

      const call = {
        table: tableName,
        operation: "select",
        filters: [],
        orderBy: null,
        updatePayload: null,
        insertPayload: null,
        deletePayload: null
      };
      calls.push(call);

      const builder = {
        select(columns = "*") {
          call.select = columns;
          return builder;
        },
        eq(field, value) {
          call.filters.push({ field, value });
          return builder;
        },
        order(field, orderOptions) {
          call.orderBy = { field, ...orderOptions };
          if (tableFailures.list || tableFailures.select) {
            return Promise.resolve({
              data: null,
              error: tableFailures.list ?? tableFailures.select
            });
          }
          const matched = applyFilters(rows, call.filters)
            .map((row) => ({ ...row }))
            .sort((a, b) => {
              const aVal = a[field];
              const bVal = b[field];
              const aTime = new Date(aVal).getTime();
              const bTime = new Date(bVal).getTime();
              if (Number.isNaN(aTime) || Number.isNaN(bTime)) {
                if (aVal < bVal) return orderOptions?.ascending === false ? 1 : -1;
                if (aVal > bVal) return orderOptions?.ascending === false ? -1 : 1;
                return 0;
              }
              return orderOptions?.ascending === false ? bTime - aTime : aTime - bTime;
            });
          return Promise.resolve({ data: matched, error: null });
        },
        maybeSingle() {
          if (call.operation === "update") {
            if (tableFailures.update) {
              return Promise.resolve({ data: null, error: tableFailures.update });
            }
            const row = applyFilters(rows, call.filters)[0];
            if (!row) return Promise.resolve({ data: null, error: null });
            Object.assign(row, call.updatePayload);
            return Promise.resolve({ data: { ...row }, error: null });
          }
          if (tableFailures.select) {
            return Promise.resolve({ data: null, error: tableFailures.select });
          }
          const row = applyFilters(rows, call.filters)[0] ?? null;
          return Promise.resolve({ data: row ? { ...row } : null, error: null });
        },
        single() {
          if (call.operation === "insert") {
            if (tableFailures.insert) {
              return Promise.resolve({ data: null, error: tableFailures.insert });
            }
            const inserted = Array.isArray(call.insertPayload)
              ? call.insertPayload[0]
              : call.insertPayload;
            if (Array.isArray(call.insertPayload)) {
              for (const row of call.insertPayload) rows.push({ ...row });
            } else {
              rows.push({ ...inserted });
            }
            return Promise.resolve({ data: { ...inserted }, error: null });
          }
          const row = applyFilters(rows, call.filters)[0] ?? null;
          return Promise.resolve({ data: row ? { ...row } : null, error: null });
        },
        update(payload) {
          call.operation = "update";
          call.updatePayload = payload;
          return builder;
        },
        insert(payload) {
          call.operation = "insert";
          call.insertPayload = payload;
          let inserted = false;
          function commit() {
            if (inserted) return;
            inserted = true;
            if (Array.isArray(payload)) {
              for (const row of payload) rows.push({ ...row });
            } else {
              rows.push({ ...payload });
            }
          }
          function arrayResult() {
            if (tableFailures.insert) return { data: null, error: tableFailures.insert };
            commit();
            const data = Array.isArray(payload)
              ? payload.map((r) => ({ ...r }))
              : [{ ...payload }];
            return { data, error: null };
          }
          function singleResult() {
            if (tableFailures.insert) return { data: null, error: tableFailures.insert };
            commit();
            const first = Array.isArray(payload) ? payload[0] : payload;
            return { data: first ? { ...first } : null, error: null };
          }
          const insertChain = {
            select() {
              const selectChain = {
                single() {
                  return Promise.resolve(singleResult());
                },
                then(resolve, reject) {
                  return Promise.resolve(arrayResult()).then(resolve, reject);
                }
              };
              return selectChain;
            },
            then(resolve, reject) {
              return Promise.resolve(arrayResult()).then(resolve, reject);
            }
          };
          return insertChain;
        },
        delete() {
          call.operation = "delete";
          return {
            eq(field, value) {
              call.filters.push({ field, value });
              const before = rows.length;
              for (let i = rows.length - 1; i >= 0; i -= 1) {
                if (call.filters.every((filter) => rows[i][filter.field] === filter.value)) {
                  rows.splice(i, 1);
                }
              }
              return Promise.resolve({ data: null, error: null, count: before - rows.length });
            }
          };
        }
      };

      return builder;
    }
  };

  return { supabase, tables, calls };
}

function createReadUpdateSupabaseMock(initialRows, options = {}) {
  const rows = initialRows.map((row) => ({ ...row }));
  const calls = [];

  function applyFilters(call) {
    return rows.filter((row) =>
      call.filters.every((filter) => row[filter.field] === filter.value)
    );
  }

  const supabase = {
    from(table) {
      const call = {
        table,
        filters: [],
        orderBy: null,
        updatePayload: null,
        operation: "select"
      };
      calls.push(call);

      const builder = {
        select(columns = "*") {
          call.select = columns;
          return builder;
        },
        eq(field, value) {
          call.filters.push({ field, value });
          return builder;
        },
        order(field, orderOptions) {
          call.orderBy = { field, ...orderOptions };
          if (options.listError) {
            return Promise.resolve({ data: null, error: options.listError });
          }
          const data = applyFilters(call).sort(
            (a, b) => new Date(b[field]).getTime() - new Date(a[field]).getTime()
          );
          return Promise.resolve({ data, error: null });
        },
        maybeSingle() {
          if (call.operation === "update") {
            if (options.updateError) {
              return Promise.resolve({ data: null, error: options.updateError });
            }
            const row = applyFilters(call)[0] ?? null;
            if (!row) return Promise.resolve({ data: null, error: null });
            Object.assign(row, call.updatePayload);
            return Promise.resolve({ data: { ...row }, error: null });
          }

          if (options.selectError) {
            return Promise.resolve({ data: null, error: options.selectError });
          }
          const row = applyFilters(call)[0] ?? null;
          return Promise.resolve({ data: row ? { ...row } : null, error: null });
        },
        update(payload) {
          call.operation = "update";
          call.updatePayload = payload;
          return builder;
        }
      };

      return builder;
    }
  };

  return { supabase, calls, rows };
}

async function createWithMock(payload, options = {}) {
  const { supabase, calls } = createSupabaseMock(options.supabaseResult);
  const result = await createPaymentRequest(payload, {
    supabase,
    generateHash: () => "fixed-public-hash",
    now: () => new Date("2026-05-06T12:00:00.000Z"),
    ...options
  });

  return { result, calls };
}

test("creates a pending payment request with derived fields and Supabase insert payload", async () => {
  const { result, calls } = await createWithMock({
    recipientId: "friend_001",
    receiverAccountId: "acct_eur_main",
    amount: "125.50",
    note: " Dinner split "
  });

  assert.equal(result.ok, true);
  assert.equal(result.statusCode, 201);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].table, "payment_requests");
  assert.deepEqual(calls[0].payload, {
    sender_id: "demo_user_001",
    recipient_id: "friend_001",
    receiver_account_id: "acct_eur_main",
    amount: 125.5,
    currency: "EUR",
    note: "Dinner split",
    status: "pending",
    hash: "fixed-public-hash",
    shareable_link: "/r/fixed-public-hash",
    created_at: "2026-05-06T12:00:00.000Z"
  });
  assert.deepEqual(result.body.paymentRequest, {
    id: "request_001",
    senderId: "demo_user_001",
    recipientId: "friend_001",
    receiverAccountId: "acct_eur_main",
    amount: 125.5,
    currency: "EUR",
    note: "Dinner split",
    status: "pending",
    hash: "fixed-public-hash",
    shareableLink: "/r/fixed-public-hash",
    createdAt: "2026-05-06T12:00:00.000Z"
  });
});

test("returns unique hashes for separate successful creations", async () => {
  let hashIndex = 0;
  const hashes = ["hash-one", "hash-two"];
  const { supabase, calls } = createSupabaseMock();
  const baseOptions = {
    supabase,
    generateHash: () => hashes[hashIndex++],
    now: () => new Date("2026-05-06T12:00:00.000Z")
  };
  const payload = {
    recipientId: "friend_001",
    receiverAccountId: "acct_eur_main",
    amount: 10
  };

  const first = await createPaymentRequest(payload, baseOptions);
  const second = await createPaymentRequest(payload, baseOptions);

  assert.equal(first.statusCode, 201);
  assert.equal(second.statusCode, 201);
  assert.notEqual(first.body.paymentRequest.hash, second.body.paymentRequest.hash);
  assert.equal(first.body.paymentRequest.shareableLink, "/r/hash-one");
  assert.equal(second.body.paymentRequest.shareableLink, "/r/hash-two");
  assert.equal(calls.length, 2);
});

test("returns request_creation_failed when Supabase insert fails", async () => {
  const { result, calls } = await createWithMock(
    {
      recipientId: "friend_001",
      receiverAccountId: "acct_eur_main",
      amount: 25
    },
    {
      supabaseResult: {
        error: { message: "insert failed" }
      }
    }
  );

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 500);
  assert.deepEqual(result.body.error, {
    code: "request_creation_failed",
    message: "The request could not be created. Try again."
  });
  assert.equal(calls.length, 1);
});

const invalidCases = [
  {
    name: "invalid amount",
    payload: { recipientId: "friend_001", receiverAccountId: "acct_eur_main", amount: 0 },
    code: "invalid_amount"
  },
  {
    name: "malformed payload",
    payload: null,
    code: "invalid_amount"
  },
  {
    name: "missing recipient",
    payload: { receiverAccountId: "acct_eur_main", amount: 10 },
    code: "recipient_required"
  },
  {
    name: "nonexistent recipient",
    payload: { recipientId: "friend_missing", receiverAccountId: "acct_eur_main", amount: 10 },
    code: "recipient_not_found"
  },
  {
    name: "inactive recipient",
    payload: { recipientId: "friend_004", receiverAccountId: "acct_eur_main", amount: 10 },
    code: "recipient_inactive"
  },
  {
    name: "self recipient",
    payload: { recipientId: "demo_user_001", receiverAccountId: "acct_eur_main", amount: 10 },
    code: "self_recipient_not_allowed",
    options: { friendList: [demoUser, ...friends] }
  },
  {
    name: "missing receiver account",
    payload: { recipientId: "friend_001", amount: 10 },
    code: "receiver_account_required"
  },
  {
    name: "nonexistent receiver account",
    payload: { recipientId: "friend_001", receiverAccountId: "acct_missing", amount: 10 },
    code: "receiver_account_not_found"
  },
  {
    name: "unsupported currency",
    payload: { recipientId: "friend_001", receiverAccountId: "acct_jpy", amount: 10 },
    code: "unsupported_currency",
    options: {
      currentUser: {
        ...demoUser,
        receiverAccounts: [
          ...demoUser.receiverAccounts,
          { id: "acct_jpy", label: "JPY", currency: "JPY" }
        ]
      }
    }
  }
];

for (const item of invalidCases) {
  test(`rejects ${item.name} before Supabase insert`, async () => {
    const { result, calls } = await createWithMock(item.payload, item.options);

    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 400);
    assert.equal(result.body.error.code, item.code);
    assert.equal(typeof result.body.error.message, "string");
    assert.equal(calls.length, 0);
  });
}

for (const field of [
  "senderId",
  "sender_id",
  "currency",
  "status",
  "hash",
  "shareableLink",
  "shareable_link",
  "createdAt",
  "created_at"
]) {
  test(`rejects forbidden client-derived field ${field} before Supabase insert`, async () => {
    const { result, calls } = await createWithMock({
      recipientId: "friend_001",
      receiverAccountId: "acct_eur_main",
      amount: 10,
      [field]: "client-value"
    });

    assert.equal(result.ok, false);
    assert.equal(result.statusCode, 400);
    assert.deepEqual(result.body.error, {
      code: "request_creation_failed",
      message: "The request could not be created. Try again."
    });
    assert.equal(calls.length, 0);
  });
}

test("searches active friends by name, email, and phone", () => {
  assert.deepEqual(
    searchFriends("mika").map((friend) => friend.id),
    ["friend_001"]
  );
  assert.deepEqual(
    searchFriends("leila.santos@example.test").map((friend) => friend.id),
    ["friend_002"]
  );
  assert.deepEqual(
    searchFriends("+46 70").map((friend) => friend.id),
    ["friend_003"]
  );
});

test("search filters inactive friends, excludes current user, and returns empty results", () => {
  assert.deepEqual(searchFriends("Noora"), []);
  assert.deepEqual(searchFriends("Ayla", [demoUser, ...friends]), []);
  assert.deepEqual(searchFriends("not-a-match"), []);
});

test("client form validation composes valid request values", () => {
  const result = validatePaymentRequestForm({
    recipientId: "friend_001",
    receiverAccountId: "acct_usd_travel",
    amount: "45.25",
    note: " Lunch "
  });

  assert.equal(result.ok, true);
  assert.deepEqual(result.value, {
    recipientId: "friend_001",
    receiverAccountId: "acct_usd_travel",
    amount: 45.25,
    note: "Lunch",
    currency: "USD"
  });
});

const outgoingRows = [
  {
    id: "req_new_pending",
    sender_id: "demo_user_001",
    recipient_id: "friend_001",
    receiver_account_id: "acct_eur_main",
    amount: 125.5,
    currency: "EUR",
    note: "Dinner split",
    status: "pending",
    hash: "hash_new_pending",
    shareable_link: "/r/hash_new_pending",
    created_at: "2026-05-06T12:00:00.000Z",
    updated_at: "2026-05-06T12:00:00.000Z"
  },
  {
    id: "req_old_withdrawn",
    sender_id: "demo_user_001",
    recipient_id: "friend_002",
    receiver_account_id: "acct_usd_travel",
    amount: 48.75,
    currency: "USD",
    note: "Taxi",
    status: "withdrawn",
    hash: "hash_old_withdrawn",
    shareable_link: "/r/hash_old_withdrawn",
    created_at: "2026-05-05T09:30:00.000Z",
    updated_at: "2026-05-05T10:00:00.000Z"
  },
  {
    id: "req_incoming",
    sender_id: "friend_001",
    recipient_id: "demo_user_001",
    receiver_account_id: "acct_eur_main",
    amount: 88,
    currency: "EUR",
    note: "Incoming",
    status: "pending",
    hash: "hash_incoming",
    shareable_link: "/r/hash_incoming",
    created_at: "2026-05-07T12:00:00.000Z",
    updated_at: "2026-05-07T12:00:00.000Z"
  }
];

test("lists outgoing requests with sender scoping, newest-first ordering, and client mapping", async () => {
  const { supabase, calls } = createReadUpdateSupabaseMock(outgoingRows);
  const result = await listOutgoingPaymentRequests({ supabase });

  assert.equal(result.ok, true);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(
    result.body.paymentRequests.map((request) => request.id),
    ["req_new_pending", "req_old_withdrawn"]
  );
  assert.deepEqual(result.body.paymentRequests[0], {
    id: "req_new_pending",
    senderId: "demo_user_001",
    recipientId: "friend_001",
    receiverAccountId: "acct_eur_main",
    amount: 125.5,
    currency: "EUR",
    note: "Dinner split",
    status: "pending",
    hash: "hash_new_pending",
    shareableLink: "/r/hash_new_pending",
    createdAt: "2026-05-06T12:00:00.000Z",
    updatedAt: "2026-05-06T12:00:00.000Z"
  });
  assert.deepEqual(calls[0].filters, [{ field: "sender_id", value: "demo_user_001" }]);
});

test("filters outgoing requests by status and recipient details without incoming leakage", () => {
  const clientRequests = [
    {
      id: "req_new_pending",
      senderId: "demo_user_001",
      recipientId: "friend_001",
      amount: 125.5,
      currency: "EUR",
      status: "pending",
      createdAt: "2026-05-06T12:00:00.000Z"
    },
    {
      id: "req_old_withdrawn",
      senderId: "demo_user_001",
      recipientId: "friend_002",
      amount: 48.75,
      currency: "USD",
      status: "withdrawn",
      createdAt: "2026-05-05T09:30:00.000Z"
    },
    {
      id: "req_incoming",
      senderId: "friend_001",
      recipientId: "demo_user_001",
      amount: 88,
      currency: "EUR",
      status: "pending",
      createdAt: "2026-05-07T12:00:00.000Z"
    }
  ];

  assert.deepEqual(
    filterOutgoingPaymentRequests(clientRequests, { status: "pending" }).map((request) => request.id),
    ["req_new_pending"]
  );
  assert.deepEqual(
    filterOutgoingPaymentRequests(clientRequests, { recipientQuery: "leila.santos@example.test" }).map(
      (request) => request.id
    ),
    ["req_old_withdrawn"]
  );
  assert.deepEqual(filterOutgoingPaymentRequests(clientRequests, { recipientQuery: "no match" }), []);
  assert.deepEqual(
    filterOutgoingPaymentRequests(clientRequests, {}).map((request) => request.id),
    ["req_new_pending", "req_old_withdrawn"]
  );
});

test("gets outgoing detail and hides incoming or missing records as request_not_found", async () => {
  const success = createReadUpdateSupabaseMock(outgoingRows);
  const result = await getOutgoingPaymentRequest("req_new_pending", { supabase: success.supabase });
  assert.equal(result.ok, true);
  assert.equal(result.body.paymentRequest.id, "req_new_pending");
  assert.deepEqual(success.calls[0].filters, [
    { field: "id", value: "req_new_pending" },
    { field: "sender_id", value: "demo_user_001" }
  ]);

  const incoming = createReadUpdateSupabaseMock(outgoingRows);
  const incomingResult = await getOutgoingPaymentRequest("req_incoming", {
    supabase: incoming.supabase
  });
  assert.equal(incomingResult.ok, false);
  assert.equal(incomingResult.statusCode, 404);
  assert.equal(incomingResult.body.error.code, "request_not_found");

  const missing = createReadUpdateSupabaseMock(outgoingRows);
  const missingResult = await getOutgoingPaymentRequest("missing", { supabase: missing.supabase });
  assert.equal(missingResult.ok, false);
  assert.equal(missingResult.body.error.code, "request_not_found");
});

test("withdraw requires confirmation and transitions pending outgoing requests to withdrawn", async () => {
  const missingConfirmation = await withdrawOutgoingPaymentRequest("req_new_pending", {}, {
    supabase: createReadUpdateSupabaseMock(outgoingRows).supabase
  });
  assert.equal(missingConfirmation.statusCode, 400);
  assert.equal(missingConfirmation.body.error.code, "withdraw_confirmation_required");

  const { supabase, calls } = createReadUpdateSupabaseMock(outgoingRows);
  const result = await withdrawOutgoingPaymentRequest(
    "req_new_pending",
    { confirm: true },
    { supabase, now: () => new Date("2026-05-06T12:05:00.000Z") }
  );

  assert.equal(result.ok, true);
  assert.equal(result.body.paymentRequest.status, "withdrawn");
  assert.equal(result.body.paymentRequest.updatedAt, "2026-05-06T12:05:00.000Z");
  const updateCall = calls.find((call) => call.operation === "update");
  assert.deepEqual(updateCall.updatePayload, {
    status: "withdrawn",
    updated_at: "2026-05-06T12:05:00.000Z"
  });
  assert.deepEqual(updateCall.filters, [
    { field: "id", value: "req_new_pending" },
    { field: "sender_id", value: "demo_user_001" },
    { field: "status", value: "pending" }
  ]);
});

test("withdraw blocks non-sender, ineligible, and failed updates with stable error codes", async () => {
  const nonSender = await withdrawOutgoingPaymentRequest(
    "req_incoming",
    { confirm: true },
    { supabase: createReadUpdateSupabaseMock(outgoingRows).supabase }
  );
  assert.equal(nonSender.statusCode, 404);
  assert.equal(nonSender.body.error.code, "request_not_found");

  const ineligible = await withdrawOutgoingPaymentRequest(
    "req_old_withdrawn",
    { confirm: true },
    { supabase: createReadUpdateSupabaseMock(outgoingRows).supabase }
  );
  assert.equal(ineligible.statusCode, 409);
  assert.equal(ineligible.body.error.code, "withdraw_not_allowed");

  const failed = await withdrawOutgoingPaymentRequest(
    "req_new_pending",
    { confirm: true },
    {
      supabase: createReadUpdateSupabaseMock(outgoingRows, {
        updateError: { message: "update failed" }
      }).supabase
    }
  );
  assert.equal(failed.statusCode, 500);
  assert.equal(failed.body.error.code, "request_update_failed");
});

test("withdrawal eligibility helper only allows pending requests", () => {
  assert.equal(canWithdrawPaymentRequest({ status: "pending" }), true);
  assert.equal(canWithdrawPaymentRequest({ status: "withdrawn" }), false);
  assert.equal(canWithdrawPaymentRequest(null), false);
});

import {
  listIncomingPaymentRequests,
  getIncomingPaymentRequest,
  declineIncomingPaymentRequest
} from "../../api/payment-requests.js";
import { filterIncomingPaymentRequests } from "../../src/payment-request.js";

const incomingNow = () => new Date("2026-05-06T13:00:00.000Z");

const incomingRows = [
  {
    id: "req_in_recent",
    sender_id: "friend_001",
    recipient_id: "demo_user_001",
    receiver_account_id: "acct_eur_main",
    amount: 88,
    currency: "EUR",
    note: "Dinner",
    status: "pending",
    hash: "hash_in_recent",
    shareable_link: "/r/hash_in_recent",
    created_at: "2026-05-05T12:00:00.000Z",
    updated_at: "2026-05-05T12:00:00.000Z"
  },
  {
    id: "req_in_old_declined",
    sender_id: "friend_002",
    recipient_id: "demo_user_001",
    receiver_account_id: "acct_usd_travel",
    amount: 22.5,
    currency: "USD",
    note: "Movie",
    status: "declined",
    hash: "hash_in_old_declined",
    shareable_link: "/r/hash_in_old_declined",
    created_at: "2026-05-01T08:00:00.000Z",
    updated_at: "2026-05-02T08:00:00.000Z"
  },
  {
    id: "req_outgoing",
    sender_id: "demo_user_001",
    recipient_id: "friend_003",
    receiver_account_id: "acct_eur_main",
    amount: 60,
    currency: "EUR",
    note: "Bus",
    status: "pending",
    hash: "hash_out",
    shareable_link: "/r/hash_out",
    created_at: "2026-05-06T11:00:00.000Z",
    updated_at: "2026-05-06T11:00:00.000Z"
  }
];

test("listIncomingPaymentRequests returns recipient-scoped rows newest-first with derived fields", async () => {
  const { supabase } = createReadUpdateSupabaseMock(incomingRows);
  const result = await listIncomingPaymentRequests({ supabase, now: incomingNow });

  assert.equal(result.ok, true);
  assert.equal(result.statusCode, 200);
  const ids = result.body.paymentRequests.map((r) => r.id);
  assert.deepEqual(ids, ["req_in_recent", "req_in_old_declined"]);
  assert.equal(ids.includes("req_outgoing"), false);

  const first = result.body.paymentRequests[0];
  assert.equal(first.id, "req_in_recent");
  assert.equal(first.expiresAt, "2026-05-12T12:00:00.000Z");
  assert.equal(typeof first.daysRemaining, "number");
  assert.equal(first.daysRemaining, 5);

  const second = result.body.paymentRequests[1];
  assert.equal(second.daysRemaining, 0);
  assert.equal(second.expiresAt, "2026-05-08T08:00:00.000Z");
});

test("listIncomingPaymentRequests promotes pending rows past expiry to expired and updates Supabase", async () => {
  const expiredCreatedAt = "2026-04-29T13:00:00.000Z";
  const rows = [
    {
      id: "req_in_expiring",
      sender_id: "friend_001",
      recipient_id: "demo_user_001",
      receiver_account_id: "acct_eur_main",
      amount: 30,
      currency: "EUR",
      note: "Coffee",
      status: "pending",
      hash: "hash_in_expiring",
      shareable_link: "/r/hash_in_expiring",
      created_at: expiredCreatedAt,
      updated_at: expiredCreatedAt
    }
  ];

  const { supabase, calls } = createReadUpdateSupabaseMock(rows);
  const result = await listIncomingPaymentRequests({ supabase, now: incomingNow });

  assert.equal(result.ok, true);
  const [request] = result.body.paymentRequests;
  assert.equal(request.status, "expired");
  assert.equal(request.daysRemaining, 0);
  assert.equal(request.updatedAt, "2026-05-06T13:00:00.000Z");

  const updateCall = calls.find(
    (call) => call.operation === "update" && call.updatePayload?.status === "expired"
  );
  assert.ok(updateCall, "expected an update call promoting the row to expired");
  assert.equal(updateCall.updatePayload.updated_at, "2026-05-06T13:00:00.000Z");
});

test("listIncomingPaymentRequests returns incoming_list_failed when Supabase select fails", async () => {
  const { supabase } = createReadUpdateSupabaseMock(incomingRows, {
    listError: { message: "boom" }
  });
  const result = await listIncomingPaymentRequests({ supabase, now: incomingNow });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 500);
  assert.equal(result.body.error.code, "incoming_list_failed");
});

test("filterIncomingPaymentRequests filters by status, senderQuery, and intersects them", () => {
  const clientRequests = [
    {
      id: "r1",
      senderId: "friend_001",
      recipientId: "demo_user_001",
      amount: 88,
      currency: "EUR",
      note: "Dinner",
      status: "pending",
      createdAt: "2026-05-05T12:00:00.000Z"
    },
    {
      id: "r2",
      senderId: "friend_002",
      recipientId: "demo_user_001",
      amount: 22.5,
      currency: "USD",
      note: "Movie",
      status: "declined",
      createdAt: "2026-05-01T08:00:00.000Z"
    },
    {
      id: "r3",
      senderId: "friend_003",
      recipientId: "demo_user_001",
      amount: 60,
      currency: "EUR",
      note: "Bus ride",
      status: "expired",
      createdAt: "2026-04-20T08:00:00.000Z"
    },
    {
      id: "r4",
      senderId: "friend_001",
      recipientId: "demo_user_001",
      amount: 12,
      currency: "EUR",
      note: "Snack",
      status: "pending",
      createdAt: "2026-05-04T12:00:00.000Z"
    }
  ];

  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, { status: "pending" }, friends).map((r) => r.id),
    ["r1", "r4"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, { status: "declined" }, friends).map((r) => r.id),
    ["r2"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, { status: "expired" }, friends).map((r) => r.id),
    ["r3"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, {}, friends).map((r) => r.id),
    ["r1", "r2", "r3", "r4"]
  );

  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, { senderQuery: "Mika" }, friends).map((r) => r.id),
    ["r1", "r4"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(
      clientRequests,
      { senderQuery: "leila.santos@example.test" },
      friends
    ).map((r) => r.id),
    ["r2"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, { senderQuery: "+46 70" }, friends).map((r) => r.id),
    ["r3"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, { senderQuery: "snack" }, friends).map((r) => r.id),
    ["r4"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, { senderQuery: "USD" }, friends).map((r) => r.id),
    ["r2"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, { senderQuery: "22.5" }, friends).map((r) => r.id),
    ["r2"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(clientRequests, { senderQuery: "2026-05-05" }, friends).map(
      (r) => r.id
    ),
    ["r1"]
  );

  assert.deepEqual(
    filterIncomingPaymentRequests(
      clientRequests,
      { status: "pending", senderQuery: "Mika" },
      friends
    ).map((r) => r.id),
    ["r1", "r4"]
  );
  assert.deepEqual(
    filterIncomingPaymentRequests(
      clientRequests,
      { status: "declined", senderQuery: "Mika" },
      friends
    ),
    []
  );
});

test("getIncomingPaymentRequest returns recipient-scoped row with derived fields", async () => {
  const { supabase } = createReadUpdateSupabaseMock(incomingRows);
  const result = await getIncomingPaymentRequest("req_in_recent", {
    supabase,
    now: incomingNow
  });

  assert.equal(result.ok, true);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.paymentRequest.id, "req_in_recent");
  assert.equal(result.body.paymentRequest.expiresAt, "2026-05-12T12:00:00.000Z");
  assert.equal(result.body.paymentRequest.daysRemaining, 5);
});

test("getIncomingPaymentRequest returns request_not_found for outgoing rows or unknown ids", async () => {
  const outgoing = await getIncomingPaymentRequest("req_outgoing", {
    supabase: createReadUpdateSupabaseMock(incomingRows).supabase,
    now: incomingNow
  });
  assert.equal(outgoing.ok, false);
  assert.equal(outgoing.statusCode, 404);
  assert.equal(outgoing.body.error.code, "request_not_found");

  const missing = await getIncomingPaymentRequest("nope", {
    supabase: createReadUpdateSupabaseMock(incomingRows).supabase,
    now: incomingNow
  });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.body.error.code, "request_not_found");
});

test("getIncomingPaymentRequest performs read-time expiry promotion at boundary", async () => {
  const rows = [
    {
      id: "req_in_boundary",
      sender_id: "friend_001",
      recipient_id: "demo_user_001",
      receiver_account_id: "acct_eur_main",
      amount: 15,
      currency: "EUR",
      note: "Tea",
      status: "pending",
      hash: "hash_in_boundary",
      shareable_link: "/r/hash_in_boundary",
      created_at: "2026-04-29T13:00:00.000Z",
      updated_at: "2026-04-29T13:00:00.000Z"
    }
  ];

  const { supabase } = createReadUpdateSupabaseMock(rows);
  const result = await getIncomingPaymentRequest("req_in_boundary", {
    supabase,
    now: incomingNow
  });

  assert.equal(result.ok, true);
  assert.equal(result.body.paymentRequest.status, "expired");
  assert.equal(result.body.paymentRequest.updatedAt, "2026-05-06T13:00:00.000Z");
  assert.equal(result.body.paymentRequest.daysRemaining, 0);
});

test("getIncomingPaymentRequest returns incoming_detail_failed on Supabase select error", async () => {
  const { supabase } = createReadUpdateSupabaseMock(incomingRows, {
    selectError: { message: "boom" }
  });
  const result = await getIncomingPaymentRequest("req_in_recent", {
    supabase,
    now: incomingNow
  });

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 500);
  assert.equal(result.body.error.code, "incoming_detail_failed");
});

test("declineIncomingPaymentRequest requires confirm true", async () => {
  const { supabase } = createReadUpdateSupabaseMock(incomingRows);
  const result = await declineIncomingPaymentRequest("req_in_recent", {}, {
    supabase,
    now: incomingNow
  });
  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.error.code, "decline_confirmation_required");
});

test("declineIncomingPaymentRequest rejects non-recipient rows with request_not_found", async () => {
  const { supabase } = createReadUpdateSupabaseMock(incomingRows);
  const result = await declineIncomingPaymentRequest(
    "req_outgoing",
    { confirm: true },
    { supabase, now: incomingNow }
  );
  assert.equal(result.statusCode, 404);
  assert.equal(result.body.error.code, "request_not_found");
});

test("declineIncomingPaymentRequest returns decline_not_allowed for already-declined or withdrawn rows", async () => {
  const declinedRes = await declineIncomingPaymentRequest(
    "req_in_old_declined",
    { confirm: true },
    {
      supabase: createReadUpdateSupabaseMock(incomingRows).supabase,
      now: incomingNow
    }
  );
  assert.equal(declinedRes.statusCode, 409);
  assert.equal(declinedRes.body.error.code, "decline_not_allowed");

  const withdrawnRows = [
    {
      ...incomingRows[0],
      id: "req_in_withdrawn",
      status: "withdrawn"
    }
  ];
  const withdrawnRes = await declineIncomingPaymentRequest(
    "req_in_withdrawn",
    { confirm: true },
    {
      supabase: createReadUpdateSupabaseMock(withdrawnRows).supabase,
      now: incomingNow
    }
  );
  assert.equal(withdrawnRes.statusCode, 409);
  assert.equal(withdrawnRes.body.error.code, "decline_not_allowed");
});

test("declineIncomingPaymentRequest returns 409 with promoted paymentRequest when row was just expired", async () => {
  const rows = [
    {
      id: "req_in_just_expired",
      sender_id: "friend_001",
      recipient_id: "demo_user_001",
      receiver_account_id: "acct_eur_main",
      amount: 15,
      currency: "EUR",
      note: "Tea",
      status: "pending",
      hash: "hash_in_just_expired",
      shareable_link: "/r/hash_in_just_expired",
      created_at: "2026-04-29T13:00:00.000Z",
      updated_at: "2026-04-29T13:00:00.000Z"
    }
  ];

  const { supabase } = createReadUpdateSupabaseMock(rows);
  const result = await declineIncomingPaymentRequest(
    "req_in_just_expired",
    { confirm: true },
    { supabase, now: incomingNow }
  );

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 409);
  assert.equal(result.body.error.code, "decline_not_allowed");
  assert.ok(result.body.paymentRequest, "expected paymentRequest in body");
  assert.equal(result.body.paymentRequest.status, "expired");
  assert.equal(result.body.paymentRequest.daysRemaining, 0);
});

test("declineIncomingPaymentRequest returns request_update_failed when Supabase update errors", async () => {
  const { supabase } = createReadUpdateSupabaseMock(incomingRows, {
    updateError: { message: "update boom" }
  });
  const result = await declineIncomingPaymentRequest(
    "req_in_recent",
    { confirm: true },
    { supabase, now: incomingNow }
  );

  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 500);
  assert.equal(result.body.error.code, "request_update_failed");
});

test("declineIncomingPaymentRequest success transitions pending row to declined with derived fields", async () => {
  const { supabase, calls } = createReadUpdateSupabaseMock(incomingRows);
  const declineNow = () => new Date("2026-05-06T13:30:00.000Z");
  const result = await declineIncomingPaymentRequest(
    "req_in_recent",
    { confirm: true },
    { supabase, now: declineNow }
  );

  assert.equal(result.ok, true);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.paymentRequest.status, "declined");
  assert.equal(result.body.paymentRequest.updatedAt, "2026-05-06T13:30:00.000Z");
  assert.equal(result.body.paymentRequest.expiresAt, "2026-05-12T12:00:00.000Z");
  assert.equal(result.body.paymentRequest.daysRemaining, 0);

  const updateCall = calls.find(
    (call) => call.operation === "update" && call.updatePayload?.status === "declined"
  );
  assert.ok(updateCall, "expected a declined update call");
  assert.deepEqual(updateCall.updatePayload, {
    status: "declined",
    updated_at: "2026-05-06T13:30:00.000Z"
  });
  assert.deepEqual(updateCall.filters, [
    { field: "id", value: "req_in_recent" },
    { field: "recipient_id", value: "demo_user_001" },
    { field: "status", value: "pending" }
  ]);
});

import { payIncomingPaymentRequest } from "../../api/payment-requests.js";
import {
  canPayIncoming,
  defaultSelectedSourceAccountId,
  describeSourceAccountState,
  findEligibleSourceAccounts,
  canConfirmPayment,
  formatStatusLabel,
  PAYMENT_REQUEST_STATUS
} from "../../src/payment-request.js";

const payNow = () => new Date("2026-05-06T13:30:00.000Z");

function buildPayTables(overrides = {}) {
  const requestRows = overrides.requests ?? [
    {
      id: "req_pay_pending",
      sender_id: "friend_001",
      recipient_id: "demo_user_001",
      receiver_account_id: "friend_001_acct_eur",
      amount: 88,
      currency: "EUR",
      note: "Concert ticket",
      status: "pending",
      hash: "hash_pay_pending",
      shareable_link: "/r/hash_pay_pending",
      created_at: "2026-05-06T13:00:00.000Z",
      updated_at: "2026-05-06T13:00:00.000Z"
    }
  ];
  const accountRows = overrides.accounts ?? [
    {
      id: "acct_eur_main",
      owner_id: "demo_user_001",
      display_name: "Everyday EUR",
      account_number: "FI21 1234 5600 0007 85",
      account_type: "current_account",
      currency: "EUR",
      balance: 412,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "acct_usd_travel",
      owner_id: "demo_user_001",
      display_name: "Travel USD",
      account_number: "US42 9988 7766 5544 33",
      account_type: "current_account",
      currency: "USD",
      balance: 280,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z"
    },
    {
      id: "friend_001_acct_eur",
      owner_id: "friend_001",
      display_name: "Everyday EUR",
      account_number: "FI19 1010 0001 0001 11",
      account_type: "current_account",
      currency: "EUR",
      balance: 1000,
      created_at: "2026-05-01T00:00:00.000Z",
      updated_at: "2026-05-01T00:00:00.000Z"
    }
  ];

  return {
    payment_requests: requestRows,
    accounts: accountRows,
    payment_transactions: overrides.payment_transactions ?? [],
    ledger_entries: overrides.ledger_entries ?? []
  };
}

let _payIdSeq = 0;
function payIdGenerator() {
  _payIdSeq = 0;
  return () => {
    _payIdSeq += 1;
    return `pay_id_${_payIdSeq}`;
  };
}

test("payIncomingPaymentRequest pays a pending request, marks it paid, deducts balance, writes one txn and balanced ledger", async () => {
  const { supabase, tables } = createMultiTableSupabaseMock(buildPayTables());

  const result = await payIncomingPaymentRequest(
    "req_pay_pending",
    { confirm: true, sourceAccountId: "acct_eur_main" },
    { supabase, now: payNow, generateId: payIdGenerator() }
  );

  assert.equal(result.ok, true);
  assert.equal(result.statusCode, 200);
  assert.equal(result.body.paymentRequest.status, "paid");
  assert.equal(result.body.paymentRequest.updatedAt, "2026-05-06T13:30:00.000Z");
  assert.equal(result.body.sourceAccount.balance, 324);
  assert.equal(tables.accounts.find((a) => a.id === "acct_eur_main").balance, 324);
  assert.equal(tables.payment_transactions.length, 1);
  assert.equal(tables.payment_transactions[0].status, "succeeded");
  assert.equal(tables.payment_transactions[0].type, "payment");
  assert.equal(tables.payment_transactions[0].amount, 88);
  assert.equal(tables.payment_transactions[0].source_account_id, "acct_eur_main");

  assert.equal(tables.ledger_entries.length, 4);
  const debits = tables.ledger_entries.filter((e) => e.entry_type === "debit");
  const credits = tables.ledger_entries.filter((e) => e.entry_type === "credit");
  assert.equal(debits.length, 2);
  assert.equal(credits.length, 2);
  const debitTotal = debits.reduce((sum, e) => sum + Number(e.amount), 0);
  const creditTotal = credits.reduce((sum, e) => sum + Number(e.amount), 0);
  assert.equal(debitTotal, creditTotal);
  assert.equal(debitTotal, 88 * 2);

  const payerDebit = tables.ledger_entries.find(
    (e) => e.entry_type === "debit" && e.account_id === "acct_eur_main"
  );
  const offsetCredit = tables.ledger_entries.find(
    (e) => e.entry_type === "credit" && e.account_id === "internal_payment_clearing"
  );
  const offsetDebit = tables.ledger_entries.find(
    (e) => e.entry_type === "debit" && e.account_id === "internal_payment_clearing"
  );
  const receiverCredit = tables.ledger_entries.find(
    (e) => e.entry_type === "credit" && e.account_id === "friend_001_acct_eur"
  );

  assert.ok(payerDebit && offsetCredit && offsetDebit && receiverCredit);
  assert.equal(payerDebit.account_code, "10001");
  assert.equal(offsetCredit.account_code, "10000");
  assert.equal(offsetDebit.account_code, "10000");
  assert.equal(receiverCredit.account_code, "10002");

  assert.equal(
    tables.accounts.find((a) => a.id === "friend_001_acct_eur").balance,
    1088
  );
});

test("payIncomingPaymentRequest requires confirm=true", async () => {
  const { supabase } = createMultiTableSupabaseMock(buildPayTables());
  const result = await payIncomingPaymentRequest(
    "req_pay_pending",
    { sourceAccountId: "acct_eur_main" },
    { supabase, now: payNow }
  );
  assert.equal(result.ok, false);
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.error.code, "payment_confirmation_required");
});

test("payIncomingPaymentRequest scopes to current user (recipient_id)", async () => {
  const tablesData = buildPayTables({
    requests: [
      {
        id: "req_pay_outgoing",
        sender_id: "demo_user_001",
        recipient_id: "friend_001",
        receiver_account_id: "friend_001_acct_eur",
        amount: 50,
        currency: "EUR",
        note: "",
        status: "pending",
        hash: "h",
        shareable_link: "/r/h",
        created_at: "2026-05-06T13:00:00.000Z",
        updated_at: "2026-05-06T13:00:00.000Z"
      }
    ]
  });
  const { supabase } = createMultiTableSupabaseMock(tablesData);
  const result = await payIncomingPaymentRequest(
    "req_pay_outgoing",
    { confirm: true, sourceAccountId: "acct_eur_main" },
    { supabase, now: payNow }
  );
  assert.equal(result.statusCode, 404);
  assert.equal(result.body.error.code, "request_not_found");
});

test("payIncomingPaymentRequest blocks non-pending statuses without changing data", async () => {
  for (const status of ["declined", "expired", "withdrawn", "paid"]) {
    const tablesData = buildPayTables({
      requests: [
        {
          id: `req_pay_${status}`,
          sender_id: "friend_001",
          recipient_id: "demo_user_001",
          receiver_account_id: "friend_001_acct_eur",
          amount: 50,
          currency: "EUR",
          note: "",
          status,
          hash: `h_${status}`,
          shareable_link: `/r/h_${status}`,
          created_at: "2026-05-05T13:00:00.000Z",
          updated_at: "2026-05-05T13:00:00.000Z"
        }
      ]
    });
    const { supabase, tables } = createMultiTableSupabaseMock(tablesData);
    const balanceBefore = tables.accounts.find((a) => a.id === "acct_eur_main").balance;
    const result = await payIncomingPaymentRequest(
      `req_pay_${status}`,
      { confirm: true, sourceAccountId: "acct_eur_main" },
      { supabase, now: payNow }
    );
    assert.equal(result.ok, false);
    const expectedCode = status === "paid" ? "payment_already_completed" : "payment_not_allowed";
    assert.equal(result.body.error.code, expectedCode);
    assert.equal(tables.accounts.find((a) => a.id === "acct_eur_main").balance, balanceBefore);
    assert.equal(tables.payment_transactions.length, 0);
    assert.equal(tables.ledger_entries.length, 0);
  }
});

test("payIncomingPaymentRequest promotes stale pending past expiry to expired and blocks", async () => {
  const tablesData = buildPayTables({
    requests: [
      {
        id: "req_pay_stale",
        sender_id: "friend_001",
        recipient_id: "demo_user_001",
        receiver_account_id: "friend_001_acct_eur",
        amount: 50,
        currency: "EUR",
        note: "",
        status: "pending",
        hash: "h_stale",
        shareable_link: "/r/h_stale",
        created_at: "2026-04-29T13:00:00.000Z",
        updated_at: "2026-04-29T13:00:00.000Z"
      }
    ]
  });
  const { supabase, tables } = createMultiTableSupabaseMock(tablesData);
  const result = await payIncomingPaymentRequest(
    "req_pay_stale",
    { confirm: true, sourceAccountId: "acct_eur_main" },
    { supabase, now: payNow }
  );
  assert.equal(result.statusCode, 409);
  assert.equal(result.body.error.code, "payment_not_allowed");
  assert.equal(result.body.paymentRequest.status, "expired");
  assert.equal(tables.payment_transactions.length, 0);
});

test("payIncomingPaymentRequest requires sourceAccountId when missing", async () => {
  const { supabase } = createMultiTableSupabaseMock(buildPayTables());
  const result = await payIncomingPaymentRequest(
    "req_pay_pending",
    { confirm: true },
    { supabase, now: payNow }
  );
  assert.equal(result.statusCode, 400);
  assert.equal(result.body.error.code, "source_account_required");
});

test("payIncomingPaymentRequest rejects accounts not owned by current user", async () => {
  const tablesData = buildPayTables();
  tablesData.accounts.push({
    id: "acct_friend_eur",
    owner_id: "friend_001",
    display_name: "Friend EUR",
    account_number: "FI19 1010 0001 0001 11",
    account_type: "current_account",
    currency: "EUR",
    balance: 1000,
    created_at: "2026-05-01T00:00:00.000Z",
    updated_at: "2026-05-01T00:00:00.000Z"
  });
  const { supabase, tables } = createMultiTableSupabaseMock(tablesData);
  const result = await payIncomingPaymentRequest(
    "req_pay_pending",
    { confirm: true, sourceAccountId: "acct_friend_eur" },
    { supabase, now: payNow }
  );
  assert.equal(result.statusCode, 404);
  assert.equal(result.body.error.code, "source_account_not_found");
  assert.equal(tables.payment_transactions.length, 0);
});

test("payIncomingPaymentRequest rejects accounts with mismatched currency", async () => {
  const { supabase, tables } = createMultiTableSupabaseMock(buildPayTables());
  const result = await payIncomingPaymentRequest(
    "req_pay_pending",
    { confirm: true, sourceAccountId: "acct_usd_travel" },
    { supabase, now: payNow }
  );
  assert.equal(result.statusCode, 409);
  assert.equal(result.body.error.code, "source_account_currency_mismatch");
  assert.equal(tables.accounts.find((a) => a.id === "acct_usd_travel").balance, 280);
  assert.equal(tables.payment_transactions.length, 0);
});

test("payIncomingPaymentRequest rejects insufficient balance without mutating data", async () => {
  const tablesData = buildPayTables();
  tablesData.accounts[0].balance = 50;
  const { supabase, tables } = createMultiTableSupabaseMock(tablesData);
  const result = await payIncomingPaymentRequest(
    "req_pay_pending",
    { confirm: true, sourceAccountId: "acct_eur_main" },
    { supabase, now: payNow }
  );
  assert.equal(result.statusCode, 409);
  assert.equal(result.body.error.code, "source_account_insufficient_balance");
  assert.equal(tables.accounts[0].balance, 50);
  assert.equal(tables.payment_requests[0].status, "pending");
  assert.equal(tables.payment_transactions.length, 0);
  assert.equal(tables.ledger_entries.length, 0);
});

test("payIncomingPaymentRequest allows exact-balance payment ending at zero", async () => {
  const tablesData = buildPayTables();
  tablesData.accounts[0].balance = 88;
  const { supabase, tables } = createMultiTableSupabaseMock(tablesData);
  const result = await payIncomingPaymentRequest(
    "req_pay_pending",
    { confirm: true, sourceAccountId: "acct_eur_main" },
    { supabase, now: payNow, generateId: payIdGenerator() }
  );
  assert.equal(result.ok, true);
  assert.equal(result.body.sourceAccount.balance, 0);
  assert.equal(tables.accounts[0].balance, 0);
});

test("payIncomingPaymentRequest is idempotent: duplicate succeeded txn blocks further deduction", async () => {
  const tablesData = buildPayTables();
  tablesData.payment_transactions.push({
    id: "txn_existing",
    payment_request_id: "req_pay_pending",
    type: "payment",
    amount: 88,
    currency: "EUR",
    status: "succeeded",
    source_account_id: "acct_eur_main",
    created_at: "2026-05-06T13:25:00.000Z"
  });
  const { supabase, tables } = createMultiTableSupabaseMock(tablesData);
  const result = await payIncomingPaymentRequest(
    "req_pay_pending",
    { confirm: true, sourceAccountId: "acct_eur_main" },
    { supabase, now: payNow }
  );
  assert.equal(result.statusCode, 409);
  assert.equal(result.body.error.code, "payment_already_completed");
  assert.equal(tables.accounts[0].balance, 412);
  assert.equal(tables.payment_transactions.length, 1);
});

test("payIncomingPaymentRequest treats ledger persistence as best-effort and still returns success", async () => {
  const { supabase, tables } = createMultiTableSupabaseMock(buildPayTables(), {
    failures: { ledger_entries: { insert: { message: "ledger boom" } } }
  });
  const result = await payIncomingPaymentRequest(
    "req_pay_pending",
    { confirm: true, sourceAccountId: "acct_eur_main" },
    { supabase, now: payNow, generateId: payIdGenerator() }
  );
  assert.equal(result.ok, true);
  assert.equal(result.body.paymentRequest.status, "paid");
  assert.equal(tables.payment_requests[0].status, "paid");
  assert.equal(tables.accounts[0].balance, 324);
  assert.ok(Array.isArray(result.body.ledgerEntries));
  assert.equal(result.body.ledgerEntries.length, 4);
  assert.equal(tables.ledger_entries.length, 0);
});

test("findEligibleSourceAccounts filters by request currency for current-user accounts only", () => {
  const eurReq = { currency: "EUR" };
  const accounts = findEligibleSourceAccounts(eurReq, demoUser);
  assert.deepEqual(accounts.map((a) => a.id), ["acct_eur_main"]);

  const usdReq = { currency: "USD" };
  assert.deepEqual(findEligibleSourceAccounts(usdReq, demoUser).map((a) => a.id), [
    "acct_usd_travel"
  ]);
});

test("defaultSelectedSourceAccountId selects the only eligible account, otherwise empty", () => {
  assert.equal(defaultSelectedSourceAccountId({ currency: "EUR" }, demoUser), "acct_eur_main");
  const altUser = {
    ...demoUser,
    receiverAccounts: [
      ...demoUser.receiverAccounts,
      { id: "acct_eur_extra", ownerId: demoUser.id, label: "Extra", displayName: "Extra", accountNumber: "FI19 9999 0000 0000 99", accountType: "current_account", currency: "EUR", balance: 0 }
    ]
  };
  assert.equal(defaultSelectedSourceAccountId({ currency: "EUR" }, altUser), "");
  assert.equal(defaultSelectedSourceAccountId({ currency: "JPY" }, demoUser), "");
});

test("describeSourceAccountState reports none/single/multiple states", () => {
  assert.equal(describeSourceAccountState({ currency: "EUR" }, demoUser).state, "single");
  assert.equal(describeSourceAccountState({ currency: "JPY" }, demoUser).state, "none");
  const altUser = {
    ...demoUser,
    receiverAccounts: [
      ...demoUser.receiverAccounts,
      { id: "acct_eur_extra", ownerId: demoUser.id, label: "Extra", displayName: "Extra", accountNumber: "FI19 9999 0000 0000 99", accountType: "current_account", currency: "EUR", balance: 0 }
    ]
  };
  assert.equal(describeSourceAccountState({ currency: "EUR" }, altUser).state, "multiple");
});

test("canPayIncoming permits only fresh pending incoming requests for current user", () => {
  const fresh = {
    senderId: "friend_001",
    recipientId: demoUser.id,
    status: "pending",
    createdAt: "2026-05-06T13:00:00.000Z"
  };
  assert.equal(canPayIncoming(fresh, demoUser, payNow()), true);
  assert.equal(canPayIncoming({ ...fresh, status: "declined" }, demoUser, payNow()), false);
  assert.equal(canPayIncoming({ ...fresh, recipientId: "friend_001" }, demoUser, payNow()), false);
  assert.equal(
    canPayIncoming({ ...fresh, createdAt: "2026-04-29T13:00:00.000Z" }, demoUser, payNow()),
    false
  );
});

test("canConfirmPayment requires pending request, eligible account, sufficient balance", () => {
  const request = { status: "pending", currency: "EUR", amount: 88 };
  assert.equal(
    canConfirmPayment({ request, selectedAccountId: "acct_eur_main", currentUser: demoUser }),
    true
  );
  assert.equal(
    canConfirmPayment({ request, selectedAccountId: "acct_usd_travel", currentUser: demoUser }),
    false
  );
  assert.equal(
    canConfirmPayment({ request, selectedAccountId: "", currentUser: demoUser }),
    false
  );
  const lowBalUser = {
    ...demoUser,
    receiverAccounts: demoUser.receiverAccounts.map((a) =>
      a.id === "acct_eur_main" ? { ...a, balance: 50 } : a
    )
  };
  assert.equal(
    canConfirmPayment({
      request,
      selectedAccountId: "acct_eur_main",
      currentUser: lowBalUser
    }),
    false
  );
});

test("formatStatusLabel covers paid status, PAYMENT_REQUEST_STATUS includes paid", () => {
  assert.equal(formatStatusLabel("paid"), "paid");
  assert.equal(PAYMENT_REQUEST_STATUS.paid, "paid");
});
