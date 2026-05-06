import { randomBytes, randomUUID } from "node:crypto";
import { createSupabaseServerClient, includeDebugDetails } from "./supabase-client.js";
import { validateCreatePaymentRequestPayload } from "./payment-request-validation.js";
import {
  ERROR_MESSAGES,
  EXPIRY_WINDOW_MS,
  computeExpiresAt,
  computeDaysRemaining
} from "../src/payment-request.js";
import { demoUser, friends } from "../src/mock-data.js";

const ALL_USERS = [demoUser, ...friends];
const ACCOUNTS_TABLE = "accounts";
const PAYMENT_TRANSACTIONS_TABLE = "payment_transactions";
const LEDGER_ENTRIES_TABLE = "ledger_entries";

function debugDetails(extras) {
  return includeDebugDetails() ? extras : undefined;
}

export function resolveCurrentUser(req) {
  const userId = req.headers["x-demo-user-id"];
  return ALL_USERS.find((u) => u.id === userId) ?? demoUser;
}

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

function requestErrorResult(code, statusCode, extras = {}) {
  return {
    ok: false,
    statusCode,
    body: { ...createErrorResponse(code), ...extras }
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

function shapeWithDerivedFields(row, now) {
  const base = toClientPaymentRequest(row);
  const expiresAt = computeExpiresAt(row.created_at);
  const status = String(row.status ?? "");
  const daysRemaining =
    status === "pending" ? computeDaysRemaining(expiresAt, now) : 0;
  return {
    ...base,
    expiresAt: expiresAt ? expiresAt.toISOString() : null,
    daysRemaining
  };
}

async function promoteExpiredOnRead(supabase, row, now) {
  if (!row) return row;
  if (row.status !== "pending") return row;
  const created = new Date(row.created_at);
  if (Number.isNaN(created.getTime())) return row;
  if (now.getTime() < created.getTime() + EXPIRY_WINDOW_MS) return row;

  const updatedAt = now.toISOString();
  const { data, error } = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .update({ status: "expired", updated_at: updatedAt })
    .eq("id", row.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error) return { ...row, status: "expired", updated_at: updatedAt };
  if (!data) return { ...row, status: "expired", updated_at: updatedAt };
  return data;
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

export async function listIncomingPaymentRequests(options = {}) {
  const currentUser = options.currentUser ?? demoUser;
  const supabase = options.supabase ?? createSupabaseServerClient();
  const now = (options.now ?? (() => new Date()))();

  const { data, error } = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .select("*")
    .eq("recipient_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) return requestErrorResult("incoming_list_failed", 500);

  const promoted = [];
  for (const row of data ?? []) {
    const next = await promoteExpiredOnRead(supabase, row, now);
    promoted.push(next);
  }

  return {
    ok: true,
    statusCode: 200,
    body: {
      paymentRequests: promoted.map((row) => shapeWithDerivedFields(row, now))
    }
  };
}

export async function getIncomingPaymentRequest(id, options = {}) {
  if (!id) return requestErrorResult("request_not_found", 404);

  const currentUser = options.currentUser ?? demoUser;
  const supabase = options.supabase ?? createSupabaseServerClient();
  const now = (options.now ?? (() => new Date()))();

  const { data, error } = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .select("*")
    .eq("id", id)
    .eq("recipient_id", currentUser.id)
    .maybeSingle();

  if (error) return requestErrorResult("incoming_detail_failed", 500);
  if (!data) return requestErrorResult("request_not_found", 404);

  const promoted = await promoteExpiredOnRead(supabase, data, now);
  return {
    ok: true,
    statusCode: 200,
    body: {
      paymentRequest: shapeWithDerivedFields(promoted, now)
    }
  };
}

export async function declineIncomingPaymentRequest(id, payload, options = {}) {
  if (payload?.confirm !== true) {
    return requestErrorResult("decline_confirmation_required", 400);
  }

  if (!id) return requestErrorResult("request_not_found", 404);

  const currentUser = options.currentUser ?? demoUser;
  const supabase = options.supabase ?? createSupabaseServerClient();
  const now = (options.now ?? (() => new Date()))();

  const existing = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .select("*")
    .eq("id", id)
    .eq("recipient_id", currentUser.id)
    .maybeSingle();

  if (existing.error) return requestErrorResult("incoming_detail_failed", 500);
  if (!existing.data) return requestErrorResult("request_not_found", 404);

  const promoted = await promoteExpiredOnRead(supabase, existing.data, now);
  if (promoted.status !== "pending") {
    return requestErrorResult("decline_not_allowed", 409, {
      paymentRequest: shapeWithDerivedFields(promoted, now)
    });
  }

  const updatedAt = now.toISOString();
  const { data, error } = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .update({ status: "declined", updated_at: updatedAt })
    .eq("id", id)
    .eq("recipient_id", currentUser.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (error || !data) return requestErrorResult("request_update_failed", 500);

  return {
    ok: true,
    statusCode: 200,
    body: {
      paymentRequest: shapeWithDerivedFields(data, now)
    }
  };
}

const ACCOUNT_TYPE_LEDGER_CODES = {
  current_account: { debit: "10001", credit: "10002" },
  term_deposit:    { debit: "10003", credit: "10004" }
};

function ledgerCodeForAccount(account, side) {
  const type = account?.account_type ?? account?.accountType ?? "current_account";
  const codes = ACCOUNT_TYPE_LEDGER_CODES[type] ?? ACCOUNT_TYPE_LEDGER_CODES.current_account;
  return codes[side];
}

function toClientSourceAccount(row) {
  if (!row) return null;
  return {
    id: row.id,
    displayName: row.display_name ?? row.displayName ?? row.label ?? "",
    accountNumber: row.account_number ?? row.accountNumber ?? "",
    accountType: row.account_type ?? row.accountType ?? "current_account",
    currency: row.currency,
    balance: Number(row.balance)
  };
}

function toClientPaymentTransaction(row) {
  if (!row) return null;
  return {
    id: row.id,
    paymentRequestId: row.payment_request_id ?? row.paymentRequestId,
    type: row.type,
    amount: Number(row.amount),
    currency: row.currency,
    status: row.status,
    sourceAccountId: row.source_account_id ?? row.sourceAccountId,
    createdAt: row.created_at ?? row.createdAt
  };
}

function toClientLedgerEntry(row) {
  if (!row) return null;
  return {
    id: row.id,
    transactionId: row.transaction_id ?? row.transactionId,
    accountId: row.account_id ?? row.accountId,
    entryType: row.entry_type ?? row.entryType,
    amount: Number(row.amount),
    currency: row.currency,
    accountCode: row.account_code ?? row.accountCode,
    createdAt: row.created_at ?? row.createdAt
  };
}

async function fetchSourceAccount(supabase, accountId) {
  try {
    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .select("*")
      .eq("id", accountId)
      .maybeSingle();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

async function safeUpdateAccountBalance(
  supabase,
  accountId,
  ownerId,
  newBalance,
  expectedBalance,
  updatedAt
) {
  try {
    const { data, error } = await supabase
      .from(ACCOUNTS_TABLE)
      .update({ balance: newBalance, updated_at: updatedAt })
      .eq("id", accountId)
      .eq("owner_id", ownerId)
      .eq("balance", expectedBalance)
      .select()
      .maybeSingle();
    if (error) return { error };
    if (!data) return { error: { code: "balance_conflict", message: "Account balance changed concurrently." } };
    return { error: null, data };
  } catch (error) {
    return { error };
  }
}

async function safeInsertTransaction(supabase, payload) {
  try {
    const { data, error } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .insert(payload)
      .select()
      .single();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

async function safeInsertLedgerEntries(supabase, entries) {
  try {
    const { data, error } = await supabase
      .from(LEDGER_ENTRIES_TABLE)
      .insert(entries)
      .select();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

async function rollbackRequestToPending(supabase, id, paidRow, paidUpdatedAt) {
  try {
    await supabase
      .from(PAYMENT_REQUESTS_TABLE)
      .update({ status: "pending", updated_at: paidRow?.updated_at ?? paidUpdatedAt })
      .eq("id", id)
      .eq("status", "paid")
      .eq("updated_at", paidUpdatedAt)
      .select()
      .maybeSingle();
  } catch {
    // best-effort
  }
}

async function rollbackPayerBalance(supabase, accountId, ownerId, originalBalance, currentBalance, updatedAt) {
  try {
    await supabase
      .from(ACCOUNTS_TABLE)
      .update({ balance: originalBalance, updated_at: updatedAt })
      .eq("id", accountId)
      .eq("owner_id", ownerId)
      .eq("balance", currentBalance)
      .select()
      .maybeSingle();
  } catch {
    // best-effort
  }
}

async function deletePaymentTransaction(supabase, transactionId) {
  try {
    await supabase.from(PAYMENT_TRANSACTIONS_TABLE).delete().eq("id", transactionId);
  } catch {
    // best-effort
  }
}

async function fetchExistingSuccessTransaction(supabase, paymentRequestId) {
  try {
    const { data, error } = await supabase
      .from(PAYMENT_TRANSACTIONS_TABLE)
      .select("*")
      .eq("payment_request_id", paymentRequestId)
      .eq("status", "succeeded")
      .maybeSingle();
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}

async function fetchLedgerEntriesForTransaction(supabase, transactionId) {
  const { data, error } = await supabase
    .from(LEDGER_ENTRIES_TABLE)
    .select("*")
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: true });
  return { data: data ?? [], error };
}

export async function payIncomingPaymentRequest(id, payload, options = {}) {
  if (!id) return requestErrorResult("request_not_found", 404);
  if (payload?.confirm !== true) {
    return requestErrorResult("payment_confirmation_required", 400);
  }

  const currentUser = options.currentUser ?? demoUser;
  const supabase = options.supabase ?? createSupabaseServerClient();
  const now = (options.now ?? (() => new Date()))();
  const generateId = options.generateId ?? (() => randomUUID());

  const existing = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .select("*")
    .eq("id", id)
    .eq("recipient_id", currentUser.id)
    .maybeSingle();

  if (existing.error) {
    return requestErrorResult("incoming_detail_failed", 500, {
      debug: debugDetails({
        step: "fetch_payment_request",
        message: existing.error?.message ?? null,
        code: existing.error?.code ?? null,
        details: existing.error?.details ?? null,
        hint: existing.error?.hint ?? null
      })
    });
  }
  if (!existing.data) {
    return requestErrorResult("request_not_found", 404);
  }

  const promoted = await promoteExpiredOnRead(supabase, existing.data, now);

  if (promoted.status === "paid") {
    const txn = await fetchExistingSuccessTransaction(supabase, promoted.id);
    return requestErrorResult("payment_already_completed", 409, {
      paymentRequest: shapeWithDerivedFields(promoted, now),
      paymentTransaction: txn.data ? toClientPaymentTransaction(txn.data) : null
    });
  }

  if (promoted.status !== "pending") {
    return requestErrorResult("payment_not_allowed", 409, {
      paymentRequest: shapeWithDerivedFields(promoted, now)
    });
  }

  const sourceAccountId = payload?.sourceAccountId ?? null;
  if (!sourceAccountId) {
    return requestErrorResult("source_account_required", 400, {
      paymentRequest: shapeWithDerivedFields(promoted, now)
    });
  }

  const persistedAccount = await fetchSourceAccount(supabase, sourceAccountId);
  const account =
    persistedAccount.data && persistedAccount.data.owner_id === currentUser.id
      ? persistedAccount.data
      : null;

  if (!account) {
    return requestErrorResult("source_account_not_found", 404, {
      paymentRequest: shapeWithDerivedFields(promoted, now),
      debug: debugDetails({
        step: "fetch_source_account",
        sourceAccountId,
        currentUserId: currentUser?.id,
        supabaseError: persistedAccount.error?.message ?? null
      })
    });
  }

  if (account.currency !== promoted.currency) {
    return requestErrorResult("source_account_currency_mismatch", 409, {
      paymentRequest: shapeWithDerivedFields(promoted, now),
      sourceAccount: toClientSourceAccount(account)
    });
  }

  const requestAmount = Number(promoted.amount);
  const balance = Number(account.balance);
  if (balance < requestAmount) {
    return requestErrorResult("source_account_insufficient_balance", 409, {
      paymentRequest: shapeWithDerivedFields(promoted, now),
      sourceAccount: toClientSourceAccount(account)
    });
  }

  const duplicate = await fetchExistingSuccessTransaction(supabase, promoted.id);
  if (duplicate.data) {
    return requestErrorResult("payment_already_completed", 409, {
      paymentRequest: shapeWithDerivedFields(promoted, now),
      paymentTransaction: toClientPaymentTransaction(duplicate.data)
    });
  }

  const updatedAt = now.toISOString();
  const requestUpdate = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .update({ status: "paid", updated_at: updatedAt })
    .eq("id", id)
    .eq("recipient_id", currentUser.id)
    .eq("status", "pending")
    .select()
    .maybeSingle();

  if (requestUpdate.error || !requestUpdate.data) {
    return requestErrorResult("payment_processing_failed", 500, {
      debug: debugDetails({
        step: "update_payment_request",
        message: requestUpdate.error?.message ?? null,
        details: requestUpdate.error?.details ?? null,
        hint: requestUpdate.error?.hint ?? null,
        code: requestUpdate.error?.code ?? null,
        rowReturned: Boolean(requestUpdate.data)
      })
    });
  }

  const newBalance = balance - requestAmount;
  let updatedAccountRow = {
    ...account,
    balance: newBalance,
    updated_at: updatedAt
  };

  const accountUpdate = await safeUpdateAccountBalance(
    supabase,
    account.id,
    currentUser.id,
    newBalance,
    balance,
    updatedAt
  );
  if (accountUpdate.error) {
    await rollbackRequestToPending(supabase, id, requestUpdate.data, updatedAt);
    return requestErrorResult("payment_processing_failed", 500, {
      debug: debugDetails({
        step: "update_payer_balance",
        message: accountUpdate.error?.message ?? null
      })
    });
  }

  const transactionPayload = {
    id: generateId(),
    payment_request_id: id,
    type: "payment",
    amount: requestAmount,
    currency: promoted.currency,
    status: "succeeded",
    source_account_id: account.id,
    created_at: updatedAt
  };

  const receiverAccountId = promoted.receiver_account_id;
  const persistedReceiver = await fetchSourceAccount(supabase, receiverAccountId);
  const receiverAccount =
    persistedReceiver.data && persistedReceiver.data.owner_id === promoted.sender_id
      ? persistedReceiver.data
      : null;

  if (!receiverAccount) {
    await rollbackPayerBalance(supabase, account.id, currentUser.id, balance, newBalance, updatedAt);
    await rollbackRequestToPending(supabase, id, requestUpdate.data, updatedAt);
    return requestErrorResult("receiver_account_not_found", 500, {
      debug: debugDetails({ step: "fetch_receiver_account", receiverAccountId })
    });
  }

  const transactionInsert = await safeInsertTransaction(supabase, transactionPayload);
  let transactionRow = transactionInsert.data ?? transactionPayload;

  if (transactionInsert.error?.code === "23505") {
    const existingTxn = await fetchExistingSuccessTransaction(supabase, id);
    if (existingTxn.data) {
      return requestErrorResult("payment_already_completed", 409, {
        paymentRequest: shapeWithDerivedFields(requestUpdate.data, now),
        paymentTransaction: toClientPaymentTransaction(existingTxn.data)
      });
    }
  }

  if (transactionInsert.error) {
    await rollbackPayerBalance(supabase, account.id, currentUser.id, balance, newBalance, updatedAt);
    await rollbackRequestToPending(supabase, id, requestUpdate.data, updatedAt);
    return requestErrorResult("payment_processing_failed", 500, {
      debug: debugDetails({
        step: "insert_payment_transaction",
        message: transactionInsert.error?.message ?? null,
        code: transactionInsert.error?.code ?? null
      })
    });
  }

  const txnId = transactionRow.id ?? transactionPayload.id;

  const receiverBalance = Number(receiverAccount.balance);
  const receiverNewBalance = receiverBalance + requestAmount;
  const receiverUpdate = await safeUpdateAccountBalance(
    supabase,
    receiverAccount.id,
    receiverAccount.owner_id,
    receiverNewBalance,
    receiverBalance,
    updatedAt
  );
  if (receiverUpdate.error) {
    await deletePaymentTransaction(supabase, txnId);
    await rollbackPayerBalance(supabase, account.id, currentUser.id, balance, newBalance, updatedAt);
    await rollbackRequestToPending(supabase, id, requestUpdate.data, updatedAt);
    return requestErrorResult("payment_processing_failed", 500, {
      debug: debugDetails({
        step: "credit_receiver",
        message: receiverUpdate.error?.message ?? null
      })
    });
  }

  const offsetAccountId = "internal_payment_clearing";
  const offsetAccountCode = "10000";

  const payerDebitEntry = {
    id: generateId(),
    transaction_id: txnId,
    account_id: account.id,
    entry_type: "debit",
    amount: requestAmount,
    currency: promoted.currency,
    account_code: ledgerCodeForAccount(account, "debit"),
    created_at: updatedAt
  };

  const offsetCreditEntry = {
    id: generateId(),
    transaction_id: txnId,
    account_id: offsetAccountId,
    entry_type: "credit",
    amount: requestAmount,
    currency: promoted.currency,
    account_code: offsetAccountCode,
    created_at: updatedAt
  };

  const offsetDebitEntry = {
    id: generateId(),
    transaction_id: txnId,
    account_id: offsetAccountId,
    entry_type: "debit",
    amount: requestAmount,
    currency: promoted.currency,
    account_code: offsetAccountCode,
    created_at: updatedAt
  };

  const receiverCreditEntry = {
    id: generateId(),
    transaction_id: txnId,
    account_id: receiverAccount.id,
    entry_type: "credit",
    amount: requestAmount,
    currency: promoted.currency,
    account_code: ledgerCodeForAccount(receiverAccount, "credit"),
    created_at: updatedAt
  };

  const ledgerEntriesToInsert = [
    payerDebitEntry,
    offsetCreditEntry,
    offsetDebitEntry,
    receiverCreditEntry
  ];

  const ledgerInsert = await safeInsertLedgerEntries(supabase, ledgerEntriesToInsert);
  if (ledgerInsert.error || !Array.isArray(ledgerInsert.data) || ledgerInsert.data.length === 0) {
    await deletePaymentTransaction(supabase, txnId);
    await rollbackPayerBalance(supabase, account.id, currentUser.id, balance, newBalance, updatedAt);
    await rollbackPayerBalance(
      supabase,
      receiverAccount.id,
      receiverAccount.owner_id,
      receiverBalance,
      receiverNewBalance,
      updatedAt
    );
    await rollbackRequestToPending(supabase, id, requestUpdate.data, updatedAt);
    return requestErrorResult("payment_processing_failed", 500, {
      debug: debugDetails({
        step: "insert_ledger_entries",
        message: ledgerInsert.error?.message ?? null
      })
    });
  }
  const ledgerRows = ledgerInsert.data;

  return {
    ok: true,
    statusCode: 200,
    body: {
      paymentRequest: shapeWithDerivedFields(requestUpdate.data, now),
      sourceAccount: toClientSourceAccount(updatedAccountRow),
      paymentTransaction: toClientPaymentTransaction(transactionRow),
      ledgerEntries: ledgerRows.map(toClientLedgerEntry)
    }
  };
}

export async function getPaymentRequestByHash(hash, options = {}) {
  if (!hash) return requestErrorResult("request_not_found", 404);

  const currentUser = options.currentUser ?? demoUser;
  const supabase = options.supabase ?? createSupabaseServerClient();
  const now = (options.now ?? (() => new Date()))();

  const { data, error } = await supabase
    .from(PAYMENT_REQUESTS_TABLE)
    .select("*")
    .eq("hash", hash)
    .maybeSingle();

  if (error) return requestErrorResult("incoming_detail_failed", 500);
  if (!data) return requestErrorResult("request_not_found", 404);

  if (data.sender_id !== currentUser.id && data.recipient_id !== currentUser.id) {
    return requestErrorResult("request_not_found", 404);
  }

  const promoted = await promoteExpiredOnRead(supabase, data, now);
  const direction = promoted.recipient_id === currentUser.id ? "incoming" : "outgoing";

  return {
    ok: true,
    statusCode: 200,
    body: {
      paymentRequest: shapeWithDerivedFields(promoted, now),
      direction
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
  const currentUser = resolveCurrentUser(req);
  if (!currentUser) {
    jsonResponse(res, 401, {
      error: { code: "unauthorized", message: "Authentication required." }
    });
    return;
  }
  let result = null;

  if (req.method === "POST" && pathParts.length === 0) {
    const payload = await readBody(req);
    result = await createPaymentRequest(payload, { currentUser });
  } else if (req.method === "GET" && pathParts.length === 0 && direction === "outgoing") {
    result = await listOutgoingPaymentRequests({ currentUser });
  } else if (req.method === "GET" && pathParts.length === 0 && direction === "incoming") {
    result = await listIncomingPaymentRequests({ currentUser });
  } else if (req.method === "GET" && pathParts.length === 2 && pathParts[0] === "by-hash") {
    result = await getPaymentRequestByHash(pathParts[1], { currentUser });
  } else if (req.method === "GET" && pathParts.length === 1 && direction === "outgoing") {
    result = await getOutgoingPaymentRequest(pathParts[0], { currentUser });
  } else if (req.method === "GET" && pathParts.length === 1 && direction === "incoming") {
    result = await getIncomingPaymentRequest(pathParts[0], { currentUser });
  } else if (req.method === "PATCH" && pathParts.length === 2 && pathParts[1] === "withdraw") {
    const payload = await readBody(req);
    result = await withdrawOutgoingPaymentRequest(pathParts[0], payload, { currentUser });
  } else if (req.method === "PATCH" && pathParts.length === 2 && pathParts[1] === "decline") {
    const payload = await readBody(req);
    result = await declineIncomingPaymentRequest(pathParts[0], payload, { currentUser });
  } else if (req.method === "PATCH" && pathParts.length === 2 && pathParts[1] === "pay") {
    const payload = await readBody(req);
    result = await payIncomingPaymentRequest(pathParts[0], payload, { currentUser });
  } else {
    const allowed = pathParts.length === 0 ? "GET, POST" : "GET, PATCH";
    res.setHeader("Allow", allowed);
    jsonResponse(res, 405, createErrorResponse("request_creation_failed"));
    return;
  }

  jsonResponse(res, result.statusCode, result.body);
}
