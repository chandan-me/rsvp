import { createAdminClient } from "@/lib/supabase/admin";

let _adminClient: any = null;
let _isLiveAvailable: boolean | null = null;
let _lastProbeTime = 0;
let _isProbing = false;

const PROBE_COOLDOWN_MS = 300000; // 5 minutes cooldown if probe fails

async function probeReachability(rawUrl: string, key: string) {
  if (_isProbing) return;
  _isProbing = true;
  _lastProbeTime = Date.now();

  try {
    const cleanUrl = rawUrl.replace(/\/+$/, "");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 800); // Max 800ms probe timeout

    const res = await fetch(`${cleanUrl}/rest/v1/`, {
      method: "GET",
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    _isLiveAvailable = res.ok || res.status === 401 || res.status === 403;
  } catch {
    _isLiveAvailable = false;
  } finally {
    _isProbing = false;
  }
}

export function isLiveSupabaseConfigured(): boolean {
  if (process.env.USE_LIVE_SUPABASE === "false") {
    return false;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

  // Check if credentials are syntactically valid (not placeholders/dummies)
  const isRealUrl =
    url.startsWith("https://") &&
    url.includes(".supabase.co") &&
    !url.includes("your-project-id");

  const isNotDummyKey =
    anonKey.length > 50 &&
    !anonKey.includes("dummy") &&
    !anonKey.includes("placeholder");

  if (!isRealUrl || !isNotDummyKey) {
    return false;
  }

  // If already confirmed offline, don't re-probe until cooldown expires
  if (_isLiveAvailable === false && Date.now() - _lastProbeTime < PROBE_COOLDOWN_MS) {
    return false;
  }

  // If status is unknown, trigger non-blocking background probe and return false for now
  if (_isLiveAvailable === null && !_isProbing) {
    probeReachability(url, anonKey);
    return false;
  }

  return _isLiveAvailable === true;
}

export function markLiveSupabaseUnreachable(): void {
  _isLiveAvailable = false;
  _lastProbeTime = Date.now();
}

export function getSupabaseClient() {
  if (!_adminClient) {
    _adminClient = createAdminClient();
  }
  return _adminClient;
}
