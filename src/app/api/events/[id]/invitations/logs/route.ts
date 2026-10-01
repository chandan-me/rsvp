import { NextRequest, NextResponse } from "next/server";
import { invitationService } from "@/lib/services/invitationService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const logs = await invitationService.getInvitationLogs(id);
    return NextResponse.json({ success: true, logs });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch invitation logs" },
      { status: 500 }
    );
  }
}
