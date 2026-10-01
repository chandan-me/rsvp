import { NextRequest, NextResponse } from "next/server";
import { guestService } from "@/lib/services/guestService";
import { guestSchema } from "@/lib/validations/guest";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const { guestId } = await params;
    const guest = await guestService.getGuestById(guestId);
    if (!guest) {
      return NextResponse.json({ success: false, error: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, guest });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch guest" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const { guestId } = await params;
    const body = await req.json();
    const validated = guestSchema.partial().parse(body);
    const updated = await guestService.updateGuest(guestId, validated);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Guest not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, guest: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update guest" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const { guestId } = await params;
    const success = await guestService.deleteGuest(guestId);
    return NextResponse.json({ success });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete guest" },
      { status: 500 }
    );
  }
}
