import { expect, test } from "@playwright/test";

const demoEmail = "ayla.demo@loviepay.test";
const demoPassword = "1234";

export const incomingPayFixtures = [
  {
    id: "req_pay_pending_eur",
    senderId: "friend_001",
    recipientId: "demo_user_001",
    receiverAccountId: "friend_001_acct_eur",
    amount: 88.0,
    currency: "EUR",
    note: "Concert ticket",
    status: "pending",
    expiresAt: "2026-05-13T13:00:00.000Z",
    daysRemaining: 6,
    hash: "hash_pay_pending_eur",
    shareableLink: "/r/hash_pay_pending_eur",
    createdAt: "2026-05-06T13:00:00.000Z",
    updatedAt: "2026-05-06T13:00:00.000Z"
  },
  {
    id: "req_pay_pending_usd",
    senderId: "friend_005",
    recipientId: "demo_user_001",
    receiverAccountId: "friend_005_acct_usd",
    amount: 42.5,
    currency: "USD",
    note: "Sauna evening",
    status: "pending",
    expiresAt: "2026-05-12T09:00:00.000Z",
    daysRemaining: 5,
    hash: "hash_pay_pending_usd",
    shareableLink: "/r/hash_pay_pending_usd",
    createdAt: "2026-05-05T09:00:00.000Z",
    updatedAt: "2026-05-05T09:00:00.000Z"
  },
  {
    id: "req_pay_declined",
    senderId: "friend_006",
    recipientId: "demo_user_001",
    receiverAccountId: "friend_006_acct_eur",
    amount: 19.99,
    currency: "EUR",
    note: "Streaming subscription",
    status: "declined",
    expiresAt: "2026-05-11T08:00:00.000Z",
    daysRemaining: 0,
    hash: "hash_pay_declined",
    shareableLink: "/r/hash_pay_declined",
    createdAt: "2026-05-04T08:00:00.000Z",
    updatedAt: "2026-05-04T10:00:00.000Z"
  }
];

export function clonePayFixtures() {
  return incomingPayFixtures.map((request) => ({ ...request }));
}

export async function signIn(page) {
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

export async function openIncomingRequests(page) {
  await signIn(page);
  await page
    .getByRole("button", { name: /^Incoming$/ })
    .or(page.getByRole("tab", { name: /^Incoming$/ }))
    .first()
    .click();
}

export function requestRow(page, senderName) {
  const name = new RegExp(senderName);
  return page.getByRole("row", { name }).or(page.getByRole("button", { name })).first();
}

export async function mockPayIncomingApi(page, options = {}) {
  const requests = options.requests ?? clonePayFixtures();
  const accountsByUser = options.accountsByUser ?? null;
  const payOverrides = options.payOverrides ?? {};
  const payDelayMs = options.payDelayMs ?? 0;
  const listRequests = [];
  const detailRequests = [];
  const payRequests = [];

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
    const request = requests.find((candidate) => candidate.id === id) ?? null;
    if (!request) {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({
          error: { code: "request_not_found", message: "Payment request is unavailable." }
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

  if (accountsByUser) {
    await page.route("**/api/source-accounts*", async (route) => {
      expect(route.request().method()).toBe("GET");
      const userId = route.request().headers()["x-demo-user-id"] ?? "demo_user_001";
      const list = accountsByUser[userId] ?? [];
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ sourceAccounts: list })
      });
    });
  }

  await page.route("**/api/payment-requests/*/pay", async (route) => {
    expect(route.request().method()).toBe("PATCH");
    const id = new URL(route.request().url()).pathname.split("/").at(-2);
    payRequests.push({ id, body: route.request().postDataJSON() });

    if (payDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, payDelayMs));
    }

    if (payOverrides[id]) {
      const override = payOverrides[id];
      await route.fulfill({
        status: override.status ?? 409,
        contentType: "application/json",
        body: JSON.stringify(override.body ?? {
          error: {
            code: override.code ?? "payment_not_allowed",
            message: override.message ?? "This payment request cannot be paid."
          },
          paymentRequest: override.paymentRequest
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
            code: "payment_not_allowed",
            message: "This payment request cannot be paid."
          },
          paymentRequest: request
        })
      });
      return;
    }

    request.status = "paid";
    request.daysRemaining = 0;
    request.updatedAt = "2026-05-06T13:05:00.000Z";

    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        paymentRequest: request,
        sourceAccount: {
          id: "acct_eur_main",
          displayName: "Everyday EUR",
          accountNumber: "FI21 1234 5600 0007 85",
          accountType: "current_account",
          currency: request.currency,
          balance: 412 - request.amount
        },
        paymentTransaction: {
          id: `txn_${request.id}`,
          paymentRequestId: request.id,
          type: "payment",
          amount: request.amount,
          currency: request.currency,
          status: "succeeded",
          createdAt: "2026-05-06T13:05:00.000Z"
        },
        ledgerEntries: [
          {
            id: `ledger_payer_debit_${request.id}`,
            transactionId: `txn_${request.id}`,
            accountId: "acct_eur_main",
            entryType: "debit",
            amount: request.amount,
            currency: request.currency,
            accountCode: "10001",
            createdAt: "2026-05-06T13:05:00.000Z"
          },
          {
            id: `ledger_offset_credit_${request.id}`,
            transactionId: `txn_${request.id}`,
            accountId: "internal_payment_clearing",
            entryType: "credit",
            amount: request.amount,
            currency: request.currency,
            accountCode: "10000",
            createdAt: "2026-05-06T13:05:00.000Z"
          },
          {
            id: `ledger_offset_debit_${request.id}`,
            transactionId: `txn_${request.id}`,
            accountId: "internal_payment_clearing",
            entryType: "debit",
            amount: request.amount,
            currency: request.currency,
            accountCode: "10000",
            createdAt: "2026-05-06T13:05:00.000Z"
          },
          {
            id: `ledger_receiver_credit_${request.id}`,
            transactionId: `txn_${request.id}`,
            accountId: request.receiverAccountId,
            entryType: "credit",
            amount: request.amount,
            currency: request.currency,
            accountCode: "10002",
            createdAt: "2026-05-06T13:05:00.000Z"
          }
        ]
      })
    });
  });

  return { requests, listRequests, detailRequests, payRequests };
}

