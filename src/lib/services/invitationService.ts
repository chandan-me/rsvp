import { db } from "./dbProvider";
import { NotificationLog } from "@/types/database";
import { notificationService } from "@/lib/notifications/service";

export interface SendInvitationResult {
  total: number;
  sent: number;
  failed: number;
  details: {
    guestId: string;
    email: string;
    success: boolean;
    error?: string;
  }[];
}

export class InvitationService {
  public async sendInvitation(eventId: string, guestId: string): Promise<boolean> {
    const event = db.events.find((e) => e.id === eventId);
    const guest = db.guests.find((g) => g.id === guestId);

    if (!event || !guest) return false;

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const rsvpUrl = `${appUrl}/e/${event.slug}?token=${guest.qr_token}`;

    const res = await notificationService.send({
      eventId,
      recipientEmail: guest.email,
      recipientName: `${guest.first_name} ${guest.last_name}`,
      notificationType: "invitation",
      subject: `You're Invited: ${event.title}`,
      bodyText: `Hi ${guest.first_name},\n\nYou are invited to ${event.title}!\n\nPlease RSVP here: ${rsvpUrl}`,
      bodyHtml: `<p>Hi ${guest.first_name},</p><p>You are invited to <strong>${event.title}</strong>!</p><p><a href="${rsvpUrl}">Click here to RSVP</a></p>`,
    });

    // Update guest status from pending/invited
    if (guest.status === "pending") {
      guest.status = "invited";
      guest.updated_at = new Date().toISOString();
    }

    // Persist log
    const log: NotificationLog = {
      id: `nl_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
      event_id: eventId,
      recipient_email: guest.email,
      recipient_name: `${guest.first_name} ${guest.last_name}`,
      notification_type: "invitation",
      status: res.status,
      error_message: res.error || null,
      created_at: new Date().toISOString(),
    };
    db.notificationLogs.unshift(log);

    return res.success;
  }

  public async sendBulkInvitations(
    eventId: string,
    guestIds?: string[]
  ): Promise<SendInvitationResult> {
    let targetGuests = db.guests.filter((g) => g.event_id === eventId);
    if (guestIds && guestIds.length > 0) {
      targetGuests = targetGuests.filter((g) => guestIds.includes(g.id));
    } else {
      // If none specified, send to those who haven't responded yet (status in invited, pending)
      targetGuests = targetGuests.filter((g) => g.status === "pending" || g.status === "invited");
    }

    const details: SendInvitationResult["details"] = [];
    let sentCount = 0;
    let failedCount = 0;

    for (const guest of targetGuests) {
      const ok = await this.sendInvitation(eventId, guest.id);
      if (ok) {
        sentCount++;
      } else {
        failedCount++;
      }
      details.push({
        guestId: guest.id,
        email: guest.email,
        success: ok,
      });
    }

    return {
      total: targetGuests.length,
      sent: sentCount,
      failed: failedCount,
      details,
    };
  }

  public async getInvitationLogs(eventId: string): Promise<NotificationLog[]> {
    return db.notificationLogs
      .filter((l) => l.event_id === eventId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
}

export const invitationService = new InvitationService();
