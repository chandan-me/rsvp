import { db } from "./dbProvider";
import { RsvpResponse, RsvpAnswer, Guest, Ticket } from "@/types/database";
import { RsvpSubmissionInput } from "@/lib/validations/rsvp";
import { generateTicketCode, generateQrToken } from "@/lib/utils";
import { notificationService } from "@/lib/notifications/service";

export interface RsvpSubmissionResult {
  success: boolean;
  guest: Guest;
  response: RsvpResponse;
  ticket?: Ticket;
  message: string;
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

    // 5. Trigger notification log & confirmation message
    if (settings?.confirmation_email_enabled) {
      const subject = isAttending
        ? `RSVP Confirmed: ${event.title}`
        : `RSVP Response Received: ${event.title}`;

      const bodyText = isAttending
        ? `Hi ${guest.first_name},\n\nYou are confirmed for ${event.title}!\nYour digital ticket code is: ${ticket?.ticket_code}.\nSee you there!`
        : `Hi ${guest.first_name},\n\nWe have received your decline for ${event.title}. We hope to see you at the next one!`;

      await notificationService.send({
        eventId: event.id,
        recipientEmail: guest.email,
        recipientName: `${guest.first_name} ${guest.last_name}`,
        notificationType: "confirmation",
        subject,
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
        ? "Thank you! Your RSVP is confirmed."
        : "Thank you for letting us know.",
    };
  }

  public async getResponseForGuest(guestId: string): Promise<RsvpResponse | null> {
    const res = db.responses.find((r) => r.guest_id === guestId);
    return res || null;
  }
}

export const rsvpService = new RsvpService();
