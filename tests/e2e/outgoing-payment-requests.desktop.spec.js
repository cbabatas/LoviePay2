import { expect, test } from "@playwright/test";

const demoEmail = "ayla.demo@loviepay.test";
const demoPassword = "demo-pass-001";

// Fixture assumptions: the UI maps these recipient IDs to visible demo friend
// details, and outgoing API results are already scoped to the current demo user.
const outgoingFixtures = [
  {
    id: "req_out_pending_list",
    senderId: "demo_user_001",
    recipientId: "friend_001",
    receiverAccountId: "acct_eur_main",
    amount: 125.5,
    currency: "EUR",
    note: "Dinner split",
    status: "pending",
    hash: "hash_out_pending_list",
    shareableLink: "/r/hash_out_pending_list",
    createdAt: "2026-05-06T12:00:00.000Z",
    updatedAt: "2026-05-06T12:00:00.000Z"
  },
  {
    id: "req_out_pending_detail",
    senderId: "demo_user_001",
    recipientId: "friend_002",
    receiverAccountId: "acct_usd_travel",
    amount: 88,
    currency: "USD",
    note: "Museum tickets",
    status: "pending",
    hash: "hash_out_pending_detail",
    shareableLink: "/r/hash_out_pending_detail",
    createdAt: "2026-05-05T08:30:00.000Z",
    updatedAt: "2026-05-05T08:30:00.000Z"
  },
  {
    id: "req_out_withdrawn",
    senderId: "demo_user_001",
    recipientId: "friend_003",
    receiverAccountId: "acct_gbp_family",
    amount: 42.75,
    currency: "GBP",
    note: "Already canceled",
    status: "withdrawn",
    hash: "hash_out_withdrawn",
    shareableLink: "/r/hash_out_withdrawn",
    createdAt: "2026-05-04T16:15:00.000Z",
    updatedAt: "2026-05-04T17:00:00.000Z"
  }
];

function cloneRequests() {
  return outgoingFixtures.map((request) => ({ ...request }));
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

async function openOutgoingRequests(page) {
  await signIn(page);
  await page
    .getByRole("button", { name: /^Outgoing$/ })
    .or(page.getByRole("tab", { name: /^Outgoing$/ }))
    .first()
    .click();
  await expect(page.getByRole("button", { name: "Create request" })).toBeVisible();
}

function requestRow(page, recipientName) {
  const name = new RegExp(recipientName);
  return page.getByRole("row", { name }).or(page.getByRole("button", { name })).first();
}

async function expectRequestRowVisible(page, recipientName, request) {
  const row = requestRow(page, recipientName);
  await expect(row).toBeVisible();
  await expect(row).toContainText(recipientName);
  await expect(row).toContainText(request.currency);
  await expect(row).toContainText(new RegExp(String(request.amount).replace(".", "\\.")));
  await expect(row).toContainText(String(request.status));
  await expect(row).toContainText(/2026|May|5\/|6\//);
}

async function clickCreateRequest(page) {
  await page.getByRole("button", { name: "Create request" }).click();
  await expect(page.getByLabel("Recipient")).toBeVisible();
  await expect(page.getByLabel("Receiver account")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create payment request" })).toBeVisible();
}

async function mockOutgoingApi(page, options = {}) {
  const requests = options.requests ?? cloneRequests();
  const detailOverrides = options.detailOverrides ?? {};
  const withdrawFailures = options.withdrawFailures ?? {};
  const listRequests = [];
  const detailRequests = [];
  const withdrawRequests = [];

  await page.route("**/api/payment-requests?direction=outgoing", async (route) => {
    expect(route.request().method()).toBe("GET");
    listRequests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ paymentRequests: requests })
    });
  });

  await page.route(/\/api\/payment-requests\/[^/?]+(?:\?direction=outgoing)$/, async (route) => {
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

  await page.route("**/api/payment-requests/*/withdraw", async (route) => {
    expect(route.request().method()).toBe("PATCH");
    expect(route.request().postDataJSON()).toEqual({ confirm: true });
    const id = new URL(route.request().url()).pathname.split("/").at(-2);
    withdrawRequests.push(id);

    if (withdrawFailures[id]) {
      await route.fulfill({
        status: withdrawFailures[id].status ?? 409,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: withdrawFailures[id].code ?? "withdraw_not_allowed",
            message:
              withdrawFailures[id].message ??
              "This payment request can no longer be withdrawn."
          },
          paymentRequest: withdrawFailures[id].paymentRequest
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
            code: "withdraw_not_allowed",
            message: "This payment request can no longer be withdrawn."
          },
          paymentRequest: request
        })
      });
      return;
    }

    request.status = "withdrawn";
    request.updatedAt = "2026-05-06T12:05:00.000Z";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ paymentRequest: request })
    });
  });

  return { requests, listRequests, detailRequests, withdrawRequests };
}

