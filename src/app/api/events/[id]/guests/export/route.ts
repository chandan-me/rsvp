import { NextRequest, NextResponse } from "next/server";
import { guestService } from "@/lib/services/guestService";
import { eventService } from "@/lib/services/eventService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await eventService.getEventById(id);
    const csvContent = await guestService.exportGuestsCsv(id);

    const filename = `${event?.slug || "event"}-guests-${new Date().toISOString().split("T")[0]}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to export guests" },
      { status: 500 }
    );
  }
}
