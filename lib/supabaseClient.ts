import { createBrowserClient } from "@supabase/ssr";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

// Browser / client-component safe client
// The client is created lazily by @supabase/ssr on first use — safe to export at module level
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
