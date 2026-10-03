import { NextRequest, NextResponse } from "next/server";
import { checkinService } from "@/lib/services/checkinService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: eventId } = await params;
    const stats = await checkinService.getStationStats(eventId);
    return NextResponse.json({ success: true, stats });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to fetch station metrics" },
      { status: 500 }
    );
  }
}
