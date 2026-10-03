import { db } from "./dbProvider";
import { RsvpResponse, RsvpAnswer, Guest, Ticket, Event, GuestStatus, RsvpStatus } from "@/types/database";
import { RsvpSubmissionInput } from "@/lib/validations/rsvp";
import { generateTicketCode, generateQrToken, formatDate, formatTime, createGoogleCalendarUrl } from "@/lib/utils";
import { notificationService } from "@/lib/notifications/service";
import QRCode from "qrcode";

export interface RsvpSubmissionResult {
  success: boolean;
  guest: Guest;
  response: RsvpResponse;
  ticket?: Ticket;
  plus_one_guests?: { guest: Guest; ticket: Ticket }[];
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

import { eventService } from "./eventService";

export class RsvpService {
  public async submitRsvp(input: RsvpSubmissionInput): Promise<RsvpSubmissionResult> {
    let event = db.events.find((e) => e.id === input.event_id);
    if (!event) {
      event = await eventService.getEventById(input.event_id) || undefined;
    }
    if (!event) {
      throw new Error("Event not found.");
    }

    let settings = db.eventSettings.find((s) => s.event_id === input.event_id);
    if (!settings) {
      settings = await eventService.getEventSettings(input.event_id);
    }
    if (settings?.is_rsvp_closed) {
      throw new Error("RSVP submissions for this event are currently closed.");
    }

    if (settings?.close_rsvp_at && new Date() > new Date(settings.close_rsvp_at)) {
      throw new Error("The RSVP deadline for this event has passed.");
    }

    // Check capacity and screening policies
    const stats = await eventService.getEventStats(input.event_id, event);
    const isCapacityFull =
      stats.capacityLimit !== null &&
      stats.capacityRemaining !== null &&
      stats.capacityRemaining <= 0;

    let effectiveStatus = input.status as GuestStatus;
    if (input.status === "attending") {
      if (isCapacityFull && settings?.enable_waitlist) {
        effectiveStatus = "waitlisted";
      } else if (settings?.requires_approval) {
        effectiveStatus = "pending_approval";
      }
    }

    // Resolve tier name if tier_id is provided
    let tierName: string | null = null;
    if (input.tier_id) {
      const tier = db.ticketTiers?.find(
        (t) => t.id === input.tier_id && t.event_id === input.event_id
      );
      if (tier) tierName = tier.name;
    }

    // 1. Transactional guest resolution: Find existing or create new
    let guest = db.guests.find(
      (g) =>
        g.event_id === input.event_id &&
        g.email.toLowerCase() === input.email.toLowerCase().trim()
    );

    const isAttending = effectiveStatus === "attending";

    if (guest) {
      // Update existing guest record
      guest.first_name = input.first_name;
      guest.last_name = input.last_name;
      guest.phone = input.phone || guest.phone;
      guest.status = effectiveStatus;
      guest.plus_ones_count = isAttending ? input.plus_ones_count : 0;
      guest.notes = input.notes || guest.notes;
      if (input.tier_id) guest.tier_id = input.tier_id;
      if (tierName) guest.tier_name = tierName;
      guest.updated_at = new Date().toISOString();
    } else {
      // Create new guest
      const guestId = crypto.randomUUID();
      const qrToken = generateQrToken();

      guest = {
        id: guestId,
        event_id: input.event_id,
        first_name: input.first_name,
        last_name: input.last_name,
        email: input.email.toLowerCase().trim(),
        phone: input.phone || null,
        status: effectiveStatus,
        plus_ones_allowed: input.plus_ones_count > 0 ? input.plus_ones_count : 0,
        plus_ones_count: isAttending ? input.plus_ones_count : 0,
        qr_token: qrToken,
        notes: input.notes || null,
        tier_id: input.tier_id || null,
        tier_name: tierName,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.guests.unshift(guest);
    }

    // 2. Persist RSVP response record
    const responseId = crypto.randomUUID();
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
      for (let i = 0; i < input.answers.length; i++) {
        const ans = input.answers[i];
        const answerId = crypto.randomUUID();
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

    // 4. Ticket generation for confirmed attendees only
    let ticket: Ticket | undefined;
    const plusOneGuestsList: { guest: Guest; ticket: Ticket }[] = [];
    if (isAttending) {
      ticket = db.tickets.find((t) => t.guest_id === guest!.id);
      if (!ticket) {
        ticket = {
          id: crypto.randomUUID(),
          event_id: input.event_id,
          guest_id: guest.id,
          ticket_code: guest.qr_token,
          qr_code_data: `RSVP:${input.event_id}:${guest.qr_token}`,
          status: "valid",
          issued_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        db.tickets.push(ticket);
      }

      // Generate dedicated individual tickets for plus-ones
      if (input.plus_ones_details && input.plus_ones_details.length > 0) {
        for (const po of input.plus_ones_details) {
          const poName = (po as any).name || "";
          const firstName = (po.first_name || (poName ? poName.split(" ")[0] : "Guest")).trim();
          const lastName = (po.last_name || (poName ? poName.split(" ").slice(1).join(" ") : "") || "Guest").trim();
          if (!po.email) continue;

          const poGuestId = crypto.randomUUID();
          const poQrToken = generateQrToken();

          const poGuest: Guest = {
            id: poGuestId,
            event_id: input.event_id,
            first_name: firstName,
            last_name: lastName,
            email: po.email.trim().toLowerCase(),
            phone: null,
            status: "attending",
            plus_ones_allowed: 0,
            plus_ones_count: 0,
            qr_token: poQrToken,
            notes: `Guest of ${guest.first_name} ${guest.last_name}`,
            primary_guest_id: guest.id,
            is_plus_one: true,
            tier_id: guest.tier_id,
            tier_name: guest.tier_name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          db.guests.push(poGuest);

          const poTicket: Ticket = {
            id: crypto.randomUUID(),
            event_id: input.event_id,
            guest_id: poGuestId,
            ticket_code: poQrToken,
            qr_code_data: `RSVP:${input.event_id}:${poQrToken}`,
            status: "valid",
            issued_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          };
          db.tickets.push(poTicket);
          plusOneGuestsList.push({ guest: poGuest, ticket: poTicket });
        }
      }
    }

    // 5. Trigger notification log & confirmation message with rich HTML QR pass
    if (settings?.confirmation_email_enabled) {
      let subject = `RSVP Response Received: ${event.title}`;
      let bodyText = `Hi ${guest.first_name},\n\nWe have received your response for ${event.title}.`;
      let bodyHtml: string | undefined;

      if (effectiveStatus === "attending" && ticket) {
        subject = `RSVP Confirmed: ${event.title} (Your Digital Pass)`;
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
        bodyText = `Hi ${guest.first_name},\n\nYou are confirmed for ${event.title}!\nYour digital ticket code is: ${ticket.ticket_code}.\nDate: ${formatDate(event.start_date, event.timezone)} at ${formatTime(event.start_date, event.timezone)}\nVenue: ${event.location_name || event.location_address || "See invitation"}\n\nPresent your ticket code or QR pass at the entrance gate. See you there!`;
      } else if (effectiveStatus === "pending_approval") {
        subject = `Application Received: ${event.title} (Host Screening)`;
        bodyText = `Hi ${guest.first_name},\n\nThank you for applying to attend ${event.title}. The event host requires attendee screening. We will notify you with your digital pass as soon as your registration is approved.`;
      } else if (effectiveStatus === "waitlisted") {
        subject = `Waitlist Confirmation: ${event.title}`;
        bodyText = `Hi ${guest.first_name},\n\n${event.title} is currently at capacity. You are on the priority waitlist. If a spot opens up, your ticket will be issued automatically.`;
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

    let returnMessage = "Thank you! Your RSVP is confirmed and your digital ticket pass has been sent to your email.";
    if (effectiveStatus === "pending_approval") {
      returnMessage = "Your registration has been submitted for host review. You will receive your digital pass once approved.";
    } else if (effectiveStatus === "waitlisted") {
      returnMessage = "This event is currently at capacity. You have been added to the priority waitlist and will be notified if a spot opens up.";
    } else if (effectiveStatus === "declined") {
      returnMessage = "Thank you for letting us know.";
    }

    return {
      success: true,
      guest,
      response,
      ticket,
      plus_one_guests: plusOneGuestsList,
      message: returnMessage,
    };
  }

  // ====================================================================
  // Host Approval & Screening Methods
  // ====================================================================

  public async approveGuest(
    eventId: string,
    guestId: string
  ): Promise<{ guest: Guest; ticket: Ticket } | null> {
    const guest = db.guests.find((g) => g.event_id === eventId && g.id === guestId);
    if (!guest) return null;

    guest.status = "attending";
    guest.updated_at = new Date().toISOString();

    // Issue ticket if not yet issued
    let ticket = db.tickets.find((t) => t.guest_id === guest.id);
    if (!ticket) {
      ticket = {
        id: `${guest.qr_token}-TK`,
        event_id: eventId,
        guest_id: guest.id,
        ticket_code: guest.qr_token,
        qr_code_data: `RSVP:${eventId}:${guest.qr_token}`,
        status: "valid",
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      db.tickets.push(ticket);
    } else {
      ticket.status = "valid";
    }

    // Send pass via email
    await this.resendConfirmationEmail(guest.email, eventId);
    return { guest, ticket };
  }

  public async declineGuest(eventId: string, guestId: string): Promise<boolean> {
    const guest = db.guests.find((g) => g.event_id === eventId && g.id === guestId);
    if (!guest) return false;

    guest.status = "declined";
    guest.updated_at = new Date().toISOString();

    const ticket = db.tickets.find((t) => t.guest_id === guest.id);
    if (ticket) {
      ticket.status = "cancelled";
    }

    // Auto-promote next waitlisted guest if capacity freed up
    await this.promoteNextWaitlistedGuest(eventId);
    return true;
  }

  // ====================================================================
  // Waitlist Auto-Promotion
  // ====================================================================

  public async promoteNextWaitlistedGuest(eventId: string): Promise<Guest | null> {
    const event = db.events.find((e) => e.id === eventId);
    const settings = db.eventSettings.find((s) => s.event_id === eventId);
    if (!settings?.enable_waitlist) return null;

    const waitlistedGuests = db.guests
      .filter((g) => g.event_id === eventId && g.status === "waitlisted")
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (waitlistedGuests.length === 0) return null;

    const candidate = waitlistedGuests[0];
    if (settings.requires_approval) {
      candidate.status = "pending_approval";
      candidate.updated_at = new Date().toISOString();
      return candidate;
    }

    // Direct promotion to attending
    candidate.status = "attending";
    candidate.updated_at = new Date().toISOString();

    let ticket = db.tickets.find((t) => t.guest_id === candidate.id);
    if (!ticket) {
      ticket = {
        id: `${candidate.qr_token}-TK`,
        event_id: eventId,
        guest_id: candidate.id,
        ticket_code: candidate.qr_token,
        qr_code_data: `RSVP:${eventId}:${candidate.qr_token}`,
        status: "valid",
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      db.tickets.push(ticket);
    } else {
      ticket.status = "valid";
    }

    if (event) {
      await this.resendConfirmationEmail(candidate.email, eventId);
    }

    return candidate;
  }

  // ====================================================================
  // Guest Self-Service Portal (/e/[slug]/rsvp/[token])
  // ====================================================================

  public async getGuestByToken(
    eventId: string,
    token: string
  ): Promise<{
    guest: Guest;
    ticket?: Ticket;
    plusOnes: (Guest & { ticket?: Ticket })[];
    plus_ones?: (Guest & { ticket?: Ticket })[];
    answers: RsvpAnswer[];
  } | null> {
    const cleanToken = token.trim();
    const guest = db.guests.find(
      (g) =>
        g.event_id === eventId &&
        (g.qr_token.toLowerCase() === cleanToken.toLowerCase() ||
          g.id === cleanToken ||
          (g.ticket?.ticket_code && g.ticket.ticket_code.toLowerCase() === cleanToken.toLowerCase()))
    );

    if (!guest) return null;

    const ticket = db.tickets.find((t) => t.guest_id === guest.id);
    const plusOnes = db.guests
      .filter((g) => g.primary_guest_id === guest.id)
      .map((po) => ({
        ...po,
        ticket: db.tickets.find((t) => t.guest_id === po.id),
      }));

    const response = db.responses.find((r) => r.guest_id === guest.id);
    const answers = response ? db.answers.filter((a) => a.response_id === response.id) : [];

    return {
      guest,
      ticket,
      plusOnes,
      plus_ones: plusOnes,
      answers,
    };
  }

  public async updateGuestSelfService(
    eventId: string,
    token: string,
    input: {
      first_name?: string;
      last_name?: string;
      phone?: string | null;
      status?: "attending" | "declined";
      cancelAttendance?: boolean;
      notes?: string | null;
      answers?: { question_id: string; answer_text?: string | null; answer_json?: any }[];
    }
  ): Promise<{ success: boolean; guest?: Guest; promotedGuest?: Guest }> {
    const data = await this.getGuestByToken(eventId, token);
    if (!data) return { success: false };

    const { guest, ticket } = data;
    const wasAttending = guest.status === "attending";
    let promotedGuest: Guest | undefined;

    if (input.first_name) guest.first_name = input.first_name.trim();
    if (input.last_name) guest.last_name = input.last_name.trim();
    if (input.phone !== undefined) guest.phone = input.phone;
    if (input.notes !== undefined) guest.notes = input.notes;

    const targetStatus = input.cancelAttendance ? "declined" : input.status;

    if (targetStatus) {
      guest.status = targetStatus;
      if (targetStatus === "declined" && ticket) {
        ticket.status = "cancelled";
        // Free up spot -> promote waitlisted attendee
        if (wasAttending) {
          const promoted = await this.promoteNextWaitlistedGuest(eventId);
          if (promoted) {
            promotedGuest = promoted;
          }
        }
      }
    }

    guest.updated_at = new Date().toISOString();

    // Update answers if provided
    if (input.answers && input.answers.length > 0) {
      let response = db.responses.find((r) => r.guest_id === guest.id);
      if (!response) {
        const newResponse: RsvpResponse = {
          id: `resp${Date.now().toString(36)}`,
          event_id: eventId,
          guest_id: guest.id,
          status: (guest.status === "declined" ? "declined" : "attending") as RsvpStatus,
          attending_count: 1 + guest.plus_ones_count,
          submitted_at: new Date().toISOString(),
          notes: guest.notes || null,
          created_at: new Date().toISOString(),
        };
        db.responses.push(newResponse);
        response = newResponse;
      }
      for (const ans of input.answers) {
        const existingAns = db.answers.find(
          (a) => a.response_id === response!.id && a.question_id === ans.question_id
        );
        if (existingAns) {
          existingAns.answer_text = ans.answer_text !== undefined ? ans.answer_text : existingAns.answer_text;
          existingAns.answer_json = ans.answer_json !== undefined ? ans.answer_json : existingAns.answer_json;
        } else {
          db.answers.push({
            id: `ans${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 5)}`,
            response_id: response!.id,
            question_id: ans.question_id,
            answer_text: ans.answer_text || null,
            answer_json: ans.answer_json ?? null,
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    return { success: true, guest, promotedGuest };
  }

  public async resendConfirmationEmail(guestEmail: string, eventId: string): Promise<boolean> {
    const event = db.events.find((e) => e.id === eventId);
    const guest = db.guests.find(
      (g) => g.event_id === eventId && g.email.toLowerCase() === guestEmail.toLowerCase().trim()
    );
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
    const bodyText = `Hi ${guest.first_name},\n\nHere is your ticket pass for ${event.title}. Code: ${ticket?.ticket_code || "GUEST"}.`;

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
