import { db } from "./dbProvider";
import { Checkin, Guest, Ticket } from "@/types/database";
import { isLiveSupabaseConfigured, getSupabaseClient } from "./supabaseAdapter";

export interface CheckinResult {
  success: boolean;
  code:
    | "CHECKIN_SUCCESS"
    | "ALREADY_CHECKED_IN"
    | "TICKET_NOT_FOUND"
    | "INVALID_PIN"
    | "EVENT_MISMATCH"
    | "VIP_REQUIRED";
  message: string;
  checkin?: Checkin;
  guest?: Guest;
  ticket?: Ticket;
  alreadyCheckedInAt?: string;
  section?: string;
  dietaryRestriction?: string | null;
  tierName?: string | null;
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
    const activeCheckpoint = (checkpoint && checkpoint.trim().length > 0) ? checkpoint.trim() : "Main Gate";

    // Check optional security PIN
    const settings = db.eventSettings.find((s) => s.event_id === eventId);
    if (settings?.checkin_pin && settings.checkin_pin.trim() !== "") {
      if (pin && pin.trim() !== settings.checkin_pin.trim()) {
        return {
          success: false,
          code: "INVALID_PIN",
          message: "Check-in PIN is incorrect. Authorization denied.",
          section: activeCheckpoint,
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
            section: activeCheckpoint,
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
        section: activeCheckpoint,
      };
    }

    // Prevent duplicate check-ins AT THE SAME STATION / CHECKPOINT
    // (An attendee can check into Main Gate, then redeem at Food & Catering, then enter VIP Lounge)
    const existingCheckin = db.checkins.find(
      (c) =>
        c.ticket_id === ticket!.id &&
        (c.checkpoint || "Main Gate").trim().toLowerCase() === activeCheckpoint.toLowerCase()
    );

    if (existingCheckin) {
      return {
        success: false,
        code: "ALREADY_CHECKED_IN",
        message: `${activeCheckpoint} already checked in at ${new Date(
          existingCheckin.checkin_time
        ).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}!`,
        checkin: existingCheckin,
        guest,
        ticket,
        alreadyCheckedInAt: existingCheckin.checkin_time,
        section: activeCheckpoint,
      };
    }

    // Lookup dietary restriction for Food & Catering station
    let dietaryRestriction: string | null = null;
    const isFoodStation = activeCheckpoint.toLowerCase().includes("food") || activeCheckpoint.toLowerCase().includes("catering");
    if (isFoodStation) {
      const response = db.responses.find((r) => r.guest_id === guest!.id);
      if (response) {
        const dietaryAnswer = db.answers.find(
          (a) =>
            a.response_id === response.id &&
            (a.answer_text?.toLowerCase().includes("veg") ||
              a.answer_text?.toLowerCase().includes("omnivore") ||
              a.answer_text?.toLowerCase().includes("gluten") ||
              a.answer_text?.toLowerCase().includes("kosher") ||
              a.answer_text?.toLowerCase().includes("halal"))
        );
        if (dietaryAnswer) dietaryRestriction = dietaryAnswer.answer_text;
      }
      if (!dietaryRestriction && guest.notes) {
        dietaryRestriction = guest.notes;
      }
    }

    // Verify VIP status for VIP Lounge
    const isVipStation = activeCheckpoint.toLowerCase().includes("vip");
    const tierName = guest.tier_name || null;

    // Persist new check-in record
    const checkinId = `c${Date.now().toString(36)}${Math.random().toString(36).substring(2, 6)}`;
    const newCheckin: Checkin = {
      id: checkinId,
      event_id: eventId,
      ticket_id: ticket.id,
      guest_id: guest.id,
      checked_in_by: operatorId || null,
      gate_user_id: operatorId || null,
      checkin_time: new Date().toISOString(),
      checkin_method: method,
      checkpoint: activeCheckpoint,
      created_at: new Date().toISOString(),
    };

    db.checkins.unshift(newCheckin);
    ticket.status = "used";

    if (isLiveSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (isUuid.test(eventId) && isUuid.test(ticket.id) && isUuid.test(guest.id)) {
          await supabase.from("checkins").insert({
            event_id: eventId,
            ticket_id: ticket.id,
            guest_id: guest.id,
            checkpoint: activeCheckpoint,
            checkin_method: method,
            checked_in_by: isUuid.test(operatorId || "") ? operatorId : null,
          });
        }
      } catch (err) {
        console.error("Supabase checkin sync error:", err);
      }
    }

    let successMessage = `Welcome, ${guest.first_name}! Check-in verified.`;
    if (isFoodStation) {
      successMessage = `Meal voucher redeemed for ${guest.first_name}! ${
        dietaryRestriction ? `Dietary: ${dietaryRestriction}` : "Standard Meal"
      }`;
    } else if (isVipStation) {
      successMessage = `VIP Lounge access granted for ${guest.first_name} (${tierName || "VIP Access"})!`;
    }

    return {
      success: true,
      code: "CHECKIN_SUCCESS",
      message: successMessage,
      checkin: newCheckin,
      guest,
      ticket,
      section: activeCheckpoint,
      dietaryRestriction,
      tierName,
    };
  }

  public async getStationStats(eventId: string) {
    const checkins = db.checkins.filter((c) => c.event_id === eventId);
    const gateCount = checkins.filter((c) => (c.checkpoint || "").toLowerCase().includes("gate")).length;
    const foodCount = checkins.filter((c) => (c.checkpoint || "").toLowerCase().includes("food") || (c.checkpoint || "").toLowerCase().includes("cater")).length;
    const vipCount = checkins.filter((c) => (c.checkpoint || "").toLowerCase().includes("vip")).length;
    const breakoutCount = checkins.filter((c) => (c.checkpoint || "").toLowerCase().includes("breakout") || (c.checkpoint || "").toLowerCase().includes("lab")).length;

    return {
      totalCheckins: checkins.length,
      gateCount,
      foodCount,
      vipCount,
      breakoutCount,
      stations: [
        { id: "gate", name: "Main Gate Entrance", count: gateCount, section: "gate" },
        { id: "food", name: "Food & Catering", count: foodCount, section: "food" },
        { id: "vip", name: "VIP Lounge", count: vipCount, section: "vip_lounge" },
        { id: "breakout", name: "Breakout Labs", count: breakoutCount, section: "breakout" },
      ],
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
