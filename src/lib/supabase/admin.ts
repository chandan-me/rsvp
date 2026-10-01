import { createClient } from "@supabase/supabase-js";

function cleanSupabaseUrl(url: string): string {
  return url.replace(/\/rest\/v1\/?$/, "").replace(/\/+$/, "");
}

let cachedAdminClient: ReturnType<typeof createClient> | null = null;

// PRIVILEGED ADMIN CLIENT: Strictly used on the server for transactional tasks, webhooks, or admin migrations.
// NEVER import this file in client components.
export function createAdminClient() {
  if (cachedAdminClient) {
    return cachedAdminClient;
  }

  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
  const supabaseUrl = cleanSupabaseUrl(rawUrl);
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder";
    cachedAdminClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
    });
    return cachedAdminClient;
  }

  cachedAdminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedAdminClient;
}

