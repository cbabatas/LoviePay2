import { randomBytes } from "node:crypto";
import { createSupabaseServerClient } from "./supabase-client.js";
import { validateCreatePaymentRequestPayload } from "./payment-request-validation.js";
import { ERROR_MESSAGES } from "../src/payment-request.js";
import { demoUser } from "../src/mock-data.js";

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

function requestErrorResult(code, statusCode) {
  return {
    ok: false,
    statusCode,
    body: createErrorResponse(code)
  };
}

function generateHash() {
  return randomBytes(HASH_BYTE_LENGTH).toString("base64url");
}

export function toClientPaymentRequest(row) {
  const request = {
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

  if (row.updated_at !== undefined) {
    request.updatedAt = row.updated_at;
  }

  return request;
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

export async function listOutgoingPaymentRequests(options = {}) {
  const currentUser = options.currentUser ?? demoUser;
  const supabase = options.supabase ?? createSupabaseServerClient();
  const { data, error } = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .select("*")
    .eq("sender_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) return requestErrorResult("outgoing_list_failed", 500);

  return {
    ok: true,
    statusCode: 200,
    body: {
      paymentRequests: (data ?? []).map(toClientPaymentRequest)
    }
  };
}

export async function getOutgoingPaymentRequest(id, options = {}) {
  if (!id) return requestErrorResult("request_not_found", 404);

  const currentUser = options.currentUser ?? demoUser;
  const supabase = options.supabase ?? createSupabaseServerClient();
  const { data, error } = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .select("*")
    .eq("id", id)
    .eq("sender_id", currentUser.id)
    .maybeSingle();

  if (error || !data) return requestErrorResult("request_not_found", 404);

  return {
    ok: true,
    statusCode: 200,
    body: {
      paymentRequest: toClientPaymentRequest(data)
    }
  };
}

export async function withdrawOutgoingPaymentRequest(id, payload, options = {}) {
  if (payload?.confirm !== true) {
    return requestErrorResult("withdraw_confirmation_required", 400);
  }

  if (!id) return requestErrorResult("request_not_found", 404);

  const currentUser = options.currentUser ?? demoUser;
  const supabase = options.supabase ?? createSupabaseServerClient();
  const existing = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .select("*")
    .eq("id", id)
    .eq("sender_id", currentUser.id)
    .maybeSingle();

  if (existing.error || !existing.data) {
    return requestErrorResult("request_not_found", 404);
  }

  if (existing.data.status !== "pending") {
    return requestErrorResult("withdraw_not_allowed", 409);
  }

  const now = (options.now ?? (() => new Date()))().toISOString();
  const { data, error } = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .update({ status: "withdrawn", updated_at: now })
    .eq("id", id)
    .eq("sender_id", currentUser.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error || !data) {
    return requestErrorResult("request_update_failed", 500);
  }

  return {
    ok: true,
    statusCode: 200,
    body: {
      paymentRequest: toClientPaymentRequest(data)
    }
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
  const url = new URL(req.url ?? "/", "http://localhost");
  let pathParts = url.pathname.split("/").filter(Boolean);
  if (pathParts[0] === "api" && pathParts[1] === "payment-requests") {
    pathParts = pathParts.slice(2);
  }
  const direction = url.searchParams.get("direction");
  let result = null;

  if (req.method === "POST" && pathParts.length === 0) {
    const payload = await readBody(req);
    result = await createPaymentRequest(payload);
  } else if (req.method === "GET" && pathParts.length === 0 && direction === "outgoing") {
    result = await listOutgoingPaymentRequests();
  } else if (req.method === "GET" && pathParts.length === 1 && direction === "outgoing") {
    result = await getOutgoingPaymentRequest(pathParts[0]);
  } else if (req.method === "PATCH" && pathParts.length === 2 && pathParts[1] === "withdraw") {
    const payload = await readBody(req);
    result = await withdrawOutgoingPaymentRequest(pathParts[0], payload);
  } else {
    const allowed = pathParts.length === 0 ? "GET, POST" : "GET, PATCH";
    res.setHeader("Allow", allowed);
    jsonResponse(res, 405, createErrorResponse("request_creation_failed"));
    return;
  }

  jsonResponse(res, result.statusCode, result.body);
}
