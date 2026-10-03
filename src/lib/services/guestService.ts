import { db } from "./dbProvider";
import { Guest, GuestStatus } from "@/types/database";
import { GuestInput } from "@/lib/validations/guest";
import { generateQrToken, generateTicketCode, generateProfessionalId } from "@/lib/utils";

export interface GuestFilterOptions {
  search?: string;
  status?: GuestStatus | "all";
  checkedInOnly?: boolean;
  notCheckedInOnly?: boolean;
}

export class GuestService {
  public async getGuests(
    eventId: string,
    options?: GuestFilterOptions
  ): Promise<(Guest & { isCheckedIn: boolean; checkinTime?: string; ticketCode?: string })[]> {
    let guests = db.guests.filter(
      (g) => g.event_id === eventId || (eventId === "90763a0e-7f19-4b22-95f7-343c7af3a3d7" && g.event_id === "GBH-dec-2026-001")
    );

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      guests = guests.filter(
        (g) =>
          g.first_name.toLowerCase().includes(q) ||
          g.last_name.toLowerCase().includes(q) ||
          g.email.toLowerCase().includes(q) ||
          (g.phone && g.phone.toLowerCase().includes(q))
      );
    }

    if (options?.status && options.status !== "all") {
      guests = guests.filter((g) => g.status === options.status);
    }

    const enhanced = guests.map((guest) => {
      const ticket = db.tickets.find((t) => t.guest_id === guest.id);
      const checkin = ticket ? db.checkins.find((c) => c.ticket_id === ticket.id) : undefined;

      return {
        ...guest,
        ticket,
        checkin,
        isCheckedIn: Boolean(checkin),
        checkinTime: checkin?.checkin_time,
        ticketCode: ticket?.ticket_code,
      };
    });

    if (options?.checkedInOnly) {
      return enhanced.filter((g) => g.isCheckedIn);
    }

    if (options?.notCheckedInOnly) {
      return enhanced.filter((g) => !g.isCheckedIn);
    }

    return enhanced.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async getGuestById(id: string): Promise<Guest | null> {
    const guest = db.guests.find((g) => g.id === id);
    if (!guest) return null;

    const ticket = db.tickets.find((t) => t.guest_id === guest.id);
    const checkin = ticket ? db.checkins.find((c) => c.ticket_id === ticket.id) : undefined;

    return {
      ...guest,
      ticket,
      checkin,
    };
  }

  public async getGuestByToken(token: string): Promise<Guest | null> {
    const guest = db.guests.find((g) => g.qr_token === token);
    return guest || null;
  }

  public async getGuestByEmail(eventId: string, email: string): Promise<Guest | null> {
    const guest = db.guests.find(
      (g) => g.event_id === eventId && g.email.toLowerCase() === email.toLowerCase().trim()
    );
    return guest || null;
  }

