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
