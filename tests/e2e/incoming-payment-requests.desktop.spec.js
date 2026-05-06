import { expect, test } from "@playwright/test";

const demoEmail = "ayla.demo@loviepay.test";
const demoPassword = "1234";

// Fixture assumptions: the UI maps these sender IDs to visible demo friend
// details, and incoming API results are already scoped to the current demo user.
const incomingFixtures = [
  {
    id: "req_in_pending_list",
    senderId: "friend_001",
    recipientId: "demo_user_001",
    receiverAccountId: "acct_eur_main",
    amount: 88.0,
    currency: "EUR",
    note: "Concert ticket",
    status: "pending",
    expiresAt: "2026-05-13T13:00:00.000Z",
    daysRemaining: 6,
    hash: "hash_in_pending_list",
    shareableLink: "/r/hash_in_pending_list",
    createdAt: "2026-05-06T13:00:00.000Z",
    updatedAt: "2026-05-06T13:00:00.000Z"
  },
  {
    id: "req_in_pending_detail",
    senderId: "friend_005",
    recipientId: "demo_user_001",
    receiverAccountId: "acct_usd_travel",
    amount: 42.5,
    currency: "USD",
    note: "Sauna evening",
    status: "pending",
    expiresAt: "2026-05-12T09:00:00.000Z",
    daysRemaining: 5,
    hash: "hash_in_pending_detail",
    shareableLink: "/r/hash_in_pending_detail",
    createdAt: "2026-05-05T09:00:00.000Z",
    updatedAt: "2026-05-05T09:00:00.000Z"
  },
  {
    id: "req_in_declined",
    senderId: "friend_006",
    recipientId: "demo_user_001",
    receiverAccountId: "acct_eur_main",
    amount: 19.99,
    currency: "EUR",
    note: "Streaming subscription",
    status: "declined",
    expiresAt: "2026-05-11T08:00:00.000Z",
    daysRemaining: 0,
    hash: "hash_in_declined",
    shareableLink: "/r/hash_in_declined",
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T10:00:00.000Z"
  },
  {
    id: "req_in_expired",
    senderId: "friend_007",
    recipientId: "demo_user_001",
    receiverAccountId: "acct_eur_main",
    amount: 12.0,
    currency: "EUR",
    note: "Coffee run",
    status: "expired",
    expiresAt: "2026-05-05T07:00:00.000Z",
    daysRemaining: 0,
    hash: "hash_in_expired",
    shareableLink: "/r/hash_in_expired",
    createdAt: "2026-04-28T07:00:00.000Z",
    updatedAt: "2026-05-05T07:00:00.000Z"
  },
  {
    id: "req_in_withdrawn",
    senderId: "friend_001",
    recipientId: "demo_user_001",
    receiverAccountId: "acct_gbp_family",
    amount: 5.5,
    currency: "GBP",
    note: "Cancelled lunch",
    status: "withdrawn",
    expiresAt: "2026-05-10T11:00:00.000Z",
    daysRemaining: 0,
    hash: "hash_in_withdrawn",
    shareableLink: "/r/hash_in_withdrawn",
    createdAt: "2026-05-03T11:00:00.000Z",
    updatedAt: "2026-05-04T11:00:00.000Z"
  }
];

// An outgoing-only request (recipient is a friend, sender is the demo user).
// This row must NOT be returned by the incoming list mock — it's only here as
// a sanity guard against the UI accidentally surfacing outgoing rows.
const outgoingOnlyFixture = {
  id: "req_out_only",
  senderId: "demo_user_001",
  recipientId: "friend_001",
  receiverAccountId: "acct_eur_main",
  amount: 200,
  currency: "EUR",
  note: "Outgoing only",
  status: "pending",
  expiresAt: "2026-05-13T13:00:00.000Z",
  daysRemaining: 6,
  hash: "hash_out_only",
  shareableLink: "/r/hash_out_only",
  createdAt: "2026-05-06T13:00:00.000Z",
  updatedAt: "2026-05-06T13:00:00.000Z"
};

function cloneRequests() {
  return incomingFixtures.map((request) => ({ ...request }));
}

async function signIn(page) {
  await page.goto("/");
  if ((await page.getByLabel("Email").count()) === 0) {
    await expect(page.getByRole("heading", { name: "Payment request" })).toBeVisible();
    return;
  }
  await page.getByLabel("Email").fill(demoEmail);
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Payment request" })).toBeVisible();
}

async function openIncomingRequests(page) {
  await signIn(page);
  await page
    .getByRole("button", { name: /^Incoming$/ })
    .or(page.getByRole("tab", { name: /^Incoming$/ }))
    .first()
    .click();
}

function requestRow(page, senderName) {
  const name = new RegExp(senderName);
  return page.getByRole("row", { name }).or(page.getByRole("button", { name })).first();
}

