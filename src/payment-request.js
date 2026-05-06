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
  request_creation_failed: "The request could not be created. Try again.",
  outgoing_list_failed: "Outgoing requests could not be loaded. Try again.",
  outgoing_detail_failed: "Request details could not be loaded. Try again.",
  request_not_found: "This outgoing request is unavailable.",
  withdraw_confirmation_required: "Confirm withdrawal before updating this request.",
  withdraw_not_allowed: "Only pending outgoing requests can be withdrawn.",
  request_update_failed: "The request could not be updated. Try again.",
  withdraw_failed: "The request could not be withdrawn. Try again.",
  unavailable_action: "This request cannot be withdrawn because it is no longer pending."
};

export const PAYMENT_REQUEST_STATUS = {
  pending: "pending",
  withdrawn: "withdrawn"
};

export function normalizeSearch(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function parseAmount(value) {
  const normalizedValue = String(value ?? "")
    .replace(/[^\d.-]/g, "")
    .trim();

  if (normalizedValue === "") {
    return { ok: false, code: "invalid_amount" };
  }

  const amount = Number(normalizedValue);
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
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatPlainAmount(value) {
  const amount = parseAmount(value);
  if (!amount.ok) return String(value ?? "");

  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount.amount);
}

export function currencySymbol(currency) {
  if (!currency) return "$";

  const parts = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).formatToParts(0);

  return parts.find((part) => part.type === "currency")?.value ?? currency;
}

export function findRecipientDisplay(recipientId, friendList = friends) {
  const recipient = friendList.find((friend) => friend.id === recipientId);
  return {
    id: recipientId,
    fullName: recipient?.fullName ?? "Unknown recipient",
    email: recipient?.email ?? "",
    phone: recipient?.phone ?? ""
  };
}

export function formatStatusLabel(status) {
  const normalized = normalizeSearch(status);
  if (normalized === PAYMENT_REQUEST_STATUS.pending) return "pending";
  if (normalized === PAYMENT_REQUEST_STATUS.withdrawn) return "withdrawn";
  return String(status ?? "Unknown");
}

export function formatRequestDate(value) {
  if (!value) return "Date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date unavailable";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function receiverAccountLabel(receiverAccountId, currentUser = demoUser) {
  return (
    currentUser.receiverAccounts.find((account) => account.id === receiverAccountId)?.label ??
    "Account unavailable"
  );
}

export function isOutgoingPaymentRequest(request, currentUser = demoUser) {
  return request?.senderId === currentUser.id;
}

export function scopeOutgoingPaymentRequests(requests, currentUser = demoUser) {
  return [...(requests ?? [])]
    .filter((request) => isOutgoingPaymentRequest(request, currentUser))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function filterOutgoingPaymentRequests(requests, filters = {}, options = {}) {
  const currentUser = options.currentUser ?? demoUser;
  const friendList = options.friendList ?? friends;
  const status = normalizeSearch(filters.status);
  const recipientQuery = normalizeSearch(filters.recipientQuery);

  return scopeOutgoingPaymentRequests(requests, currentUser).filter((request) => {
    if (status && normalizeSearch(request.status) !== status) return false;
    if (!recipientQuery) return true;

    const recipient = findRecipientDisplay(request.recipientId, friendList);
    const searchable = [
      recipient.fullName,
      recipient.email,
      recipient.phone,
      request.recipientId,
      request.note,
      request.status,
      request.currency,
      request.amount,
      request.createdAt
    ]
      .map(normalizeSearch)
      .join(" ");

    return searchable.includes(recipientQuery);
  });
}

export function canWithdrawPaymentRequest(request) {
  return normalizeSearch(request?.status) === PAYMENT_REQUEST_STATUS.pending;
}

export function unavailableRequestMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.request_not_found;
}
