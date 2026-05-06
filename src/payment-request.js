import { demoUser, friends, SUPPORTED_CURRENCIES } from "./mock-data.js";

export const ERROR_MESSAGES = {
  invalid_amount: "Amount must be greater than zero and less than 1,000,000.",
  recipient_required: "Select an active friend before sending the request.",
  recipient_not_found: "Select a friend from the search results.",
  recipient_inactive: "This friend cannot receive a new payment request.",
  self_recipient_not_allowed: "You cannot send a payment request to yourself.",
  receiver_account_required: "Select the account that should receive the payment.",
  receiver_account_not_found: "Select a valid receiver account.",
  unsupported_currency: "Select an account with a supported currency.",
  request_creation_failed: "The request could not be created. Try again."
};

export function normalizeSearch(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function parseAmount(value) {
  if (value === null || value === undefined || String(value).trim() === "") {
    return { ok: false, code: "invalid_amount" };
  }

  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || amount >= 1_000_000) {
    return { ok: false, code: "invalid_amount" };
  }

  return { ok: true, amount };
}

export function findActiveRecipient(recipientId, friendList = friends, currentUser = demoUser) {
  if (!recipientId) return { ok: false, code: "recipient_required" };

  const recipient = friendList.find((friend) => friend.id === recipientId);
  if (!recipient) return { ok: false, code: "recipient_not_found" };
  if (recipient.id === currentUser.id) return { ok: false, code: "self_recipient_not_allowed" };
  if (!recipient.active) return { ok: false, code: "recipient_inactive" };

  return { ok: true, recipient };
}

export function findReceiverAccount(receiverAccountId, currentUser = demoUser) {
  if (!receiverAccountId) return { ok: false, code: "receiver_account_required" };

  const account = currentUser.receiverAccounts.find((item) => item.id === receiverAccountId);
  if (!account) return { ok: false, code: "receiver_account_not_found" };
  if (!SUPPORTED_CURRENCIES.includes(account.currency)) {
    return { ok: false, code: "unsupported_currency" };
  }

  return { ok: true, account };
}

export function deriveCurrency(receiverAccountId, currentUser = demoUser) {
  const result = findReceiverAccount(receiverAccountId, currentUser);
  return result.ok ? result.account.currency : "";
}

export function searchFriends(query, friendList = friends, currentUser = demoUser) {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];

  return friendList.filter((friend) => {
    if (!friend.active || friend.id === currentUser.id) return false;

    const searchable = [friend.fullName, friend.email, friend.phone]
      .map(normalizeSearch)
      .join(" ");
    return searchable.includes(normalized);
  });
}

export function validatePaymentRequestForm(payload, options = {}) {
  const currentUser = options.currentUser ?? demoUser;
  const friendList = options.friendList ?? friends;
  const errors = {};

  const amountResult = parseAmount(payload.amount);
  if (!amountResult.ok) errors.amount = amountResult.code;

  const recipientResult = findActiveRecipient(payload.recipientId, friendList, currentUser);
  if (!recipientResult.ok) errors.recipientId = recipientResult.code;

  const accountResult = findReceiverAccount(payload.receiverAccountId, currentUser);
  if (!accountResult.ok) errors.receiverAccountId = accountResult.code;

  return {
    ok: Object.keys(errors).length === 0,
    errors,
    value:
      amountResult.ok && recipientResult.ok && accountResult.ok
        ? {
            recipientId: recipientResult.recipient.id,
            receiverAccountId: accountResult.account.id,
            amount: amountResult.amount,
            note: String(payload.note ?? "").trim(),
            currency: accountResult.account.currency
          }
        : null
  };
}

export function formatAmount(amount, currency) {
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency,
    maximumFractionDigits: 2
  }).format(amount);
}
