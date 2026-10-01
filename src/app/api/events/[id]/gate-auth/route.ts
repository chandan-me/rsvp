import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";
import { rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateLimitKey = `gate_auth_${id}_${clientIp}`;

    // Rate limiting: max 8 attempts per minute per IP
    const rateCheck = rateLimiter.check(rateLimitKey, 8, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed station attempts. Please wait ${rateCheck.retryAfterSeconds} seconds before trying again.`,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateCheck.retryAfterSeconds),
          },
        }
      );
    }

    const body = await req.json();

    // Support user_id (primary) or legacy email/staff_email
    const userId = body.user_id || body.staff_email || body.email;
    const passcode = body.passcode || body.pin;

    if (!userId || !passcode) {
      return NextResponse.json(
        { success: false, error: "Both Gate User ID and Passcode are required." },
        { status: 400 }
      );
    }

    const authResult = await eventService.authenticateGate(id, userId, passcode);

    if (!authResult.success) {
      return NextResponse.json(
        { success: false, error: authResult.error || "Gate authentication failed." },
        { status: 401 }
      );
    }

    // Reset rate limit on successful authorization
    rateLimiter.reset(rateLimitKey);

    return NextResponse.json({
      success: true,
      message: "Gate station access authorized",
      eventTitle: authResult.eventTitle,
      credential: authResult.credential,
      unlockedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Internal gate authentication error" },
      { status: 500 }
    );
  }
}
