import { db } from "./dbProvider";
import { RsvpResponse, RsvpAnswer, Guest, Ticket, Event } from "@/types/database";
import { RsvpSubmissionInput } from "@/lib/validations/rsvp";
import { generateTicketCode, generateQrToken, formatDate, formatTime, createGoogleCalendarUrl } from "@/lib/utils";
import { notificationService } from "@/lib/notifications/service";
import QRCode from "qrcode";

export interface RsvpSubmissionResult {
  success: boolean;
  guest: Guest;
  response: RsvpResponse;
  ticket?: Ticket;
  message: string;
}

function buildTicketEmailHtml(event: Event, guest: Guest, ticket: Ticket, qrDataUrl: string): string {
  const eventDateStr = formatDate(event.start_date, event.timezone);
  const eventTimeStr = formatTime(event.start_date, event.timezone);
  const calUrl = createGoogleCalendarUrl({
    title: event.title,
    description: event.description || "",
    location: event.location_name || event.location_address || "",
    startDate: event.start_date,
    endDate: event.end_date,
  });

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Your Digital Ticket Pass - ${event.title}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
    <!-- Company & Event Banner -->
    <tr>
      <td style="background-color: #0f172a; padding: 32px 28px; text-align: left; color: #ffffff;">
        <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8; margin-bottom: 8px;">
          RSVP Pro Event Operations • Official Pass
        </div>
        <h1 style="margin: 0; font-size: 24px; font-weight: 800; line-height: 1.25; color: #ffffff;">
          ${event.title}
        </h1>
        <p style="margin: 8px 0 0 0; font-size: 13px; color: #94a3b8; line-height: 1.5;">
          ${event.description ? event.description.slice(0, 140) + '...' : 'Thank you for your RSVP! Your digital entrance pass is ready below.'}
        </p>
      </td>
    </tr>

    <!-- Attendee Greeting & Status -->
    <tr>
      <td style="padding: 24px 28px 12px 28px;">
        <p style="font-size: 15px; margin: 0 0 6px 0; color: #0f172a;">
          Hello <strong>${guest.first_name} ${guest.last_name}</strong>,
        </p>
        <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.6;">
          Your attendance is confirmed! Please present this digital pass with the QR code at the check-in gate for instant scanning.
        </p>
      </td>
    </tr>

    <!-- Ticket Card Box -->
    <tr>
      <td style="padding: 12px 28px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background: #f1f5f9; border-radius: 16px; border: 1px dashed #cbd5e1; text-align: center; padding: 24px 16px;">
          <tr>
            <td align="center">
              <div style="background: #ffffff; padding: 12px; border-radius: 14px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
                <img src="${qrDataUrl}" alt="Digital Ticket QR Code" width="180" height="180" style="display: block; border-radius: 8px;" />
              </div>
              <div style="margin-top: 14px; font-family: monospace; font-size: 15px; font-weight: 700; color: #0f172a; letter-spacing: 0.08em;">
                ${ticket.ticket_code}
              </div>
              <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 600; margin-top: 2px;">
                Scan At Gate • Valid for ${1 + guest.plus_ones_count} Attendee${guest.plus_ones_count > 0 ? 's' : ''}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Schedule & Venue Details -->
    <tr>
      <td style="padding: 16px 28px;">
        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="border-top: 1px solid #f1f5f9; padding-top: 16px;">
          <tr>
            <td width="50%" valign="top" style="padding-right: 12px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 4px;">
                📅 Date & Time
              </span>
              <strong style="font-size: 13px; color: #0f172a; display: block;">${eventDateStr}</strong>
              <span style="font-size: 12px; color: #64748b;">${eventTimeStr} (${event.timezone})</span>
            </td>
            <td width="50%" valign="top" style="padding-left: 12px;">
              <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 4px;">
                📍 Venue Location
              </span>
              <strong style="font-size: 13px; color: #0f172a; display: block;">${event.location_name || 'Event Venue'}</strong>
              <span style="font-size: 12px; color: #64748b;">${event.location_address || 'See invitation for access directions'}</span>
            </td>
          </tr>
        </table>
      </td>
    </tr>

    <!-- Call to Action Buttons -->
    <tr>
      <td style="padding: 12px 28px 28px 28px; text-align: center;">
        <a href="${calUrl}" target="_blank" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 10px 20px; border-radius: 10px; margin-right: 8px;">
          + Add to Google Calendar
        </a>
      </td>
    </tr>

    <!-- Footer -->
    <tr>
      <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 28px; text-align: center; font-size: 11px; color: #94a3b8; line-height: 1.5;">
        You received this email because you confirmed your attendance for ${event.title}.<br/>
        Organized seamlessly with RSVP Pro Event Management Platform.
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export class RsvpService {
  public async submitRsvp(input: RsvpSubmissionInput): Promise<RsvpSubmissionResult> {
    const event = db.events.find((e) => e.id === input.event_id);
    if (!event) {
      throw new Error("Event not found.");
    }

    const settings = db.eventSettings.find((s) => s.event_id === input.event_id);
    if (settings?.is_rsvp_closed) {
      throw new Error("RSVP submissions for this event are currently closed.");
    }

    if (settings?.close_rsvp_at && new Date() > new Date(settings.close_rsvp_at)) {
      throw new Error("The RSVP deadline for this event has passed.");
    }

    // 1. Transactional guest resolution: Find existing or create new
    let guest = db.guests.find(
      (g) =>
        g.event_id === input.event_id &&
        g.email.toLowerCase() === input.email.toLowerCase().trim()
    );

    const isAttending = input.status === "attending";

    if (guest) {
      // Update existing guest record
      guest.first_name = input.first_name;
      guest.last_name = input.last_name;
      guest.phone = input.phone || guest.phone;
      guest.status = input.status;
      guest.plus_ones_count = isAttending ? input.plus_ones_count : 0;
      guest.notes = input.notes || guest.notes;
      guest.updated_at = new Date().toISOString();
    } else {
      // Create new guest
      const guestId = `g${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
      const qrToken = `TOKEN-${input.first_name.slice(0, 2).toUpperCase()}-${Math.floor(
        10000 + Math.random() * 90000
      )}`;

      guest = {
        id: guestId,
        event_id: input.event_id,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email.toLowerCase().trim(),
        phone: input.phone || null,
        status: input.status,
        plus_ones_allowed: input.plus_ones_count > 0 ? input.plus_ones_count : 0,
        plus_ones_count: isAttending ? input.plus_ones_count : 0,
        qr_token: qrToken,
        notes: input.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.guests.unshift(guest);
    }

    // 2. Persist RSVP response record
    const responseId = `r${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
    const response: RsvpResponse = {
      id: responseId,
      event_id: input.event_id,
      guest_id: guest.id,
      status: input.status,
      attending_count: isAttending ? 1 + input.plus_ones_count : 0,
      submitted_at: new Date().toISOString(),
      notes: input.notes || null,
      created_at: new Date().toISOString(),
    };
    db.responses.unshift(response);

    // 3. Persist Answers to custom questions
    if (input.answers && input.answers.length > 0) {
      for (const ans of input.answers) {
        const answerId = `ans${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`;
        const answerRecord: RsvpAnswer = {
          id: answerId,
          response_id: responseId,
          question_id: ans.question_id,
          answer_text: ans.answer_text || null,
          answer_json: ans.answer_json ?? null,
          created_at: new Date().toISOString(),
        };
        db.answers.push(answerRecord);
      }
    }

    // 4. Ticket generation for confirmed attendees
    let ticket: Ticket | undefined;
    if (isAttending) {
      ticket = db.tickets.find((t) => t.guest_id === guest!.id);
      if (!ticket) {
        ticket = {
          id: `t${Date.now().toString(36)}`,
          event_id: input.event_id,
          guest_id: guest.id,
          ticket_code: generateTicketCode("TK"),
          qr_code_data: `RSVP:${input.event_id}:${guest.qr_token}`,
          status: "valid",
          issued_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        db.tickets.push(ticket);
      }
    }

    // 5. Trigger notification log & confirmation message with rich HTML QR pass
    if (settings?.confirmation_email_enabled) {
      const subject = isAttending
        ? `RSVP Confirmed: ${event.title} (Your Digital Pass)`
        : `RSVP Response Received: ${event.title}`;

      let bodyHtml: string | undefined;
      let bodyText: string;

      if (isAttending && ticket) {
        try {
          const qrDataUrl = await QRCode.toDataURL(ticket.qr_code_data, {
            margin: 2,
            width: 280,
            color: { dark: "#0f172a", light: "#ffffff" },
          });
          bodyHtml = buildTicketEmailHtml(event, guest, ticket, qrDataUrl);
        } catch (e) {
          console.warn("Failed to generate QR data URL for email:", e);
        }

        bodyText = `Hi ${guest.first_name},\n\nYou are confirmed for ${event.title}!\nYour digital ticket code is: ${ticket.ticket_code}.\nDate: ${formatDate(event.start_date, event.timezone)} at ${formatTime(event.start_date, event.timezone)}\nVenue: ${event.location_name || event.location_address || 'See invitation'}\n\nPresent your ticket code or QR pass at the entrance gate. See you there!`;
      } else {
        bodyText = `Hi ${guest.first_name},\n\nWe have received your decline for ${event.title}. We hope to see you at the next one!`;
      }

      await notificationService.send({
        eventId: event.id,
        recipientEmail: guest.email,
        recipientName: `${guest.first_name} ${guest.last_name}`,
        notificationType: "confirmation",
        subject,
        bodyHtml,
        bodyText,
      });

      db.notificationLogs.push({
        id: `nl_${Date.now().toString(36)}`,
        event_id: event.id,
        recipient_email: guest.email,
        recipient_name: `${guest.first_name} ${guest.last_name}`,
        notification_type: "confirmation",
        status: "sent",
        error_message: null,
        created_at: new Date().toISOString(),
      });
    }

    return {
      success: true,
      guest,
      response,
      ticket,
      message: isAttending
        ? "Thank you! Your RSVP is confirmed and your digital ticket pass has been sent to your email."
        : "Thank you for letting us know.",
    };
  }

  public async resendConfirmationEmail(guestEmail: string, eventId: string): Promise<boolean> {
    const event = db.events.find((e) => e.id === eventId);
    const guest = db.guests.find((g) => g.event_id === eventId && g.email.toLowerCase() === guestEmail.toLowerCase().trim());
    if (!event || !guest) return false;

    const ticket = db.tickets.find((t) => t.guest_id === guest.id);
    let qrDataUrl = "";
    if (ticket) {
      try {
        qrDataUrl = await QRCode.toDataURL(ticket.qr_code_data, {
          margin: 2,
          width: 280,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
      } catch (err) {
        console.warn(err);
      }
    }

    const subject = `Your Digital Ticket Pass: ${event.title}`;
    const bodyHtml = ticket ? buildTicketEmailHtml(event, guest, ticket, qrDataUrl) : undefined;
    const bodyText = `Hi ${guest.first_name},\n\nHere is your ticket pass for ${event.title}. Code: ${ticket?.ticket_code || 'GUEST'}.`;

    await notificationService.send({
      eventId: event.id,
      recipientEmail: guest.email,
      recipientName: `${guest.first_name} ${guest.last_name}`,
      notificationType: "confirmation",
      subject,
      bodyHtml,
      bodyText,
    });

    return true;
  }

  public async getResponseForGuest(guestId: string): Promise<RsvpResponse | null> {
    const res = db.responses.find((r) => r.guest_id === guestId);
    return res || null;
  }
}

export const rsvpService = new RsvpService();
