import { db } from "./dbProvider";
import { Checkin, Guest, Ticket } from "@/types/database";

export interface CheckinResult {
  success: boolean;
  code: "CHECKIN_SUCCESS" | "ALREADY_CHECKED_IN" | "TICKET_NOT_FOUND" | "INVALID_PIN" | "EVENT_MISMATCH";
  message: string;
  checkin?: Checkin;
  guest?: Guest;
  ticket?: Ticket;
  alreadyCheckedInAt?: string;
}

export class CheckinService {
  public async processCheckin(params: {
    eventId: string;
    codeOrToken: string;
    method?: "qr_scan" | "manual";
    pin?: string | null;
    checkpoint?: string | null;
    operatorId?: string | null;
  }): Promise<CheckinResult> {
    const { eventId, codeOrToken, method = "qr_scan", pin, checkpoint, operatorId } = params;

    // Check optional security PIN
    const settings = db.eventSettings.find((s) => s.event_id === eventId);
    if (settings?.checkin_pin && settings.checkin_pin.trim() !== "") {
      if (pin && pin.trim() !== settings.checkin_pin.trim()) {
        return {
          success: false,
          code: "INVALID_PIN",
          message: "Check-in PIN is incorrect. Authorization denied.",
        };
      }
    }

    // Clean code / token input (handling full QR strings like "RSVP:<event_id>:<token>")
    let cleanCode = codeOrToken.trim();
    if (cleanCode.startsWith("RSVP:")) {
      const parts = cleanCode.split(":");
      if (parts.length >= 3) {
        const qrEventId = parts[1];
        cleanCode = parts[2];
        if (qrEventId !== eventId) {
          return {
            success: false,
            code: "EVENT_MISMATCH",
            message: "This QR code belongs to a different event.",
          };
        }
      }
    }

    // Find ticket by ticket_code or by guest's qr_token or guest id
    let guest = db.guests.find(
      (g) =>
        g.event_id === eventId &&
        (g.qr_token.toLowerCase() === cleanCode.toLowerCase() ||
          g.id === cleanCode ||
          g.email.toLowerCase() === cleanCode.toLowerCase())
    );

    let ticket: Ticket | undefined;

    if (guest) {
      ticket = db.tickets.find((t) => t.guest_id === guest!.id && t.event_id === eventId);
      if (!ticket) {
        // Auto-create ticket if attendee confirmed but ticket missing
        ticket = {
          id: `t${Date.now().toString(36)}`,
          event_id: eventId,
          guest_id: guest.id,
          ticket_code: `TK-${guest.qr_token.replace(/^TOKEN-/, "")}`,
          qr_code_data: `RSVP:${eventId}:${guest.qr_token}`,
          status: "valid",
          issued_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        };
        db.tickets.push(ticket);
      }
    } else {
      ticket = db.tickets.find(
        (t) =>
          t.event_id === eventId &&
          t.ticket_code.toLowerCase() === cleanCode.toLowerCase()
      );
      if (ticket) {
        guest = db.guests.find((g) => g.id === ticket!.guest_id);
      }
    }

    if (!ticket || !guest) {
      return {
        success: false,
        code: "TICKET_NOT_FOUND",
        message: `No matching guest or ticket found for "${cleanCode}".`,
      };
    }

    // Prevent duplicate check-ins
    const existingCheckin = db.checkins.find((c) => c.ticket_id === ticket!.id);
    if (existingCheckin) {
      return {
        success: false,
        code: "ALREADY_CHECKED_IN",
        message: `Already checked in at ${new Date(existingCheckin.checkin_time).toLocaleTimeString()}!`,
        checkin: existingCheckin,
        guest,
        ticket,
        alreadyCheckedInAt: existingCheckin.checkin_time,
      };
    }

    // Persist new check-in record
    const checkinId = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
    const newCheckin: Checkin = {
      id: checkinId,
      event_id: eventId,
      ticket_id: ticket.id,
      guest_id: guest.id,
      checked_in_by: operatorId || null,
      checkin_time: new Date().toISOString(),
      checkin_method: method,
      checkpoint: checkpoint || "Main Gate",
      created_at: new Date().toISOString(),
    };

    db.checkins.unshift(newCheckin);
    ticket.status = "used";

    return {
      success: true,
      code: "CHECKIN_SUCCESS",
      message: `Welcome, ${guest.first_name}! Check-in verified.`,
      checkin: newCheckin,
      guest,
      ticket,
    };
  }

  public async getRecentCheckins(
    eventId: string,
    limit = 10
  ): Promise<(Checkin & { guest: Guest; ticket: Ticket })[]> {
    const checkins = db.checkins.filter((c) => c.event_id === eventId);
    const sorted = [...checkins].sort(
      (a, b) => new Date(b.checkin_time).getTime() - new Date(a.checkin_time).getTime()
    );

    return sorted.slice(0, limit).map((c) => {
      const guest = db.guests.find((g) => g.id === c.guest_id)!;
      const ticket = db.tickets.find((t) => t.id === c.ticket_id)!;
      return {
        ...c,
        guest,
        ticket,
      };
    });
  }
}

export const checkinService = new CheckinService();
