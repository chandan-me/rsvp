export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  assignedEvents?: string[];
}

export interface AuthSessionResponse {
  authenticated: boolean;
  user: AuthUser | null;
}

let cachedSession: AuthSessionResponse | null = null;
let cacheExpiry = 0;
let inFlightPromise: Promise<AuthSessionResponse> | null = null;

const CACHE_TTL_MS = 15000; // 15 seconds in-memory deduplication window

/**
 * Deduplicated client-side auth resolver.
 * Ensures that if multiple components (Navbar, AuthGuard, AdminSidebar, Page)
 * mount at the same time, only a SINGLE HTTP request is dispatched.
 */
export async function getVerifiedSession(forceRefresh = false): Promise<AuthSessionResponse> {
  if (typeof window === "undefined") {
    return { authenticated: false, user: null };
  }

  const now = Date.now();
  if (!forceRefresh && cachedSession && now < cacheExpiry) {
    return cachedSession;
  }

  if (inFlightPromise) {
    return inFlightPromise;
  }

  inFlightPromise = (async () => {
    try {
      // Clear deprecated localStorage auth session to prevent leakage
      try {
        localStorage.removeItem("rsvp_auth_session");
      } catch {
        // ignore
      }

      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      });

      if (!res.ok) {
        cachedSession = { authenticated: false, user: null };
        cacheExpiry = Date.now() + 5000;
        return cachedSession;
      }

      const data = await res.json();
      cachedSession = {
        authenticated: !!data.authenticated && !!data.user,
        user: data.user || null,
      };
      cacheExpiry = Date.now() + CACHE_TTL_MS;
      return cachedSession;
    } catch {
      cachedSession = { authenticated: false, user: null };
      cacheExpiry = Date.now() + 5000;
      return cachedSession;
    } finally {
      inFlightPromise = null;
    }
  })();

  return inFlightPromise;
}

export function invalidateAuthSessionCache(): void {
  cachedSession = null;
  cacheExpiry = 0;
  inFlightPromise = null;
}

// Invalidate on auth state changes
if (typeof window !== "undefined") {
  window.addEventListener("auth_session_changed", () => {
    invalidateAuthSessionCache();
  });
}
