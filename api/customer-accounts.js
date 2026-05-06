import { createSupabaseServerClient, includeDebugDetails } from "./supabase-client.js";
import { ERROR_MESSAGES } from "../src/payment-request.js";
import { demoUser, friends } from "../src/mock-data.js";

const ACCOUNTS_TABLE = "accounts";
const ALL_USERS = [demoUser, ...friends];

export function resolveCurrentUser(req) {
  const userId = req.headers["x-demo-user-id"];
  return ALL_USERS.find((u) => u.id === userId) ?? demoUser;
}

function jsonResponse(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(body));
}

function toClientSourceAccount(row) {
  return {
    id: row.id,
    displayName: row.display_name ?? row.displayName ?? row.label ?? "",
    accountNumber: row.account_number ?? row.accountNumber ?? "",
    accountType: row.account_type ?? row.accountType ?? "current_account",
    currency: row.currency,
    balance: Number(row.balance),
    ownerId: row.owner_id ?? row.ownerId ?? null
  };
}

export async function listCustomerAccounts({ currentUser, supabase } = {}) {
  const client = supabase ?? createSupabaseServerClient();
  const { data, error } = await client
    .from(ACCOUNTS_TABLE)
    .select("*")
    .eq("owner_id", currentUser.id);

  if (error) {
    const body = {
      error: {
        code: "customer_accounts_failed",
        message:
          ERROR_MESSAGES.customer_accounts_failed ??
          "Could not load your accounts. Try again."
      }
    };
    if (includeDebugDetails()) {
      body.debug = {
        message: error.message ?? null,
        details: error.details ?? null,
        hint: error.hint ?? null,
        code: error.code ?? null
      };
    }
    return { ok: false, statusCode: 500, body };
  }

  return {
    ok: true,
    statusCode: 200,
    body: {
      accounts: (data ?? []).map(toClientSourceAccount)
    }
  };
}

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    jsonResponse(res, 405, {
      error: { code: "method_not_allowed", message: "Method not allowed." }
    });
    return;
  }

  const currentUser = resolveCurrentUser(req);
  if (!currentUser) {
    jsonResponse(res, 401, {
      error: { code: "unauthorized", message: "Authentication required." }
    });
    return;
  }
  let result;
  try {
    result = await listCustomerAccounts({ currentUser });
  } catch (error) {
    const body = {
      error: {
        code: "customer_accounts_failed",
        message: "Could not load your accounts. Try again."
      }
    };
    if (includeDebugDetails()) {
      body.debug = { message: error?.message ?? null };
    }
    jsonResponse(res, 500, body);
    return;
  }

  jsonResponse(res, result.statusCode, result.body);
}
