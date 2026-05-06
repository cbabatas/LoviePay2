import { expect, test } from "@playwright/test";

const demoEmail = "ayla.demo@loviepay.test";
const demoPassword = "1234";

async function signIn(page) {
  await page.goto("/");
  await page.getByLabel("Email").fill(demoEmail);
  await page.getByLabel("Password").fill(demoPassword);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Payment request" })).toBeVisible();
  await page.getByRole("button", { name: "Create request" }).click();
  await expect(page.getByLabel("Recipient")).toBeVisible();
}

async function selectRecipient(page, query, name) {
  await page.getByLabel("Recipient").fill(query);
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.locator("#selected-recipient")).toContainText(name);
}

test.describe("create payment request desktop flow", () => {
  test("signs in and creates a pending payment request", async ({ page }) => {
    await page.route("**/api/payment-requests", async (route) => {
      expect(route.request().method()).toBe("POST");
      const payload = route.request().postDataJSON();
      expect(payload).toMatchObject({
        recipientId: "user_002",
        receiverAccountId: "user_001_acct_eur",
        amount: 125.5,
        note: "Dinner split"
      });
      expect(payload.currency).toBeUndefined();

      await new Promise((resolve) => setTimeout(resolve, 150));
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          paymentRequest: {
            id: "req_test_001",
            senderId: "user_001",
            recipientId: "user_002",
            receiverAccountId: "user_001_acct_eur",
            amount: 125.5,
            currency: "EUR",
            note: "Dinner split",
            status: "pending",
            hash: "hash_desktop_happy_path",
            shareableLink: "/r/hash_desktop_happy_path",
            createdAt: "2026-05-06T12:00:00.000Z"
          }
        })
      });
    });

    await signIn(page);
    await expect(page.getByText("Ayla Demir")).toBeVisible();
    await expect(page.getByText("LP-204813")).toBeVisible();

    await selectRecipient(page, "Mika", "Mika Korhonen");
    await page.getByLabel("Receiver account").selectOption("user_001_acct_eur");
    await expect(page.locator("#derived-currency")).toHaveText("€ EUR");
    await page.getByLabel("Amount").fill("125.50");
    await page.getByLabel("Amount").blur();
    await expect(page.getByLabel("Amount")).toHaveValue("125.50");
    await page.getByLabel("Note").fill("Dinner split");
    await page.getByRole("button", { name: "Create payment request" }).click();

    await expect(page.getByRole("button", { name: "Creating request..." })).toBeDisabled();
    await expect(page.locator("#success-state")).toContainText("Pending payment request");
    await expect(page.locator("#success-state")).toContainText("Mika Korhonen");
    await expect(page.locator("#success-state")).toContainText("€125.50");
    await expect(page.locator("#success-state")).toContainText("pending");
    await expect(page.locator("#success-state")).toContainText("/r/hash_desktop_happy_path");
    await expect(page.locator("#success-state")).not.toContainText("Hash:");

    await page.context().grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.getByRole("button", { name: "Copy link" }).click();
    await expect(page.getByRole("button", { name: "Copied" })).toBeVisible();
    await expect(page.evaluate(() => navigator.clipboard.readText())).resolves.toContain(
      "/r/hash_desktop_happy_path"
    );
  });

  test("searches active friends by name, email, and phone with single selection", async ({ page }) => {
    await signIn(page);

    await page.getByLabel("Recipient").fill("Leila");
    await expect(page.getByRole("button", { name: /Leila Santos/ })).toBeVisible();
    await expect(page.getByText("Noora Laine")).toHaveCount(0);
    await expect(page.getByText("Ayla Demir")).toHaveCount(1);

    await page.getByLabel("Recipient").fill("jonas.berg@example.test");
    await expect(page.getByRole("button", { name: /Jonas Berg/ })).toBeVisible();

    await selectRecipient(page, "+358 40", "Mika Korhonen");
    await expect(page.locator("#selected-recipient")).toContainText("Mika Korhonen");
    await expect(page.locator(".recipient-result")).toHaveCount(0);

    await page.getByRole("button", { name: "Change" }).click();
    await page.getByLabel("Recipient").fill("does-not-match");
    await expect(page.locator("#recipient-results-empty")).toHaveText("No active friends found.");
  });

  test("blocks invalid submissions without showing success", async ({ page }) => {
    let requestCount = 0;
    await page.route("**/api/payment-requests", async (route) => {
      requestCount += 1;
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "request_creation_failed",
            message: "Unexpected request"
          }
        })
      });
    });

    await signIn(page);
    await page.getByRole("button", { name: "Create payment request" }).click();
    await expect(page.locator("#recipient-error")).toContainText("Select an active friend");
    await expect(page.locator("#receiver-account-error")).toContainText("Select the account");
    await expect(page.locator("#amount-error")).toContainText("Amount must be greater than zero");
    await expect(page.locator("#success-state")).toHaveCount(0);

    await selectRecipient(page, "Mika", "Mika Korhonen");
    await page.getByLabel("Receiver account").selectOption("user_001_acct_usd");
    await expect(page.locator("#derived-currency")).toHaveText("$ USD");

    for (const amount of ["0", "-5", "abc", "1000000"]) {
      await page.getByLabel("Amount").fill(amount);
      await page.getByRole("button", { name: "Create payment request" }).click();
      await expect(page.locator("#amount-error")).toContainText(
        "Amount must be greater than zero and less than 1,000,000."
      );
      await expect(page.locator("#success-state")).toHaveCount(0);
    }

    expect(requestCount).toBe(0);
  });

  test("maps backend validation errors into the form", async ({ page }) => {
    await page.route("**/api/payment-requests", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          error: {
            code: "recipient_inactive",
            message: "This friend cannot receive a new payment request."
          }
        })
      });
    });

    await signIn(page);
    await selectRecipient(page, "Mika", "Mika Korhonen");
    await page.getByLabel("Receiver account").selectOption("user_001_acct_gbp");
    await page.getByLabel("Amount").fill("44");
    await page.getByRole("button", { name: "Create payment request" }).click();

    await expect(page.getByRole("alert")).toContainText(
      "This friend cannot receive a new payment request."
    );
    await expect(page.locator("#success-state")).toHaveCount(0);
  });

  test("formats amount, limits note, updates summary, and resets form while keeping session", async ({
    page
  }) => {
    await signIn(page);
    await selectRecipient(page, "Mika", "Mika Korhonen");
    await page.getByLabel("Receiver account").selectOption("user_001_acct_eur");
    await page.getByLabel("Amount").fill("1000.5");
    await page.getByLabel("Amount").blur();
    await expect(page.getByLabel("Amount")).toHaveValue("1,000.50");
    await expect(page.getByLabel("Request summary")).toContainText("€1,000.50");

    await page.getByLabel("Note").fill("x".repeat(120));
    await expect(page.getByLabel("Note")).toHaveValue("x".repeat(100));
    await expect(page.locator("#note-count")).toHaveText("100/100");

    await page.getByRole("button", { name: "Create request" }).click();
    await expect(page.getByRole("heading", { name: "Payment request" })).toBeVisible();
    await expect(page.locator("#selected-recipient")).toHaveCount(0);
    await expect(page.getByLabel("Amount")).toHaveValue("");

    await selectRecipient(page, "Leila", "Leila Santos");
    await page.getByLabel("Amount").fill("55");
    await page.reload();
    await expect(page.getByRole("heading", { name: "Payment request" })).toBeVisible();
    await page.getByRole("button", { name: "Create request" }).click();
    await expect(page.locator("#selected-recipient")).toHaveCount(0);
    await expect(page.getByLabel("Amount")).toHaveValue("");
  });
});
