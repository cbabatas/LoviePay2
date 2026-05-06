import { demoUser, friends } from "../src/mock-data.js";
import {
  findActiveRecipient,
  findReceiverAccount,
  parseAmount
} from "../src/payment-request.js";

const ALL_USERS = [demoUser, ...friends];

export const SERVER_DERIVED_FIELDS = new Set([
  "senderId",
  "sender_id",
  "currency",
  "status",
  "hash",
  "shareableLink",
  "shareable_link",
  "createdAt",
  "created_at"
]);

export function createValidationError(code) {
  return { code };
}

export function validateCreatePaymentRequestPayload(payload, options = {}) {
  const currentUser = options.currentUser ?? demoUser;
  const friendList = options.friendList ?? ALL_USERS;

  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { ok: false, error: createValidationError("invalid_amount") };
  }

  for (const field of SERVER_DERIVED_FIELDS) {
    if (Object.hasOwn(payload, field)) {
      return { ok: false, error: createValidationError("request_creation_failed") };
    }
  }

  const amount = parseAmount(payload.amount);
  if (!amount.ok) return { ok: false, error: createValidationError(amount.code) };

  const recipient = findActiveRecipient(payload.recipientId, friendList, currentUser);
  if (!recipient.ok) return { ok: false, error: createValidationError(recipient.code) };

  const receiverAccount = findReceiverAccount(payload.receiverAccountId, currentUser);
  if (!receiverAccount.ok) {
    return { ok: false, error: createValidationError(receiverAccount.code) };
  }

  return {
    ok: true,
    value: {
      senderId: currentUser.id,
      recipientId: recipient.recipient.id,
      receiverAccountId: receiverAccount.account.id,
      amount: amount.amount,
      currency: receiverAccount.account.currency,
      note: String(payload.note ?? "").trim()
    }
  };
}
