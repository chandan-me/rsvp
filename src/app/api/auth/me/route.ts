import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/authService";

export async function GET(req: NextRequest) {
  try {
    const user = await authService.getSessionUser(req);
    if (!user) {
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
        assignedEvents: user.assignedEventIds,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { authenticated: false, error: "Failed to resolve session." },
      { status: 500 }
    );
  }
}
