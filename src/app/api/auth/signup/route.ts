import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services/dbProvider";
import { Profile, UserRoleType } from "@/types/database";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { securityService } from "@/lib/services/securityService";

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateLimitKey = `auth_signup_${clientIp}`;

    // Rate limiting: max 5 signups per minute per IP
    const rateCheck = rateLimiter.check(rateLimitKey, 5, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: `Too many registration attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.` },
        { status: 429 }
      );
    }

    const body = await req.json();
    const fullName = (body.fullName || body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();
    const organization = (body.organization || "").trim();

    if (!email || !fullName) {
      return NextResponse.json(
        { error: "Full name and email address are required." },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (password && password.length < 8) {
      return NextResponse.json(
        { error: "Password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    db.profiles = db.profiles || [];
    let existing = db.profiles.find((p) => p.email.toLowerCase() === email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please log in." },
        { status: 409 }
      );
    }

    // Role privilege escalation guard: only assign admin to the initial setup account
    const assignedRole: UserRoleType = db.profiles.length === 0 ? "admin" : "client";

    const hashedPassword = password ? await securityService.hashPassword(password) : undefined;

    const newProfile: Profile = {
      id: `USR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      email,
      full_name: fullName,
      avatar_url: null,
      role: assignedRole,
      password_hash: hashedPassword,
      mfa_enabled: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.profiles.push(newProfile);

    // Issue cryptographically signed HMAC-SHA256 session token
    const token = securityService.createSignedSessionToken({
      userId: newProfile.id,
      email: newProfile.email,
      role: newProfile.role || "client",
      name: newProfile.full_name || newProfile.email,
    });

    const isProd = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      success: true,
      user: {
        id: newProfile.id,
        name: newProfile.full_name,
        email: newProfile.email,
        role: newProfile.role,
        organization: organization || "Independent Host",
      },
      message: "Account registered successfully.",
    });

    response.cookies.set("rsvp_session_token", token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

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
      { error: "Failed to register account." },
      { status: 500 }
    );
  }
}
