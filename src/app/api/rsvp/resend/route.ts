import { NextRequest, NextResponse } from "next/server";
import { rsvpService } from "@/lib/services/rsvpService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, event_id } = body;

    if (!email || !event_id) {
      return NextResponse.json(
        { error: "email and event_id are required" },
        { status: 400 }
      );
    }

    const sent = await rsvpService.resendConfirmationEmail(email, event_id);
    if (!sent) {
      return NextResponse.json(
        { error: "No confirmed ticket pass was found for this email." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `Digital ticket pass has been resent to ${email}`,
    });
  } catch (err: any) {
    console.error("Resend email error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to resend ticket pass email" },
      { status: 500 }
    );
  }
}
