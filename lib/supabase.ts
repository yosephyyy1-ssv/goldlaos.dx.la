// Supabase client ฝั่ง server (service role) — ใช้เมื่อตั้งค่า env ครบเท่านั้น
import { createClient, SupabaseClient } from "@supabase/supabase-js";

const g = globalThis as unknown as { __gsSupabase?: SupabaseClient };

export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function supabaseAdmin(): SupabaseClient {
  if (!g.__gsSupabase) {
    g.__gsSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
  }
  return g.__gsSupabase;
}
