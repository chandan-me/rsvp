import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";

export async function GET(req: NextRequest) {
  try {
    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || (forwardedHost?.includes("localhost") ? "http" : "https");
    const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin;

    const events = await eventService.getEvents();
    if (events.length === 0) {
      return NextResponse.redirect(`${origin}/events`);
    }

    const event = events[0];
    const settings = await eventService.getEventSettings(event.id);
    const accessKey = settings.gate_access_key || `gk_${event.id.slice(0, 8)}`;

    return NextResponse.redirect(`${origin}/checkin/${accessKey}`);
  } catch {
    return NextResponse.redirect(new URL("/events", req.nextUrl.origin));
  }
}
