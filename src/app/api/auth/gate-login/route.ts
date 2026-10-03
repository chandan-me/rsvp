import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";
import { rateLimiter } from "@/lib/services/rateLimiter";

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "127.0.0.1";
    const rateLimitKey = `gate_login_global_${clientIp}`;

    // Rate limiter: 10 attempts per minute
    const rateCheck = rateLimiter.check(rateLimitKey, 10, 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many login attempts. Please wait ${rateCheck.retryAfterSeconds} seconds.`,
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const userId = (body.userId || body.user_id || body.username || "").trim();
    const passcode = (body.passcode || body.pin || body.password || "").trim();
    let eventId = (body.eventId || body.event_id || "").trim();

    if (!passcode) {
      return NextResponse.json(
        { success: false, error: "Station Passcode is required." },
        { status: 400 }
      );
    }

    const events = await eventService.getEvents();
    if (events.length === 0) {
      return NextResponse.json(
        { success: false, error: "No active events found on this platform." },
        { status: 404 }
      );
    }

    // If eventId was specified, try it first
    if (eventId) {
      const auth = await eventService.authenticateGate(eventId, userId, passcode);
      if (auth.success && auth.credential) {
        rateLimiter.reset(rateLimitKey);
        return NextResponse.json({
          success: true,
          credential: auth.credential,
          eventId,
          eventTitle: auth.eventTitle,
          redirectUrl: `/events/${eventId}?tab=gate_hub&operator=${encodeURIComponent(auth.credential.user_id)}`,
        });
      }
    }

    // Otherwise, search across all available events
    for (const ev of events) {
      const auth = await eventService.authenticateGate(ev.id, userId, passcode);
      if (auth.success && auth.credential) {
        rateLimiter.reset(rateLimitKey);
        return NextResponse.json({
          success: true,
          credential: auth.credential,
          eventId: ev.id,
          eventTitle: auth.eventTitle,
          redirectUrl: `/events/${ev.id}?tab=gate_hub&operator=${encodeURIComponent(auth.credential.user_id)}`,
        });
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: "Invalid Station User ID or Passcode. Please check with your event administrator.",
      },
      { status: 401 }
    );
  } catch (err: any) {
    console.error("Gate login API error:", err);
    return NextResponse.json(
      { success: false, error: err?.message || "Internal gate login error" },
      { status: 500 }
    );
  }
}
