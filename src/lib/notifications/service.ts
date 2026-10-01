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
    const provider = process.env.NOTIFICATION_PROVIDER || "simulated";

    try {
      if (provider === "simulated" || !process.env.RESEND_API_KEY) {
        // Simulated local notification engine:
        console.log(`[Notification Engine - SIMULATED] To: ${payload.recipientEmail} (${payload.recipientName || "Guest"})`);
        console.log(`[Notification Engine] Subject: ${payload.subject}`);
        console.log(`[Notification Engine] Type: ${payload.notificationType}`);

        return {
          success: true,
          status: "simulated",
          messageId: `sim_${Date.now()}_${Math.random().toString(36).substring(7)}`,
        };
      }

      // If Resend API key is present, send via Resend REST API
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: `${process.env.NOTIFICATION_FROM_NAME || "RSVP Team"} <${process.env.NOTIFICATION_FROM_EMAIL || "onboarding@resend.dev"}>`,
          to: [payload.recipientEmail],
          subject: payload.subject,
          html: payload.bodyHtml || payload.bodyText || "",
          text: payload.bodyText || "",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Failed to send email (${res.status})`);
      }

      const data = await res.json();
      return {
        success: true,
        status: "sent",
        messageId: data.id,
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
