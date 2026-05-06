import { demoUser, friends, SUPPORTED_CURRENCIES } from "./mock-data.js";

const ALL_USERS = [demoUser, ...friends];

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
  request_not_found: "This request is unavailable.",
  withdraw_confirmation_required: "Confirm withdrawal before updating this request.",
  withdraw_not_allowed: "Only pending outgoing requests can be withdrawn.",
  request_update_failed: "The request could not be updated. Try again.",
  withdraw_failed: "The request could not be withdrawn. Try again.",
  unavailable_action: "This request cannot be withdrawn because it is no longer pending.",
  incoming_list_failed: "Incoming requests could not be loaded. Try again.",
  incoming_detail_failed: "Incoming request details could not be loaded. Try again.",
  decline_confirmation_required: "Confirm before declining this request.",
  decline_not_allowed: "Only pending incoming requests can be declined.",
  decline_failed: "The request could not be declined. Try again.",
  unavailable_decline_action: "This request cannot be declined because it is no longer pending.",
  payment_confirmation_required: "Confirm payment before processing this request.",
  payment_not_allowed: "This request cannot be paid because it is no longer pending.",
  source_account_required: "Select a source account before paying.",
  source_account_not_found: "Select a valid source account.",
  source_account_currency_mismatch: "The selected account currency does not match the request.",
  source_account_insufficient_balance: "The selected account does not have enough balance to pay this request.",
  payment_already_completed: "This request has already been paid.",
  payment_processing_failed: "Payment failed. No changes were made. Try again.",
  no_matching_source_account: "You have no account in this currency. Payment is unavailable.",
  unavailable_pay_action: "This request cannot be paid because it is no longer pending.",
  pay_failed: "The payment could not be completed. Try again."
};

export const PAYMENT_REQUEST_STATUS = {
  pending: "pending",
  withdrawn: "withdrawn",
  declined: "declined",
  expired: "expired",
  paid: "paid"
};

export const EXPIRY_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

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

