import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services/dbProvider";
import { Profile, UserRoleType } from "@/types/database";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const fullName = (body.fullName || body.name || "").trim();
    const email = (body.email || "").trim().toLowerCase();
    const organization = (body.organization || "").trim();
    const requestedRole: UserRoleType = body.role === "staff" ? "employee" : "client";

    if (!email || !fullName) {
      return NextResponse.json(
        { error: "Full name and email address are required." },
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

    const newProfile: Profile = {
      id: `USR-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      email,
      full_name: fullName,
      avatar_url: null,
      role: db.profiles.length === 0 ? "admin" : requestedRole,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.profiles.push(newProfile);

    const session = {
      id: newProfile.id,
      name: newProfile.full_name,
      email: newProfile.email,
      role: newProfile.role,
      organization: organization || "Independent Host",
      token: `AUTH-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      issuedAt: new Date().toISOString(),
    };

    const response = NextResponse.json({
      success: true,
      user: session,
      message: "Account registered successfully.",
    });

    response.cookies.set("rsvp_session_user", encodeURIComponent(JSON.stringify(session)), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to register account" },
      { status: 500 }
    );
  }
}
