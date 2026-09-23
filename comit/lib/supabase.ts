import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = url && key ? createClient(url, key) : null;

export function supabaseAdmin() {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !adminKey) return null;
  return createClient(url, adminKey, { auth: { persistSession: false } });
}
