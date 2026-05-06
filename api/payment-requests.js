import { randomBytes } from "node:crypto";
import { createSupabaseServerClient } from "./supabase-client.js";
import { validateCreatePaymentRequestPayload } from "./payment-request-validation.js";
import { ERROR_MESSAGES } from "../src/payment-request.js";

const PAYMENT_REQUESTS_TABLE = "payment_requests";
const HASH_BYTE_LENGTH = 18;

function jsonResponse(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function createErrorResponse(code) {
  return {
    error: {
      code,
      message: ERROR_MESSAGES[code] ?? ERROR_MESSAGES.request_creation_failed
    }
  };
}

function generateHash() {
  return randomBytes(HASH_BYTE_LENGTH).toString("base64url");
}

function toClientPaymentRequest(row) {
  return {
    id: row.id,
    senderId: row.sender_id,
    recipientId: row.recipient_id,
    receiverAccountId: row.receiver_account_id,
    amount: Number(row.amount),
    currency: row.currency,
    note: row.note ?? "",
    status: row.status,
    hash: row.hash,
    shareableLink: row.shareable_link,
    createdAt: row.created_at
  };
}

async function insertPaymentRequest(supabase, insertPayload) {
  const query = supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .insert(insertPayload)
    .select()
    .single();

  return await query;
}

export async function createPaymentRequest(payload, options = {}) {
  const validation = validateCreatePaymentRequestPayload(payload, options);
  if (!validation.ok) {
    return {
      ok: false,
      statusCode: 400,
      body: createErrorResponse(validation.error.code)
    };
  }

  const hash = (options.generateHash ?? generateHash)();
  const now = (options.now ?? (() => new Date()))().toISOString();
  const shareableLink = `/r/${hash}`;
  const value = validation.value;
  const insertPayload = {
    sender_id: value.senderId,
    recipient_id: value.recipientId,
    receiver_account_id: value.receiverAccountId,
    amount: value.amount,
    currency: value.currency,
    note: value.note,
    status: "pending",
    hash,
    shareable_link: shareableLink,
    created_at: now
  };

  const supabase = options.supabase ?? createSupabaseServerClient();
  const { data, error } = await insertPaymentRequest(supabase, insertPayload);

  if (error) {
    return {
      ok: false,
      statusCode: 500,
      body: createErrorResponse("request_creation_failed")
    };
  }

  const insertedRow = data ?? { id: undefined, ...insertPayload };
  return {
    ok: true,
    statusCode: 201,
    body: {
      paymentRequest: toClientPaymentRequest(insertedRow)
    },
    insertPayload
  };
}

async function readBody(req) {
  if (req.body !== undefined) {
    if (typeof req.body === "string") {
      try {
        return JSON.parse(req.body);
      } catch {
        return null;
      }
    }

    return req.body;
  }

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const rawBody = Buffer.concat(chunks).toString("utf8");
  if (!rawBody) return null;

  try {
    return JSON.parse(rawBody);
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    jsonResponse(res, 405, createErrorResponse("request_creation_failed"));
    return;
  }

  const payload = await readBody(req);
  const result = await createPaymentRequest(payload);
  jsonResponse(res, result.statusCode, result.body);
}
