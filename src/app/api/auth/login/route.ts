import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services/dbProvider";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { securityService } from "@/lib/services/securityService";

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateLimitKey = `auth_login_${clientIp}`;

    // Rate limiting: 6 attempts per minute per IP to prevent brute force
    const rateCheck = rateLimiter.check(rateLimitKey, 6, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before retrying.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    const mfaCode = (body.mfaCode || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    // Input sanitization & email format validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format." },
        { status: 400 }
      );
    }

    db.profiles = db.profiles || [];
    let user = db.profiles.find((p) => p.email.toLowerCase() === email);

    // If user exists with password_hash, verify it
    if (user && user.password_hash) {
      const isPasswordValid = await securityService.verifyPassword(password, user.password_hash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: "Invalid credentials. Please verify your email and password." },
          { status: 401 }
        );
      }

      // Check MFA if enabled on profile
      if (user.mfa_enabled && user.mfa_secret) {
        if (!mfaCode) {
          return NextResponse.json(
            { error: "MFA code is required for this account.", requiresMfa: true },
            { status: 403 }
          );
        }
        const isMfaValid = securityService.verifyTotp(mfaCode, user.mfa_secret);
        if (!isMfaValid) {
          return NextResponse.json(
            { error: "Invalid or expired 6-digit MFA verification code.", requiresMfa: true },
            { status: 401 }
          );
        }
      }
    } else if (user && !user.password_hash) {
      // User registered before hashing upgrade: upgrade and hash securely now
      user.password_hash = await securityService.hashPassword(password);
    } else {
      // First-time administrator or client account bootstrap
      const isFirstUser = db.profiles.length === 0;
      const hashedPassword = await securityService.hashPassword(password);
      user = {
        id: `USR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        email,
        full_name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        role: isFirstUser ? "admin" : "client",
        avatar_url: null,
        password_hash: hashedPassword,
        mfa_enabled: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.profiles.push(user);
    }

    // Reset rate limiter on successful authentication
    rateLimiter.reset(rateLimitKey);

    // Issue cryptographically signed HMAC-SHA256 session token
    const token = securityService.createSignedSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role || "client",
      name: user.full_name || user.email,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.full_name || user.email,
        email: user.email,
        role: user.role || "client",
      },
      message: "Authentication successful.",
    });

    const isProd = process.env.NODE_ENV === "production";

    // Set HttpOnly, Secure, SameSite=Lax cookie
    response.cookies.set("rsvp_session_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    // Also mirror to rsvp_auth_session cookie for Next.js middleware compatibility (signed)
    response.cookies.set("rsvp_auth_session", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: "Authentication service encountered an unexpected error." },
      { status: 500 }
    );
  }
}
