import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { email, pin } = body;

    if (!email || !pin) {
      return NextResponse.json(
        { success: false, error: "Both staff email and gate password/PIN are required." },
        { status: 400 }
      );
    }

    const event = await eventService.getEventById(id);
    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found." }, { status: 404 });
    }

    const settings = await eventService.getEventSettings(id);
    const expectedPin = (settings.checkin_pin || "GATE-4821").trim();
    const providedPin = String(pin).trim();

    // Check PIN match (case-insensitive for convenience with prefix e.g. gate-4821 == GATE-4821)
    if (expectedPin.toLowerCase() !== providedPin.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: "Incorrect gate password or secret token." },
        { status: 401 }
      );
    }

    // Check staff email: allow configured staff_email, host email, or valid email format
    const configuredEmail = (settings.staff_email || "admin@craftconf.io").toLowerCase().trim();
    const normalizedInput = String(email).toLowerCase().trim();

    // If host has configured a specific staff email, verify it, or allow matching organizer email
    if (configuredEmail && configuredEmail !== normalizedInput && !normalizedInput.endsWith("@craftconf.io")) {
      // If doesn't match configuredEmail, check if it's a valid admin/staff attempt
      if (configuredEmail !== "admin@craftconf.io") {
        return NextResponse.json(
          { success: false, error: "Unauthorized staff email for this event gate." },
          { status: 401 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Gate access authorized",
      eventTitle: event.title,
      unlockedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to authenticate gate station" },
      { status: 500 }
    );
  }
}
