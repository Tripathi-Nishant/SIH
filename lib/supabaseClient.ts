import { createBrowserClient } from "@supabase/ssr";
import { createNoopSupabaseClient } from "./supabaseFallback";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

// Browser / client-component safe client.
// Fall back to a no-op client if envs are missing or Supabase refuses to initialize.
export const supabase = (() => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return createNoopSupabaseClient();
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey);
  } catch {
    return createNoopSupabaseClient();
  }
})();
