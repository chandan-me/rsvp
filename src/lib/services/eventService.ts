import { db } from "./dbProvider";
import { Event, EventSettings, EventStats } from "@/types/database";
import { EventInput, EventSettingsInput } from "@/lib/validations/event";
import { generateSlug } from "@/lib/utils";
import { isLiveSupabaseConfigured, getSupabaseClient } from "./supabaseAdapter";
export class EventService {
  private eventsListCache: { events: Event[]; timestamp: number } | null = null;

  public async getEvents(): Promise<Event[]> {
    if (this.eventsListCache && Date.now() - this.eventsListCache.timestamp < this.CACHE_TTL_MS) {
      return this.eventsListCache.events;
    }

    if (isLiveSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && data) {
          const list = data as Event[];
          this.eventsListCache = { events: list, timestamp: Date.now() };
          return list;
        }
      } catch (err) {
        console.error("Supabase getEvents error, falling back to local:", err);
      }
    }

    const list = [...db.events].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    this.eventsListCache = { events: list, timestamp: Date.now() };
    return list;
  }

  private eventCache = new Map<string, { event: Event; timestamp: number }>();
  private CACHE_TTL_MS = 30000;

  public async getEventById(id: string): Promise<Event | null> {
    const cached = this.eventCache.get(id);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.event;
    }

    if (isLiveSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("id", id)
          .single();

        if (!error && data) {
          const event = data as Event;
          this.eventCache.set(id, { event, timestamp: Date.now() });
          this.eventCache.set(`slug:${event.slug}`, { event, timestamp: Date.now() });
          return event;
        }
      } catch (err) {
        console.error("Supabase getEventById error, falling back to local:", err);
      }
    }

    const event = db.events.find((e) => e.id === id);
    if (event) {
      this.eventCache.set(id, { event, timestamp: Date.now() });
      this.eventCache.set(`slug:${event.slug}`, { event, timestamp: Date.now() });
    }
    return event || null;
  }

  public async getEventBySlug(slug: string): Promise<Event | null> {
    const cached = this.eventCache.get(`slug:${slug}`);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.event;
    }

    if (isLiveSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("events")
          .select("*")
          .eq("slug", slug)
          .single();

        if (!error && data) {
          const event = data as Event;
          this.eventCache.set(event.id, { event, timestamp: Date.now() });
          this.eventCache.set(`slug:${slug}`, { event, timestamp: Date.now() });
          return event;
        }
      } catch (err) {
        console.error("Supabase getEventBySlug error, falling back to local:", err);
      }
    }

    const event = db.events.find((e) => e.slug === slug);
    if (event) {
      this.eventCache.set(event.id, { event, timestamp: Date.now() });
      this.eventCache.set(`slug:${slug}`, { event, timestamp: Date.now() });
    }
    return event || null;
  }


  public async createEvent(input: EventInput, userId?: string): Promise<Event> {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `e0000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
    const settingsId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `s0000000-0000-4000-8000-${Date.now().toString(16).padStart(12, "0")}`;
    const randomPin = `GATE-${Math.floor(1000 + Math.random() * 9000)}`;
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
    this.eventsListCache = null; // Invalidate dashboard cache
    this.eventCache.set(id, { event: newEvent, timestamp: Date.now() });
    this.eventCache.set(`slug:${finalSlug}`, { event: newEvent, timestamp: Date.now() });

    // Initialize default event settings with random gate password
    const newSettings: EventSettings = {
      id: settingsId,
      event_id: id,
      allow_guest_list_public: false,
      notify_host_on_rsvp: true,
      confirmation_email_enabled: true,
      checkin_pin: randomPin,
      staff_email: "admin@craftconf.io",
      close_rsvp_at: null,
      is_rsvp_closed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    db.eventSettings.push(newSettings);

    if (isLiveSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from("events").insert([newEvent]);
        await supabase.from("event_settings").insert([
          {
            id: newSettings.id,
            event_id: newSettings.event_id,
            allow_guest_list_public: newSettings.allow_guest_list_public,
            notify_host_on_rsvp: newSettings.notify_host_on_rsvp,
            confirmation_email_enabled: newSettings.confirmation_email_enabled,
            checkin_pin: newSettings.checkin_pin,
            close_rsvp_at: newSettings.close_rsvp_at,
            is_rsvp_closed: newSettings.is_rsvp_closed,
          },
        ]);
      } catch (err) {
        console.error("Supabase createEvent error:", err);
      }
    }

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
    this.eventsListCache = null;
    this.eventCache.set(id, { event: updated, timestamp: Date.now() });
    this.eventCache.set(`slug:${updated.slug}`, { event: updated, timestamp: Date.now() });

    if (isLiveSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from("events").update(input).eq("id", id);
      } catch (err) {
        console.error("Supabase updateEvent error:", err);
      }
    }

    return updated;
  }

  public async getEventSettings(eventId: string): Promise<EventSettings> {
    if (isLiveSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
          .from("event_settings")
          .select("*")
          .eq("event_id", eventId)
          .single();

        if (!error && data) {
          return {
            ...data,
            checkin_pin: data.checkin_pin || "GATE-4821",
            staff_email: "admin@craftconf.io",
          } as EventSettings;
        }
      } catch (err) {
        console.error("Supabase getEventSettings error:", err);
      }
    }

    let settings = db.eventSettings.find((s) => s.event_id === eventId);
    if (!settings) {
      settings = {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `s${Date.now().toString(36)}`,
        event_id: eventId,
        allow_guest_list_public: false,
        notify_host_on_rsvp: true,
        confirmation_email_enabled: true,
        checkin_pin: "GATE-4821",
        staff_email: "admin@craftconf.io",
        close_rsvp_at: null,
        is_rsvp_closed: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.eventSettings.push(settings);
    } else if (!settings.checkin_pin) {
      settings.checkin_pin = "GATE-4821";
      if (!settings.staff_email) settings.staff_email = "admin@craftconf.io";
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

    if (isLiveSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase
          .from("event_settings")
          .update({
            allow_guest_list_public: updated.allow_guest_list_public,
            notify_host_on_rsvp: updated.notify_host_on_rsvp,
            confirmation_email_enabled: updated.confirmation_email_enabled,
            checkin_pin: updated.checkin_pin,
            close_rsvp_at: updated.close_rsvp_at,
            is_rsvp_closed: updated.is_rsvp_closed,
            updated_at: updated.updated_at,
          })
          .eq("event_id", eventId);
      } catch (err) {
        console.error("Supabase updateEventSettings error:", err);
      }
    }

    return updated;
  }

  public async getEventStats(eventId: string, existingEvent?: Event | null): Promise<EventStats> {
    const event = existingEvent !== undefined ? existingEvent : await this.getEventById(eventId);
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
