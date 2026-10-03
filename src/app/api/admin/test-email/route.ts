import { NextRequest, NextResponse } from "next/server";
import { notificationService } from "@/lib/notifications/service";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const recipientEmail = (body.email || "").trim();
    const recipientName = (body.name || "Test Attendee").trim();
    const eventTitle = body.eventTitle || "RSVP Pro Security & Verification";

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json(
        { error: "Valid recipient email address is required." },
        { status: 400 }
      );
    }

    const testHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0ea5e9, #4f46e5); padding: 32px 24px; text-align: center; color: #ffffff;">
          <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">RSVP Pro Verified Pass</h1>
          <p style="margin: 6px 0 0; font-size: 13px; opacity: 0.9;">Live Email Dispatch Engine Verification</p>
        </div>
        <div style="padding: 32px 24px; color: #334155; line-height: 1.6;">
          <p style="font-size: 15px; margin: 0 0 16px;">Hi <strong>${recipientName}</strong>,</p>
          <p style="font-size: 14px; margin: 0 0 20px;">
            This is a live test transmission confirming that your RSVP Pro email notification service is properly configured and successfully dispatching delivery receipts.
          </p>
          <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 20px; text-align: center; margin: 24px 0;">
            <span style="display: inline-block; padding: 6px 14px; background: #e0f2fe; color: #0369a1; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; margin-bottom: 8px;">
              System Test Pass
            </span>
            <h3 style="margin: 8px 0; font-size: 18px; color: #0f172a;">${eventTitle}</h3>
            <p style="font-size: 12px; color: #64748b; margin: 0;">Dispatched on: ${new Date().toLocaleString()}</p>
          </div>
          <p style="font-size: 12px; color: #94a3b8; margin: 24px 0 0; text-align: center;">
            Powered by RSVP Pro • High-Velocity Event Gate Operations
          </p>
        </div>
      </div>
    `;

    const result = await notificationService.send({
      eventId: "test-event",
      recipientEmail,
      recipientName,
      notificationType: "confirmation",
      subject: `[RSVP Pro Test] Live Email Verification for ${eventTitle}`,
      bodyHtml: testHtml,
      bodyText: `Hi ${recipientName}, this confirms your RSVP Pro live email dispatch is working. Event: ${eventTitle}`,
    });

    return NextResponse.json({
      success: result.success,
      status: result.status,
      messageId: result.messageId,
      message:
        result.status === "sent"
          ? `Real email dispatched successfully via Resend API to ${recipientEmail}!`
          : `Simulated dispatch recorded (Add RESEND_API_KEY to .env.local to send live external emails).`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to dispatch test email" },
      { status: 500 }
    );
  }
}
