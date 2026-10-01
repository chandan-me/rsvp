import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";
import { eventSchema } from "@/lib/validations/event";

export async function GET() {
  try {
    const events = await eventService.getEvents();
    return NextResponse.json({ success: true, events });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch events" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = eventSchema.parse(body);
    const event = await eventService.createEvent(validated);
    return NextResponse.json({ success: true, event }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to create event" },
      { status: 400 }
    );
  }
}