export function findActiveRecipient(recipientId, friendList = ALL_USERS, currentUser = demoUser) {
  if (!recipientId) return { ok: false, code: "recipient_required" };

  const recipient = friendList.find((friend) => friend.id === recipientId);
  if (!recipient) return { ok: false, code: "recipient_not_found" };
  if (recipient.id === currentUser.id) return { ok: false, code: "self_recipient_not_allowed" };
  if (!recipient.active) return { ok: false, code: "recipient_inactive" };

  const allowedIds = currentUser?.friends;
  if (Array.isArray(allowedIds) && !allowedIds.includes(recipient.id)) {
    return { ok: false, code: "recipient_not_found" };
  }

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

export function searchFriends(query, friendList = ALL_USERS, currentUser = demoUser) {
  const normalized = normalizeSearch(query);
  if (!normalized) return [];

  const allowedIds = Array.isArray(currentUser?.friends)
    ? new Set(currentUser.friends)
    : null;

  return friendList.filter((friend) => {
    if (!friend.active || friend.id === currentUser.id) return false;
    if (allowedIds && !allowedIds.has(friend.id)) return false;

    const searchable = [friend.fullName, friend.email, friend.phone]
      .map(normalizeSearch)
      .join(" ");
    return searchable.includes(normalized);
  });
}

export function validatePaymentRequestForm(payload, options = {}) {
  const currentUser = options.currentUser ?? demoUser;
  const friendList = options.friendList ?? ALL_USERS;
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

export function findRecipientDisplay(recipientId, friendList = ALL_USERS) {
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
  if (normalized === PAYMENT_REQUEST_STATUS.declined) return "declined";
  if (normalized === PAYMENT_REQUEST_STATUS.expired) return "expired";
  if (normalized === PAYMENT_REQUEST_STATUS.paid) return "paid";
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

function toDate(value) {
  if (value instanceof Date) return value;
  if (value === undefined || value === null) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function computeExpiresAt(createdAt) {
  const date = toDate(createdAt);
  if (!date) return null;
  return new Date(date.getTime() + EXPIRY_WINDOW_MS);
}

export function computeDaysRemaining(expiresAt, now = new Date()) {
  const expiry = toDate(expiresAt);
  const reference = toDate(now) ?? new Date();
  if (!expiry) return 0;
  const diffMs = expiry.getTime() - reference.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (24 * 60 * 60 * 1000));
}

export function isPastExpiry(createdAt, now = new Date()) {
  const expiry = computeExpiresAt(createdAt);
  if (!expiry) return false;
  const reference = toDate(now) ?? new Date();
  return reference.getTime() >= expiry.getTime();
}

export function canDeclineIncoming(request, now = new Date()) {
  if (!request) return false;
  if (normalizeSearch(request.status) !== PAYMENT_REQUEST_STATUS.pending) return false;
  return !isPastExpiry(request.createdAt ?? request.created_at, now);
}

export function isIncomingPaymentRequest(request, currentUser = demoUser) {
  return request?.recipientId === currentUser.id;
}

export function scopeIncomingPaymentRequests(requests, currentUser = demoUser) {
  return [...(requests ?? [])]
    .filter((request) => isIncomingPaymentRequest(request, currentUser))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export function findSenderDisplay(senderId, friendList = ALL_USERS) {
  const sender = friendList.find((friend) => friend.id === senderId);
  return {
    id: senderId,
    fullName: sender?.fullName ?? "Unknown sender",
    email: sender?.email ?? "",
    phone: sender?.phone ?? ""
  };
}

export function filterIncomingPaymentRequests(requests, filters = {}, friendsById = null) {
  const status = normalizeSearch(filters.status);
  const senderQuery = normalizeSearch(filters.senderQuery);
  const lookupSender = (senderId) => {
    if (friendsById && typeof friendsById === "object") {
      const entry =
        friendsById instanceof Map ? friendsById.get(senderId) : friendsById[senderId];
      if (entry) return entry;
    }
    return findSenderDisplay(senderId);
  };

  return [...(requests ?? [])].filter((request) => {
    if (status && normalizeSearch(request.status) !== status) return false;
    if (!senderQuery) return true;

    const sender = lookupSender(request.senderId);
    const searchable = [
      sender.fullName,
      sender.email,
      sender.phone,
      request.senderId,
      request.note,
      request.status,
      request.currency,
      request.amount,
      request.createdAt
    ]
      .map(normalizeSearch)
      .join(" ");

    return searchable.includes(senderQuery);
  });
}

export function unavailableDeclineMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unavailable_decline_action;
}

export function unavailablePayMessage(errorCode) {
  return ERROR_MESSAGES[errorCode] ?? ERROR_MESSAGES.unavailable_pay_action;
}

export function getCurrentUserSourceAccounts(currentUser = demoUser) {
  return [...(currentUser?.receiverAccounts ?? [])].filter(
    (account) => (account.ownerId ?? currentUser?.id) === currentUser?.id
  );
}

export function findEligibleSourceAccounts(request, currentUser = demoUser) {
  if (!request?.currency) return [];
  return getCurrentUserSourceAccounts(currentUser).filter(
    (account) => account.currency === request.currency
  );
}

export function defaultSelectedSourceAccountId(request, currentUser = demoUser) {
  const eligible = findEligibleSourceAccounts(request, currentUser);
  return eligible.length === 1 ? eligible[0].id : "";
}

export function findSelectedSourceAccount(accountId, currentUser = demoUser) {
  if (!accountId) return null;
  return (
    getCurrentUserSourceAccounts(currentUser).find((account) => account.id === accountId) ?? null
  );
}

export function canConfirmPayment({ request, selectedAccountId, currentUser = demoUser } = {}) {
  if (!request) return false;
  if (normalizeSearch(request.status) !== PAYMENT_REQUEST_STATUS.pending) return false;

  const account = findSelectedSourceAccount(selectedAccountId, currentUser);
  if (!account) return false;
  if (account.currency !== request.currency) return false;
  if (Number(account.balance) < Number(request.amount)) return false;
  return true;
}

export function canPayIncoming(request, currentUser = demoUser, now = new Date()) {
  if (!request) return false;
  if (!isIncomingPaymentRequest(request, currentUser)) return false;
  if (normalizeSearch(request.status) !== PAYMENT_REQUEST_STATUS.pending) return false;
  return !isPastExpiry(request.createdAt ?? request.created_at, now);
}

export function describeSourceAccountState(request, currentUser = demoUser) {
  const eligible = findEligibleSourceAccounts(request, currentUser);
  if (eligible.length === 0) {
    return { state: "none", accounts: [], message: ERROR_MESSAGES.no_matching_source_account };
  }
  if (eligible.length === 1) {
    return { state: "single", accounts: eligible };
  }
  return { state: "multiple", accounts: eligible };
}