test.describe("outgoing payment requests desktop flow", () => {
  test("opens the outgoing list and shows required request attributes only for outgoing rows", async ({
    page
  }) => {
    await mockOutgoingApi(page);

    await openOutgoingRequests(page);

    await expectRequestRowVisible(page, "Mika Korhonen", outgoingFixtures[0]);
    await expectRequestRowVisible(page, "Leila Santos", outgoingFixtures[1]);
    await expectRequestRowVisible(page, "Jonas Berg", outgoingFixtures[2]);
    await expect(page.getByText("Ayla Demir", { exact: true })).toHaveCount(1);
    // Outgoing rows must not surface incoming-only marker text.
    await expect(page.getByText("Incoming record")).toHaveCount(0);
  });

  test("filters by status and recipient, shows no results, then clears filters", async ({ page }) => {
    await mockOutgoingApi(page);

    await openOutgoingRequests(page);
    await page.getByRole("combobox", { name: "Status" }).selectOption("withdrawn");
    await expect(requestRow(page, "Jonas Berg")).toBeVisible();
    await expect(requestRow(page, "Mika Korhonen")).toHaveCount(0);
    await expect(requestRow(page, "Leila Santos")).toHaveCount(0);

    await page.getByRole("combobox", { name: "Status" }).selectOption("pending");
    await page.getByRole("searchbox", { name: "Recipient" }).fill("Leila");
    await expect(requestRow(page, "Leila Santos")).toBeVisible();
    await expect(requestRow(page, "Mika Korhonen")).toHaveCount(0);
    await expect(requestRow(page, "Jonas Berg")).toHaveCount(0);

    await page.getByRole("searchbox", { name: "Recipient" }).fill("No Match");
    await expect(page.getByText(/no results|no matching/i)).toBeVisible();

    await page.getByRole("button", { name: /clear/i }).click();
    await expect(page.getByRole("searchbox", { name: "Recipient" })).toHaveValue("");
    await expect(requestRow(page, "Mika Korhonen")).toBeVisible();
    await expect(requestRow(page, "Leila Santos")).toBeVisible();
    await expect(requestRow(page, "Jonas Berg")).toBeVisible();
  });

  test("opens outgoing detail for the selected request and returns to the outgoing list", async ({
    page
  }) => {
    const { detailRequests } = await mockOutgoingApi(page);

    await openOutgoingRequests(page);
    await requestRow(page, "Leila Santos").click();

    await expect(page.getByRole("heading", { name: /Payment request/ })).toBeVisible();
    await expect(page.getByText("Leila Santos", { exact: true })).toBeVisible();
    await expect(page.getByText("Museum tickets")).toBeVisible();
    await expect(page.getByText("/r/hash_out_pending_detail")).toBeVisible();
    await expect(page.getByText("pending", { exact: true })).toBeVisible();
    expect(detailRequests).toContain("req_out_pending_detail");

    await page.getByRole("button", { name: "Back" }).click();
    await expect(requestRow(page, "Mika Korhonen")).toBeVisible();
    await expect(requestRow(page, "Leila Santos")).toBeVisible();
  });

  test("cancels and confirms withdrawal from the outgoing list", async ({ page }) => {
    const { withdrawRequests } = await mockOutgoingApi(page);

    await openOutgoingRequests(page);
    const mikaRow = requestRow(page, "Mika Korhonen");
    await mikaRow.getByRole("button", { name: "Withdraw" }).click();
    await expect(page.getByRole("dialog")).toContainText("Mika Korhonen");
    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(mikaRow).toContainText("pending");
    expect(withdrawRequests).toEqual([]);

    await mikaRow.getByRole("button", { name: "Withdraw" }).click();
    await page.getByRole("button", { name: "Confirm withdrawal" }).click();
    await expect(mikaRow).toContainText("withdrawn");
    expect(withdrawRequests).toEqual(["req_out_pending_list"]);
  });

  test("confirms withdrawal from detail and shows ineligible messaging", async ({ page }) => {
    const { withdrawRequests } = await mockOutgoingApi(page);

    await openOutgoingRequests(page);
    await requestRow(page, "Leila Santos").click();
    await page.getByRole("button", { name: "Withdraw" }).click();
    await page.getByRole("button", { name: "Confirm withdrawal" }).click();
    await expect(page.getByText("withdrawn")).toBeVisible();
    expect(withdrawRequests).toEqual(["req_out_pending_detail"]);

    await page.getByRole("button", { name: "Back" }).click();
    await requestRow(page, "Jonas Berg").click();
    await expect(page.getByText(/cannot be withdrawn|not eligible|unavailable/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Withdraw" })).toHaveCount(0);
  });

  test("shows stale-status ineligible messaging when backend blocks withdrawal", async ({ page }) => {
    const staleRequest = { ...outgoingFixtures[0], status: "withdrawn" };
    await mockOutgoingApi(page, {
      withdrawFailures: {
        req_out_pending_list: {
          code: "withdraw_not_allowed",
          message: "This payment request can no longer be withdrawn.",
          paymentRequest: staleRequest
        }
      }
    });

    await openOutgoingRequests(page);
    const mikaRow = requestRow(page, "Mika Korhonen");
    await mikaRow.getByRole("button", { name: "Withdraw" }).click();
    await page.getByRole("button", { name: "Confirm withdrawal" }).click();
    await expect(page.getByText(/can no longer be withdrawn|cannot be withdrawn/i)).toBeVisible();
    await expect(mikaRow).toContainText("withdrawn");
  });

  test("opens Create Request from list, filtered no-results state, and detail", async ({ page }) => {
    await mockOutgoingApi(page);

    await openOutgoingRequests(page);
    await clickCreateRequest(page);

    await openOutgoingRequests(page);
    await page.getByRole("searchbox", { name: "Recipient" }).fill("No Match");
    await expect(page.getByText(/no results|no matching/i)).toBeVisible();
    await clickCreateRequest(page);

    await openOutgoingRequests(page);
    await requestRow(page, "Mika Korhonen").click();
    await expect(page.getByText("Dinner split")).toBeVisible();
    await clickCreateRequest(page);
  });
});
