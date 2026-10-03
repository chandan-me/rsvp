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
    const authCheck = await authService.authorizeEvent(user, id, "employee");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const reason = body.reason || "Manual security block by event team.";

    const blocked = await guestService.blockGuest(id, guestId, reason);
    if (!blocked) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    await auditService.log({
      eventId: id,
      actorId: user?.id || "staff",
      actorRole: user?.role,
      action: "guest.blocked",
      resourceType: "guest",
      resourceId: guestId,
      newValues: { reason },
    });

    return NextResponse.json({
      success: true,
      message: `Guest ${blocked.first_name} ${blocked.last_name} has been blocked.`,
      guest: blocked,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to block guest" }, { status: 500 });
  }
}

export async function DELETE(
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

    const unblocked = await guestService.unblockGuest(id, guestId);
    if (!unblocked) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    await auditService.log({
      eventId: id,
      actorId: user?.id || "staff",
      actorRole: user?.role,
      action: "guest.unblocked",
      resourceType: "guest",
      resourceId: guestId,
    });

    return NextResponse.json({
      success: true,
      message: `Guest ${unblocked.first_name} ${unblocked.last_name} has been unblocked.`,
      guest: unblocked,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to unblock guest" }, { status: 500 });
  }
}
