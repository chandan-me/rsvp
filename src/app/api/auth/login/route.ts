import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services/dbProvider";
import { Profile } from "@/types/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = (body.password || "").trim();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    db.profiles = db.profiles || [];
    let user = db.profiles.find((p) => p.email.toLowerCase() === email);

    // If no user exists yet with this email, create a new dynamic profile
    if (!user) {
      user = {
        id: `USR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        email,
        full_name: email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase()),
        role: db.profiles.length === 0 ? "admin" : "client",
        avatar_url: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.profiles.push(user);
    }

    const session = {
      id: user.id,
      name: user.full_name || user.email,
      email: user.email,
      role: user.role || "client",
      token: `AUTH-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      issuedAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      user: session,
      message: "Authentication successful.",
    });

    // Set HTTP cookie for server-side auth
    response.cookies.set("rsvp_session_user", encodeURIComponent(JSON.stringify(session)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to process login request" },
      { status: 500 }
    );
  }
}
