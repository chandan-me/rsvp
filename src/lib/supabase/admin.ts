import { createClient } from "@supabase/supabase-js";

// PRIVILEGED ADMIN CLIENT: Strictly used on the server for transactional tasks, webhooks, or admin migrations.
// NEVER import this file in client components.
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    // When no service key is set (e.g. initial dev), fall back to anon key with warning
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";
    return createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
