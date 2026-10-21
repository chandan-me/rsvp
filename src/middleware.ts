import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method.toUpperCase();
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin");

  // 1. Tightened CORS Settings (Required Action 11)
  const isApiRoute = pathname.startsWith("/api/");
  let isOriginAllowed = false;

  if (origin) {
    try {
      const originUrl = new URL(origin);
      // Whitelist only same-host, localhost development ports, or configured APP_URL
      if (
        originUrl.host === host ||
        originUrl.hostname === "localhost" ||
        originUrl.hostname === "127.0.0.1" ||
        (process.env.NEXT_PUBLIC_APP_URL && origin === process.env.NEXT_PUBLIC_APP_URL)
      ) {
        isOriginAllowed = true;
      }
    } catch {
      isOriginAllowed = false;
    }
  }

  // Handle preflight OPTIONS request for API routes
  if (method === "OPTIONS" && isApiRoute) {
    const preflightHeaders = new Headers();
    if (isOriginAllowed && origin) {
      preflightHeaders.set("Access-Control-Allow-Origin", origin);
      preflightHeaders.set("Access-Control-Allow-Credentials", "true");
      preflightHeaders.set(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, PATCH, DELETE, OPTIONS"
      );
      preflightHeaders.set(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization, x-user-id, x-user-role, x-internal-secret"
      );
      preflightHeaders.set("Access-Control-Max-Age", "86400");
    }
    return new NextResponse(null, { status: 204, headers: preflightHeaders });
  }

  // 2. CSRF Protection for state-changing mutations (Required Action 3)
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    // Exclude public webhooks & public guest RSVP submission from origin matching
    const isPublicWebhookOrRsvp =
      pathname.startsWith("/api/rsvp") ||
      pathname.startsWith("/api/payments/verify") ||
      pathname.startsWith("/api/auth/login") ||
      pathname.startsWith("/api/auth/signup") ||
      pathname.startsWith("/api/auth/gate-login");

    if (!isPublicWebhookOrRsvp) {
      const referer = request.headers.get("referer");

      if (origin) {
        try {
          const originHost = new URL(origin).host;
          if (originHost !== host && !host.startsWith(new URL(origin).hostname)) {
            return new NextResponse(
              JSON.stringify({ error: "CSRF Check Failed: Origin mismatch." }),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );
          }
        } catch {
          return new NextResponse(
            JSON.stringify({ error: "CSRF Check Failed: Malformed Origin." }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
      } else if (referer) {
        try {
          const refererHost = new URL(referer).host;
          if (refererHost !== host && !host.startsWith(new URL(referer).hostname)) {
            return new NextResponse(
              JSON.stringify({ error: "CSRF Check Failed: Referer mismatch." }),
              { status: 403, headers: { "Content-Type": "application/json" } }
            );
          }
        } catch {
          return new NextResponse(
            JSON.stringify({ error: "CSRF Check Failed: Malformed Referer." }),
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
      }
    }
  }

  // 3. Protected UI Routes (require valid session cookie)
  const isProtectedUI =
    pathname.startsWith("/events") ||
    pathname.startsWith("/manager") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/employee");

  const sessionToken =
    request.cookies.get("rsvp_session_token")?.value ||
    request.cookies.get("rsvp_auth_session")?.value;

  if (isProtectedUI) {
    if (!sessionToken || sessionToken.length < 10) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 4. Protected Admin & Manager API Routes
  const isProtectedAdminApi =
    pathname.startsWith("/api/admin") ||
    pathname.startsWith("/api/manager");

  if (isProtectedAdminApi) {
    if (!sessionToken) {
      return new NextResponse(
        JSON.stringify({ error: "Unauthorized: Administrative session required." }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  const response = NextResponse.next();

  // Attach CORS headers if applicable
  if (isApiRoute && isOriginAllowed && origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Credentials", "true");
    response.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, PATCH, DELETE, OPTIONS"
    );
    response.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, x-user-id, x-user-role, x-internal-secret"
    );
  }

  // 5. Hardened Security Headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set(
    "Permissions-Policy",
    "camera=(self), microphone=(), geolocation=(), payment=(self)"
  );

  return response;
}

export const config = {
  matcher: [
    "/events/:path*",
    "/manager/:path*",
    "/admin/:path*",
    "/employee/:path*",
    "/api/:path*",
  ],
};
