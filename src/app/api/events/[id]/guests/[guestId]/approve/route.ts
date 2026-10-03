import { NextRequest, NextResponse } from "next/server";
import { rsvpService } from "@/lib/services/rsvpService";
import { liveSyncBus } from "@/lib/services/liveSync";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  const { id: eventId, guestId } = await params;

  try {
    const result = await rsvpService.approveGuest(eventId, guestId);
    if (!result) {
      return NextResponse.json({ error: "Guest not found or unable to approve." }, { status: 404 });
    }

    liveSyncBus.emit(eventId, "approval", { guestId });

    return NextResponse.json({
      success: true,
      guest: result.guest,
      ticket: result.ticket,
      message: "Guest approved and ticket pass dispatched.",
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error" }, { status: 500 });
  }
}
