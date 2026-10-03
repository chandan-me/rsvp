import { NotificationLog, NotificationType } from "@/types/database";

export interface SendNotificationPayload {
  eventId: string;
  recipientEmail: string;
  recipientName?: string | null;
  notificationType: NotificationType;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface NotificationResult {
  success: boolean;
  status: "sent" | "failed" | "simulated";
  messageId?: string;
  error?: string;
}

export class NotificationService {
  private static instance: NotificationService;

  private constructor() {}

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  public async send(payload: SendNotificationPayload): Promise<NotificationResult> {
    const provider = process.env.NOTIFICATION_PROVIDER || (process.env.RESEND_API_KEY ? "resend" : "simulated");
    const resendKey = process.env.RESEND_API_KEY;

    try {
      if (resendKey && provider !== "simulated") {
        const fromEmail = process.env.NOTIFICATION_FROM_EMAIL || "onboarding@resend.dev";
        const fromName = process.env.NOTIFICATION_FROM_NAME || "RSVP Pro Events";

        console.log(`[Notification Engine - LIVE RESEND] Dispatching to: ${payload.recipientEmail}...`);

        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: `${fromName} <${fromEmail}>`,
            to: [payload.recipientEmail],
            subject: payload.subject,
            html: payload.bodyHtml || payload.bodyText || "",
            text: payload.bodyText || "",
          }),
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => ({}));
          console.error("[Notification Engine - Resend Error]:", errJson);
          throw new Error(errJson.message || `Failed to send email via Resend (${res.status})`);
        }

        const data = await res.json();
        console.log(`[Notification Engine - LIVE RESEND] Delivered successfully. Message ID: ${data.id}`);

        return {
          success: true,
          status: "sent",
          messageId: data.id,
        };
      }

      // Simulated local fallback
      const simId = `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      console.log(`[Notification Engine - SIMULATED] To: ${payload.recipientEmail} (${payload.recipientName || "Guest"})`);
      console.log(`[Notification Engine] Subject: ${payload.subject}`);
      console.log(`[Notification Engine] Generated ID: ${simId}`);

      return {
        success: true,
        status: "simulated",
        messageId: simId,
      };
    } catch (err: any) {
      console.error("[Notification Engine Error]:", err);
      return {
        success: false,
        status: "failed",
        error: err?.message || "Failed to deliver notification",
      };
    }
  }
}

export const notificationService = NotificationService.getInstance();