test.describe("pay incoming payment requests desktop flow", () => {
  test("US1 pays a pending incoming request from the list with visible processing", async ({
    page
  }) => {
    const { payRequests } = await mockPayIncomingApi(page, { payDelayMs: 2200 });

    await openIncomingRequests(page);

    const mikaRow = requestRow(page, "Mika Korhonen");
    await expect(mikaRow).toBeVisible();
    await mikaRow.getByRole("button", { name: "Pay", exact: true }).click();

    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog")).toContainText("Mika Korhonen");
    await expect(page.getByRole("dialog")).toContainText(/EUR/);
    await page.getByRole("button", { name: /Confirm payment/i }).click();

    await expect(page.getByText("Processing payment...")).toBeVisible();

    await expect(mikaRow).toContainText("paid", { timeout: 8000 });
    await expect(mikaRow.getByRole("button", { name: "Pay", exact: true })).toHaveCount(0);
    expect(payRequests).toHaveLength(1);
    expect(payRequests[0].id).toBe("req_pay_pending_eur");
    expect(payRequests[0].body.confirm).toBe(true);
  });

  test("US1 pays a pending incoming request from detail view", async ({ page }) => {
    const { payRequests } = await mockPayIncomingApi(page);

    await openIncomingRequests(page);

    await requestRow(page, "Pekka Aalto").click();
    await expect(page.getByRole("heading", { name: /Payment request/ })).toBeVisible();

    await page.getByRole("button", { name: "Pay", exact: true }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: /Confirm payment/i }).click();

    await expect(page.getByText("paid", { exact: true })).toBeVisible({ timeout: 8000 });
    expect(payRequests.map((r) => r.id)).toContain("req_pay_pending_usd");
  });

  test("US1 blocks repeated Pay clicks during processing", async ({ page }) => {
    const { payRequests } = await mockPayIncomingApi(page, { payDelayMs: 2500 });

    await openIncomingRequests(page);

    const mikaRow = requestRow(page, "Mika Korhonen");
    await mikaRow.getByRole("button", { name: "Pay", exact: true }).click();
    const confirmBtn = page.locator("#confirm-pay");
    await confirmBtn.click();
    await confirmBtn.click({ force: true }).catch(() => {});
    await confirmBtn.click({ force: true }).catch(() => {});

    await expect(mikaRow).toContainText("paid", { timeout: 10000 });
    expect(payRequests.length).toBe(1);
  });

  test("US3 hides Pay action on non-pending rows", async ({ page }) => {
    await mockPayIncomingApi(page);

    await openIncomingRequests(page);

    const declinedRow = requestRow(page, "Sara Lindqvist");
    await expect(declinedRow).toBeVisible();
    await expect(declinedRow.getByRole("button", { name: "Pay", exact: true })).toHaveCount(0);
  });

  test("US3 surfaces insufficient-balance error and leaves request pending", async ({ page }) => {
    await mockPayIncomingApi(page, {
      payOverrides: {
        req_pay_pending_eur: {
          status: 409,
          body: {
            error: {
              code: "source_account_insufficient_balance",
              message: "The selected account does not have enough balance to pay this request."
            }
          }
        }
      }
    });

    await openIncomingRequests(page);

    const mikaRow = requestRow(page, "Mika Korhonen");
    await mikaRow.getByRole("button", { name: "Pay", exact: true }).click();
    await page.getByRole("button", { name: /Confirm payment/i }).click();

    await expect(page.getByText(/enough balance/i)).toBeVisible();
    await expect(mikaRow).toContainText("pending");
  });

  test("US4 duplicate confirm only submits one pay and ends paid", async ({ page }) => {
    const { payRequests } = await mockPayIncomingApi(page, { payDelayMs: 2200 });

    await openIncomingRequests(page);

    const mikaRow = requestRow(page, "Mika Korhonen");
    await mikaRow.getByRole("button", { name: "Pay", exact: true }).click();
    const confirmBtn = page.locator("#confirm-pay");
    await confirmBtn.click();
    await confirmBtn.click({ force: true }).catch(() => {});

    await expect(mikaRow).toContainText("paid", { timeout: 10000 });
    expect(payRequests.length).toBe(1);
  });
});
