import { NextRequest, NextResponse } from "next/server";
import { rsvpService } from "@/lib/services/rsvpService";
import { liveSyncBus } from "@/lib/services/liveSync";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  const { id: eventId, guestId } = await params;

  try {
    const success = await rsvpService.declineGuest(eventId, guestId);
    if (!success) {
      return NextResponse.json({ error: "Guest not found or unable to decline." }, { status: 404 });
    }

    liveSyncBus.emit(eventId, "decline", { guestId });

    return NextResponse.json({ success: true, message: "Guest declined. Waitlist updated." });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