  public async createGuest(eventId: string, input: GuestInput): Promise<Guest> {
    const existing = await this.getGuestByEmail(eventId, input.email);
    if (existing) {
      throw new Error(`A guest with email "${input.email}" is already on the list for this event.`);
    }

    const event = db.events.find((e) => e.id === eventId);
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    const qrToken = generateProfessionalId(
      event?.title || "Event",
      event?.start_date,
      randomNum
    );
    const guestId = `${qrToken}-GUEST`;

    const newGuest: Guest = {
      id: guestId,
      event_id: eventId,
      first_name: input.first_name,
      last_name: input.last_name,
      email: input.email.toLowerCase().trim(),
      phone: input.phone || null,
      status: input.status,
      plus_ones_allowed: input.plus_ones_allowed ?? 0,
      plus_ones_count: input.plus_ones_count ?? 0,
      qr_token: qrToken,
      notes: input.notes || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.guests.unshift(newGuest);

    // If status is attending, generate ticket automatically
    if (newGuest.status === "attending") {
      const ticketCode = qrToken;
      db.tickets.push({
        id: `${qrToken}-TK`,
        event_id: eventId,
        guest_id: newGuest.id,
        ticket_code: ticketCode,
        qr_code_data: `RSVP:${eventId}:${newGuest.qr_token}`,
        status: "valid",
        issued_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    }

    return newGuest;
  }

  public async updateGuest(id: string, input: Partial<GuestInput>): Promise<Guest | null> {
    const index = db.guests.findIndex((g) => g.id === id);
    if (index === -1) return null;

    const existing = db.guests[index];
    const updated: Guest = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    };

    db.guests[index] = updated;

    // Manage ticket status if attending status changed
    if (updated.status === "attending") {
      const existingTicket = db.tickets.find((t) => t.guest_id === id);
      if (!existingTicket) {
        db.tickets.push({
          id: `t${Date.now().toString(36)}`,
          event_id: updated.event_id,
          guest_id: updated.id,
          ticket_code: generateTicketCode("TK"),
          qr_code_data: `RSVP:${updated.event_id}:${updated.qr_token}`,
          status: "valid",
          issued_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      }
    }

    return updated;
  }

  public async deleteGuest(id: string): Promise<boolean> {
    const initialLen = db.guests.length;
    db.guests = db.guests.filter((g) => g.id !== id);
    db.tickets = db.tickets.filter((t) => t.guest_id !== id);
    db.checkins = db.checkins.filter((c) => c.guest_id !== id);
    db.responses = db.responses.filter((r) => r.guest_id !== id);
    return db.guests.length < initialLen;
  }

  public async blockGuest(eventId: string, guestId: string, reason: string): Promise<Guest | null> {
    const guest = db.guests.find(
      (g) => g.id === guestId && (g.event_id === eventId || (eventId === "90763a0e-7f19-4b22-95f7-343c7af3a3d7" && g.event_id === "GBH-dec-2026-001"))
    );
    if (!guest) return null;

    guest.is_blocked = true;
    guest.blocked_reason = reason.trim();
    guest.blocked_at = new Date().toISOString();
    guest.status = "blocked";
    guest.updated_at = new Date().toISOString();

    return guest;
  }

  public async unblockGuest(eventId: string, guestId: string): Promise<Guest | null> {
    const guest = db.guests.find(
      (g) => g.id === guestId && (g.event_id === eventId || (eventId === "90763a0e-7f19-4b22-95f7-343c7af3a3d7" && g.event_id === "GBH-dec-2026-001"))
    );
    if (!guest) return null;

    guest.is_blocked = false;
    guest.blocked_reason = null;
    guest.blocked_at = null;
    guest.status = "attending";
    guest.updated_at = new Date().toISOString();

    return guest;
  }

  public async regenerateQr(eventId: string, guestId: string): Promise<{ guest: Guest; ticket: any } | null> {
    const guest = db.guests.find(
      (g) => g.id === guestId && (g.event_id === eventId || (eventId === "90763a0e-7f19-4b22-95f7-343c7af3a3d7" && g.event_id === "GBH-dec-2026-001"))
    );
    if (!guest) return null;

    const event = db.events.find((e) => e.id === eventId);
    const newRandom = Math.floor(1000 + Math.random() * 9000);
    const newQrToken = generateProfessionalId(event?.title || "Event", event?.start_date, newRandom);

    guest.qr_token = newQrToken;
    guest.updated_at = new Date().toISOString();

    let ticket = db.tickets.find((t) => t.guest_id === guestId);
    if (ticket) {
      ticket.ticket_code = newQrToken;
      ticket.qr_code_data = `RSVP:${eventId}:${newQrToken}`;
      ticket.status = "valid";
    }

    return { guest, ticket };
  }

  public async exportGuestsCsv(eventId: string): Promise<string> {
    const guests = await this.getGuests(eventId);
    const headers = [
      "First Name",
      "Last Name",
      "Email",
      "Phone",
      "RSVP Status",
      "Plus Ones",
      "Checked In",
      "Check-in Time",
      "Ticket Code",
      "QR Token",
      "Notes",
      "Created At",
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""';
      let str = String(val).replace(/"/g, '""');
      // Defend against CSV / Formula Injection (CWE-1236)
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      return `"${str}"`;
    };

    const rows = guests.map((g) => [
      escapeCsv(g.first_name),
      escapeCsv(g.last_name),
      escapeCsv(g.email),
      escapeCsv(g.phone),
      escapeCsv(g.status),
      escapeCsv(g.plus_ones_count),
      escapeCsv(g.isCheckedIn ? "Yes" : "No"),
      escapeCsv(g.checkinTime ? new Date(g.checkinTime).toLocaleString() : ""),
      escapeCsv(g.ticketCode),
      escapeCsv(g.qr_token),
      escapeCsv(g.notes),
      escapeCsv(new Date(g.created_at).toLocaleString()),
    ]);

    return [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
  }
}

export const guestService = new GuestService();
