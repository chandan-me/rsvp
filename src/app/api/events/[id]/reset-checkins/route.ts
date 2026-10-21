import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await eventService.getEventById(id);
    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    const result = await eventService.resetEventCheckins(id);
    return NextResponse.json({
      success: true,
      message: `Reset complete. ${result.count} check-in records were cleared.`,
      clearedCount: result.count,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to reset check-ins" },
      { status: 500 }
    );
  }
}
