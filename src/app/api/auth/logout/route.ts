import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: "Logged out successfully.",
  });

  const isProd = process.env.NODE_ENV === "production";

  // Expire and clear session cookies
  response.cookies.set("rsvp_session_token", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  response.cookies.set("rsvp_auth_session", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  response.cookies.set("rsvp_session_user", "", {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });

  return response;
}
