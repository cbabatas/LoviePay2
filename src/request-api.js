import { ERROR_MESSAGES } from "./payment-request.js";

const DEFAULT_CREATE_URL = "/api/payment-requests";
const DEFAULT_PAYMENT_REQUEST_URL = "/api/payment-requests";

export class CreatePaymentRequestError extends Error {
  constructor(code, message, options = {}) {
    super(message);
    this.name = "CreatePaymentRequestError";
    this.code = code;
    this.status = options.status ?? 0;
    this.body = options.body ?? null;
  }
}

export function mapCreateRequestError(errorBody, status = 0) {
  const code = errorBody?.error?.code ?? "request_creation_failed";
  const fallbackMessage = ERROR_MESSAGES[code] ?? ERROR_MESSAGES.request_creation_failed;
  const message = errorBody?.error?.message || fallbackMessage;
  return new CreatePaymentRequestError(code, message, { status, body: errorBody });
}

export async function createPaymentRequest(payload, options = {}) {
  const endpoint = options.endpoint ?? DEFAULT_CREATE_URL;
  const requestBody = {
    recipientId: payload.recipientId,
    receiverAccountId: payload.receiverAccountId,
    amount: payload.amount,
    note: payload.note
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(requestBody)
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw mapCreateRequestError(body, response.status);
  }

  if (!body?.paymentRequest) {
    throw mapCreateRequestError(
      {
        error: {
          code: "request_creation_failed",
          message: ERROR_MESSAGES.request_creation_failed
        }
      },
      response.status
    );
  }

  return body.paymentRequest;
}

export async function requestJson(endpoint, options = {}) {
  const response = await fetch(endpoint, {
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {})
    },
    ...options
  });

  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw mapCreateRequestError(body, response.status);
  }

  return body;
}

export async function listOutgoingPaymentRequests(options = {}) {
  const endpoint = options.endpoint ?? `${DEFAULT_PAYMENT_REQUEST_URL}?direction=outgoing`;
  const body = await requestJson(endpoint);
  return body?.paymentRequests ?? [];
}

export async function getOutgoingPaymentRequest(id, options = {}) {
  const endpoint =
    options.endpoint ??
    `${DEFAULT_PAYMENT_REQUEST_URL}/${encodeURIComponent(id)}?direction=outgoing`;
  const body = await requestJson(endpoint);
  return body?.paymentRequest ?? null;
}

export async function withdrawPaymentRequest(id, options = {}) {
  const endpoint =
    options.endpoint ?? `${DEFAULT_PAYMENT_REQUEST_URL}/${encodeURIComponent(id)}/withdraw`;
  const body = await requestJson(endpoint, {
    method: "PATCH",
    body: JSON.stringify({ confirm: options.confirm === true })
  });
  return body?.paymentRequest ?? null;
}
