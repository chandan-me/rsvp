import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/authService";
import { auditService } from "@/lib/services/auditService";

export async function GET(req: NextRequest) {
  try {
    const user = await authService.getSessionUser(req);
    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Access Denied: Platform Administrator privileges required." },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId") || undefined;
    const limit = Number(searchParams.get("limit") || 100);

    const logs = await auditService.getLogs(eventId, limit);
    return NextResponse.json({
      success: true,
      logs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load audit logs" }, { status: 500 });
  }
}
