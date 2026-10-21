import { NextRequest, NextResponse } from "next/server";
import { rsvpService } from "@/lib/services/rsvpService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { query, event_id } = body;

    if (!query || typeof query !== "string" || !query.trim()) {
      return NextResponse.json(
        { success: false, error: "Please enter an email address or ticket pass code." },
        { status: 400 }
      );
    }

    const { passes } = await rsvpService.lookupGuestTickets(query.trim(), event_id);

    return NextResponse.json({
      success: true,
      passes,
      count: passes.length,
    });
  } catch (error: any) {
    console.error("Ticket lookup error:", error);
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to lookup ticket pass" },
      { status: 500 }
    );
  }
}
