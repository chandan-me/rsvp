import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";

export async function GET(req: NextRequest) {
  try {
    const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
    const forwardedProto = req.headers.get("x-forwarded-proto") || (forwardedHost?.includes("localhost") ? "http" : "https");
    const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : req.nextUrl.origin;

    const events = await eventService.getEvents();
    const targetPath = events.length > 0 ? `/events/${events[0].id}/checkin` : "/events";

    return NextResponse.redirect(`${origin}${targetPath}`);
  } catch {
    return NextResponse.redirect(new URL("/events", req.nextUrl.origin));
  }
}
