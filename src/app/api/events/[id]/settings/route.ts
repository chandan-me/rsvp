import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";
import { eventSettingsSchema } from "@/lib/validations/event";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const settings = await eventService.getEventSettings(id);
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch event settings" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const validated = eventSettingsSchema.partial().parse(body);
    const settings = await eventService.updateEventSettings(id, validated);
    return NextResponse.json({ success: true, settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update event settings" },
      { status: 400 }
    );
  }
}