async function expectRequestRowVisible(page, senderName, request) {
  const row = requestRow(page, senderName);
  await expect(row).toBeVisible();
  await expect(row).toContainText(senderName);
  await expect(row).toContainText(request.currency);
  await expect(row).toContainText(new RegExp(String(request.amount).replace(".", "\\.")));
  await expect(row).toContainText(String(request.status));
  await expect(row).toContainText(/2026|May|4\/|5\//);
  await expect(row).toContainText(new RegExp(`${request.daysRemaining}`));
}

async function mockIncomingApi(page, options = {}) {
  const requests = options.requests ?? cloneRequests();
  const detailOverrides = options.detailOverrides ?? {};
  const declineFailures = options.declineFailures ?? {};
  const listRequests = [];
  const detailRequests = [];
  const declineRequests = [];

  await page.route("**/api/payment-requests?direction=incoming", async (route) => {
    expect(route.request().method()).toBe("GET");
    listRequests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ paymentRequests: requests })
    });
  });

  await page.route(/\/api\/payment-requests\/[^/?]+\?direction=incoming$/, async (route) => {
    expect(route.request().method()).toBe("GET");
    const url = new URL(route.request().url());
    const id = url.pathname.split("/").pop();
    detailRequests.push(id);
    const request =
      detailOverrides[id] ?? requests.find((candidate) => candidate.id === id) ?? null;

    if (!request) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "request_not_found",
            message: "Payment request is unavailable."
          }
        })
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ paymentRequest: request })
    });
  });

  await page.route("**/api/payment-requests/*/decline", async (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().postDataJSON()).toEqual({ confirm: true });
    const id = new URL(route.request().url()).pathname.split("/").at(-2);
    declineRequests.push(id);

    if (declineFailures[id]) {
      await route.fulfill({
        status: declineFailures[id].status ?? 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: declineFailures[id].code ?? "decline_not_allowed",
            message:
              declineFailures[id].message ??
              "This payment request can no longer be declined."
          },
          paymentRequest: declineFailures[id].paymentRequest
        })
      });
      return;
    }

    const request = requests.find((candidate) => candidate.id === id);
    if (!request || request.status !== "pending") {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "decline_not_allowed",
            message: "This payment request can no longer be declined."
          },
          paymentRequest: request
        })
      });
      return;
    }

    request.status = "declined";
    request.daysRemaining = 0;
    request.updatedAt = "2026-05-06T13:05:00.000Z";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ paymentRequest: request })
    });
  });

  return { requests, listRequests, detailRequests, declineRequests };
}

