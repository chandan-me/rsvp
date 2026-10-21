import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { securityService } from "@/lib/services/securityService";

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

    let authResult: { success: boolean; credential?: any; eventTitle?: string; eventId?: string } | null = null;

    // If eventId was specified, try it first
    if (eventId) {
      const auth = await eventService.authenticateGate(eventId, userId, passcode);
      if (auth.success && auth.credential) {
        authResult = { ...auth, eventId };
      }
    }

    // Otherwise, search across all available events
    if (!authResult) {
      for (const ev of events) {
        const auth = await eventService.authenticateGate(ev.id, userId, passcode);
        if (auth.success && auth.credential) {
          authResult = { ...auth, eventId: ev.id };
          break;
        }
      }
    }

    if (!authResult || !authResult.credential) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid Station User ID or Passcode. Please check with your event administrator.",
        },
        { status: 401 }
      );
    }

    rateLimiter.reset(rateLimitKey);

    const cred = authResult.credential;
    const resolvedEventId = authResult.eventId || "";

    // Issue signed session token for station operator
    const token = securityService.createSignedSessionToken({
      userId: cred.user_id,
      email: `${cred.user_id.toLowerCase()}@station.rsvp`,
      role: "employee",
      name: cred.station_name || cred.user_id,
    });

    const isProd = process.env.NODE_ENV === "production";

    const response = NextResponse.json({
      success: true,
      credential: cred,
      eventId: resolvedEventId,
      eventTitle: authResult.eventTitle,
      redirectUrl: `/events/${resolvedEventId}?tab=gate_hub&operator=${encodeURIComponent(cred.user_id)}`,
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
      { success: false, error: "Internal gate login error" },
      { status: 500 }
    );
  }
}
