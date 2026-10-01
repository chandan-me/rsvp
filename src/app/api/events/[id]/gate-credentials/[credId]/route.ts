import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; credId: string }> }
) {
  try {
    const { id, credId } = await params;
    const deleted = await eventService.deleteGateCredential(id, credId);

    if (!deleted) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Gate credential deleted." });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete credential" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; credId: string }> }
) {
  try {
    const { id, credId } = await params;
    const body = await req.json();
    const { is_active } = body;

    const updated = await eventService.toggleGateCredential(id, credId, Boolean(is_active));
    if (!updated) {
      return NextResponse.json({ error: "Credential not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, credential: updated });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update credential" },
      { status: 500 }
    );
  }
}
