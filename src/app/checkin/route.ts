import { NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";

export async function GET() {
  try {
    const events = await eventService.getEvents();
    if (events.length > 0) {
      return NextResponse.redirect(new URL(`/events/${events[0].id}/checkin`, process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
    }
    return NextResponse.redirect(new URL("/events", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  } catch {
    return NextResponse.redirect(new URL("/events", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
  }
}
