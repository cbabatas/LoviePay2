import { createClient } from "@supabase/supabase-js";

export function isProduction(env = process.env) {
  return env.NODE_ENV === "production";
}

export function includeDebugDetails(env = process.env) {
  return !isProduction(env);
}

export function createSupabaseServerClient(env = process.env) {
  const supabaseUrl = env.SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Supabase server configuration is missing.");
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
