import { createBrowserClient } from "@supabase/ssr";
import { getRequiredEnv } from "./env";

const supabaseUrl = getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

// Browser / client-component safe client
// The client is created lazily by @supabase/ssr on first use — safe to export at module level
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
