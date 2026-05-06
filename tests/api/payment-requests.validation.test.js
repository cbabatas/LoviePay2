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