test.describe("incoming payment requests desktop flow", () => {
  test("T013 renders incoming list rows with required attributes and excludes outgoing-only rows", async ({
    page
  }) => {
    await mockIncomingApi(page);

    await openIncomingRequests(page);

    await expectRequestRowVisible(page, "Mika Korhonen", incomingFixtures[0]);
    await expectRequestRowVisible(page, "Pekka Aalto", incomingFixtures[1]);
    await expectRequestRowVisible(page, "Sara Lindqvist", incomingFixtures[2]);
    await expectRequestRowVisible(page, "Tomas Virtanen", incomingFixtures[3]);

    // Outgoing-only sender (the demo user themselves as sender) must not appear
    // as an incoming row, and the outgoing-only fixture id must not be present.
    await expect(page.getByText(outgoingOnlyFixture.note)).toHaveCount(0);

    // The expired row exposes no Decline action (read-only).
    const expiredRow = requestRow(page, "Tomas Virtanen");
    await expect(expiredRow.getByRole("button", { name: "Decline", exact: true })).toHaveCount(0);

    // The pending row(s) DO expose Decline.
    const pendingRow = requestRow(page, "Mika Korhonen");
    await expect(pendingRow.getByRole("button", { name: "Decline", exact: true })).toBeVisible();
  });

  test("T023 filters by status and sender, shows no-results, then clears filters", async ({
    page
  }) => {
    await mockIncomingApi(page);

    await openIncomingRequests(page);

    await page.getByRole("combobox", { name: "Status" }).selectOption("pending");
    await expect(requestRow(page, "Mika Korhonen")).toBeVisible();
    await expect(requestRow(page, "Pekka Aalto")).toBeVisible();
    await expect(requestRow(page, "Sara Lindqvist")).toHaveCount(0);
    await expect(requestRow(page, "Tomas Virtanen")).toHaveCount(0);

    await page.getByRole("combobox", { name: "Status" }).selectOption("declined");
    await expect(requestRow(page, "Sara Lindqvist")).toBeVisible();
    await expect(requestRow(page, "Mika Korhonen")).toHaveCount(0);
    await expect(requestRow(page, "Pekka Aalto")).toHaveCount(0);
    await expect(requestRow(page, "Tomas Virtanen")).toHaveCount(0);

    await page.getByRole("combobox", { name: "Status" }).selectOption("expired");
    await expect(requestRow(page, "Tomas Virtanen")).toBeVisible();
    await expect(requestRow(page, "Mika Korhonen")).toHaveCount(0);
    await expect(requestRow(page, "Sara Lindqvist")).toHaveCount(0);

    // Reset status filter to All, then narrow by sender search.
    await page.getByRole("combobox", { name: "Status" }).selectOption("");
    await page.getByRole("searchbox", { name: "Sender" }).fill("Pekka");
    await expect(requestRow(page, "Pekka Aalto")).toBeVisible();
    await expect(requestRow(page, "Mika Korhonen")).toHaveCount(0);
    await expect(requestRow(page, "Sara Lindqvist")).toHaveCount(0);

    await page.getByRole("searchbox", { name: "Sender" }).fill("no match");
    await expect(page.getByText(/no results|no matching/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /clear/i })).toBeVisible();

    await page.getByRole("button", { name: /clear/i }).click();
    await expect(page.getByRole("searchbox", { name: "Sender" })).toHaveValue("");
    await expect(requestRow(page, "Mika Korhonen")).toBeVisible();
    await expect(requestRow(page, "Pekka Aalto")).toBeVisible();
    await expect(requestRow(page, "Sara Lindqvist")).toBeVisible();
    await expect(requestRow(page, "Tomas Virtanen")).toBeVisible();
  });

  test("T029 opens detail and Back preserves the active filter", async ({ page }) => {
    const { detailRequests } = await mockIncomingApi(page);

    await openIncomingRequests(page);

    await page.getByRole("combobox", { name: "Status" }).selectOption("pending");
    await expect(requestRow(page, "Mika Korhonen")).toBeVisible();
    await expect(requestRow(page, "Pekka Aalto")).toBeVisible();
    await expect(requestRow(page, "Sara Lindqvist")).toHaveCount(0);

    await requestRow(page, "Pekka Aalto").click();

    await expect(page.getByRole("heading", { name: /Payment request/ })).toBeVisible();
    await expect(page.getByText("Pekka Aalto", { exact: true })).toBeVisible();
    await expect(page.getByText("Sauna evening")).toBeVisible();
    await expect(page.getByText("/r/hash_in_pending_detail")).toBeVisible();
    await expect(page.getByText(incomingFixtures[1].currency)).toBeVisible();
    await expect(page.getByText(/42\.5/)).toBeVisible();
    await expect(page.getByText("pending", { exact: true })).toBeVisible();
    // Creation, expiry, days remaining all visible somewhere on the detail.
    await expect(page.getByText(/2026|May/).first()).toBeVisible();
    await expect(page.getByText(/5/).first()).toBeVisible();
    expect(detailRequests).toContain("req_in_pending_detail");

    await page.locator("#back-to-incoming").click();

    // Filter is preserved: only pending rows are visible after Back.
    await expect(page.getByRole("combobox", { name: "Status" })).toHaveValue("pending");
    await expect(requestRow(page, "Mika Korhonen")).toBeVisible();
    await expect(requestRow(page, "Pekka Aalto")).toBeVisible();
    await expect(requestRow(page, "Sara Lindqvist")).toHaveCount(0);
    await expect(requestRow(page, "Tomas Virtanen")).toHaveCount(0);
  });

  test("T038 declines from list and detail, supports cancel, and hides Decline on non-pending rows", async ({
    page
  }) => {
    const { declineRequests } = await mockIncomingApi(page);

    await openIncomingRequests(page);

    // Cancel from list confirmation dialog.
    const mikaRow = requestRow(page, "Mika Korhonen");
    await mikaRow.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Mika Korhonen");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(mikaRow).toContainText("pending");
    expect(declineRequests).toEqual([]);

    // Confirm decline from list.
    await mikaRow.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirm decline" }).click();
    await expect(mikaRow).toContainText("declined");
    await expect(mikaRow.getByRole("button", { name: "Decline", exact: true })).toHaveCount(0);
    expect(declineRequests).toEqual(["req_in_pending_list"]);

    // Confirm decline from detail of another pending row.
    await requestRow(page, "Pekka Aalto").click();
    await expect(page.getByRole("heading", { name: /Payment request/ })).toBeVisible();
    await page.getByRole("button", { name: "Decline", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Confirm decline" }).click();
    await expect(page.getByText("declined", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Decline", exact: true })).toHaveCount(0);
    expect(declineRequests).toEqual(["req_in_pending_list", "req_in_pending_detail"]);

    await page.locator("#back-to-incoming").click();

    // The expired row never has a Decline button.
    const expiredRow = requestRow(page, "Tomas Virtanen");
    await expect(expiredRow).toBeVisible();
    await expect(expiredRow.getByRole("button", { name: "Decline", exact: true })).toHaveCount(0);

    // The originally-declined row also has no Decline button.
    const declinedRow = requestRow(page, "Sara Lindqvist");
    await expect(declinedRow).toBeVisible();
    await expect(declinedRow.getByRole("button", { name: "Decline", exact: true })).toHaveCount(0);
  });
});
