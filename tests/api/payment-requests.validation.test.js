import test from "node:test";
import assert from "node:assert/strict";
import { createPaymentRequest } from "../../api/payment-requests.js";
import { demoUser, friends } from "../../src/mock-data.js";
import { searchFriends, validatePaymentRequestForm } from "../../src/payment-request.js";

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
