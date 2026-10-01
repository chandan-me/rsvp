import { db } from "./dbProvider";
import { Event, EventSettings, EventStats } from "@/types/database";
import { EventInput, EventSettingsInput } from "@/lib/validations/event";
import { generateSlug } from "@/lib/utils";

export class EventService {
  public async getEvents(): Promise<Event[]> {
    return [...db.events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async getEventById(id: string): Promise<Event | null> {
    const event = db.events.find((e) => e.id === id);
    return event || null;
  }

  public async getEventBySlug(slug: string): Promise<Event | null> {
    const event = db.events.find((e) => e.slug === slug);
    return event || null;
  }

  public async createEvent(input: EventInput, userId?: string): Promise<Event> {
    const id = `e${Date.now().toString(36)}${Math.random().toString(36).substring(2, 7)}`;
    const slug = input.slug ? generateSlug(input.slug) : generateSlug(input.title);

    // Verify slug uniqueness
    let finalSlug = slug;
    let counter = 1;
    while (db.events.some((e) => e.slug === finalSlug)) {
      finalSlug = `${slug}-${counter++}`;
    }

    const newEvent: Event = {
      id,
      created_by: userId || db.profiles[0]?.id || null,
      title: input.title,
      slug: finalSlug,
      description: input.description || null,
      cover_image_url:
        input.cover_image_url ||
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80",
      start_date: input.start_date,
      end_date: input.end_date || null,
      timezone: input.timezone || "UTC",
      location_name: input.location_name || null,
      location_address: input.location_address || null,
      is_published: input.is_published ?? true,
      max_capacity: input.max_capacity ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.events.unshift(newEvent);

    // Initialize default event settings
    const newSettings: EventSettings = {
      id: `s${Date.now().toString(36)}`,
      event_id: id,
      allow_guest_list_public: false,
      notify_host_on_rsvp: true,
      confirmation_email_enabled: true,
      checkin_pin: null,
      close_rsvp_at: null,
      is_rsvp_closed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.eventSettings.push(newSettings);

    return newEvent;
  }

  public async updateEvent(id: string, input: Partial<EventInput>): Promise<Event | null> {
    const index = db.events.findIndex((e) => e.id === id);
    if (index === -1) return null;

    const existing = db.events[index];
    const updated: Event = {
      ...existing,
      ...input,
      updated_at: new Date().toISOString(),
    };

    db.events[index] = updated;
    return updated;
  }

  public async getEventSettings(eventId: string): Promise<EventSettings> {
    let settings = db.eventSettings.find((s) => s.event_id === eventId);
    if (!settings) {
      settings = {
        id: `s${Date.now().toString(36)}`,
        event_id: eventId,
        allow_guest_list_public: false,
        notify_host_on_rsvp: true,
        confirmation_email_enabled: true,
        checkin_pin: null,
        close_rsvp_at: null,
        is_rsvp_closed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.eventSettings.push(settings);
    }
    return settings;
  }

  public async updateEventSettings(
    eventId: string,
    input: Partial<EventSettingsInput>
  ): Promise<EventSettings> {
    const settings = await this.getEventSettings(eventId);
    const index = db.eventSettings.findIndex((s) => s.event_id === eventId);

    const updated: EventSettings = {
      ...settings,
      ...input,
      updated_at: new Date().toISOString(),
    };

    if (index !== -1) {
      db.eventSettings[index] = updated;
    } else {
      db.eventSettings.push(updated);
    }

    return updated;
  }

  public async getEventStats(eventId: string): Promise<EventStats> {
    const event = await this.getEventById(eventId);
    const guests = db.guests.filter((g) => g.event_id === eventId);
    const checkins = db.checkins.filter((c) => c.event_id === eventId);

    const invited = guests.filter((g) => g.status === "invited").length;
    const pending = guests.filter((g) => g.status === "pending").length;
    const attendingGuests = guests.filter((g) => g.status === "attending");
    const declined = guests.filter((g) => g.status === "declined").length;

    // Total headcount = attending guests + their plus-ones
    const totalAttendeesCount = attendingGuests.reduce(
      (sum, g) => sum + 1 + (g.plus_ones_count || 0),
      0
    );

    const checkedInCount = checkins.length;
    const checkinPercentage =
      totalAttendeesCount > 0 ? Math.round((checkedInCount / totalAttendeesCount) * 100) : 0;

    const capacityLimit = event?.max_capacity || null;
    const capacityRemaining =
      capacityLimit !== null ? Math.max(0, capacityLimit - totalAttendeesCount) : null;

    return {
      totalGuests: guests.length,
      invited,
      pending,
      attending: attendingGuests.length,
      declined,
      totalAttendeesCount,
      checkedInCount,
      checkinPercentage,
      capacityLimit,
      capacityRemaining,
    };
  }
}

export const eventService = new EventService();
