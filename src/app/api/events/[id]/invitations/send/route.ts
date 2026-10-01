import { NextRequest, NextResponse } from "next/server";
import { invitationService } from "@/lib/services/invitationService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const guestIds = body.guestIds as string[] | undefined;

    const result = await invitationService.sendBulkInvitations(id, guestIds);
    return NextResponse.json({ success: true, result });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to send invitations" },
      { status: 500 }
    );
  }
}
