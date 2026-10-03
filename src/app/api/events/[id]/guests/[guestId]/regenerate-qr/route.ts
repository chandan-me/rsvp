import { NextRequest, NextResponse } from "next/server";
import { guestService } from "@/lib/services/guestService";
import { auditService } from "@/lib/services/auditService";
import { authService } from "@/lib/services/authService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; guestId: string }> }
) {
  try {
    const { id, guestId } = await params;
    const user = await authService.getSessionUser(req);
    const authCheck = await authService.authorizeEvent(user, id, "client");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const result = await guestService.regenerateQr(id, guestId);
    if (!result) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    await auditService.log({
      eventId: id,
      actorId: user?.id || "host",
      actorRole: user?.role,
      action: "qr.regenerated",
      resourceType: "guest",
      resourceId: guestId,
      newValues: { newQrToken: result.guest.qr_token },
    });

    return NextResponse.json({
      success: true,
      message: "QR pass regenerated successfully. Previous code has been invalidated.",
      guest: result.guest,
      newQrToken: result.guest.qr_token,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to regenerate QR pass" }, { status: 500 });
  }
}
