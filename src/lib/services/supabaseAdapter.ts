import { createAdminClient } from "@/lib/supabase/admin";

export function isLiveSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

  // Check if real Supabase credentials (not placeholder/dummy strings)
  const isRealUrl = url.startsWith("https://") && url.includes(".supabase.co");
  const isNotDummyKey =
    anonKey.length > 50 &&
    !anonKey.includes("dummy") &&
    !anonKey.includes("placeholder");

  return isRealUrl && isNotDummyKey;
}

let _adminClient: any = null;

export function getSupabaseClient() {
  if (!_adminClient) {
    _adminClient = createAdminClient();
  }
  return _adminClient;
}

