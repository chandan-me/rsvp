import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/authService";
import { db } from "@/lib/services/dbProvider";

export async function GET(req: NextRequest) {
  try {
    const user = await authService.getSessionUser(req);
    if (!user) {
      // If no session exists yet, return default profile or anonymous state
      db.profiles = db.profiles || [];
      const defaultUser = db.profiles[0];
      if (defaultUser) {
        return NextResponse.json({
          authenticated: true,
          user: {
            id: defaultUser.id,
            name: defaultUser.full_name || defaultUser.email,
            email: defaultUser.email,
            role: defaultUser.role || "admin",
          },
        });
      }

      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, error: err?.message || "Failed to resolve session" },
      { status: 500 }
    );
  }
}
