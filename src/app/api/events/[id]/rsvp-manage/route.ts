import { NextRequest, NextResponse } from "next/server";
import { rsvpService } from "@/lib/services/rsvpService";
import { liveSyncBus } from "@/lib/services/liveSync";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Access token is required" }, { status: 400 });
  }

  const data = await rsvpService.getGuestByToken(eventId, token);
  if (!data) {
    return NextResponse.json({ error: "No attendee found for this ticket or token." }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  try {
    const body = await req.json();
    const token = req.nextUrl.searchParams.get("token") || body.token;

    if (!token) {
      return NextResponse.json({ error: "Access token is required" }, { status: 400 });
    }

    const result = await rsvpService.updateGuestSelfService(eventId, token, body);
    if (!result.success) {
      return NextResponse.json({ error: "Failed to update RSVP details" }, { status: 400 });
    }

    liveSyncBus.emit(eventId, "rsvp", { token, status: result.guest?.status });

    return NextResponse.json({
      success: true,
      guest: result.guest,
      promotedGuest: result.promotedGuest,
      message: "RSVP updated successfully",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
