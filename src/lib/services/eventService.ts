import { db } from "./dbProvider";
import {
  Event,
  EventSettings,
  EventStats,
  GateCredential,
  StationSectionType,
  EventModule,
  EventModuleKey,
  EventGate,
  EventArea,
  EventSection,
  EventPassType,
  EventFoodCategory,
  EventAccessRule,
  EventStaffAssignment,
} from "@/types/database";
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
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        const { data, error } = isUuid
          ? await supabase.from("events").select("*").eq("id", id).single()
          : await supabase.from("events").select("*").eq("slug", id).limit(1);

        const eventRecord = Array.isArray(data) ? data[0] : data;
        if (!error && eventRecord) {
          const event = eventRecord as Event;
          this.eventCache.set(id, { event, timestamp: Date.now() });
          this.eventCache.set(`slug:${event.slug}`, { event, timestamp: Date.now() });
          return event;
        }
      } catch (err) {
        console.error("Supabase getEventById error, falling back to local:", err);
      }
    }

    const event =
      db.events.find((e) => e.id === id || e.slug === id || e.id.toLowerCase() === id.toLowerCase()) ||
      null;

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
    const id = crypto.randomUUID();
    const settingsId = crypto.randomUUID();
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
      requires_approval: false,
      enable_waitlist: true,
      ticket_tiers_enabled: true,
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
        requires_approval: false,
        enable_waitlist: true,
        ticket_tiers_enabled: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      db.eventSettings.push(settings);
    } else {
      if (!settings.checkin_pin) settings.checkin_pin = "GATE-4821";
      if (!settings.staff_email) settings.staff_email = "admin@craftconf.io";
      if (settings.requires_approval === undefined) settings.requires_approval = false;
      if (settings.enable_waitlist === undefined) settings.enable_waitlist = true;
      if (settings.ticket_tiers_enabled === undefined) settings.ticket_tiers_enabled = true;
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
            requires_approval: updated.requires_approval,
            enable_waitlist: updated.enable_waitlist,
            ticket_tiers_enabled: updated.ticket_tiers_enabled,
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
    const pendingApprovalCount = guests.filter((g) => g.status === "pending_approval").length;
    const waitlistedCount = guests.filter((g) => g.status === "waitlisted").length;

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

    // Tier counts
    const tierCounts: Record<string, number> = {};
    guests.forEach((g) => {
      if (g.tier_name) {
        tierCounts[g.tier_name] = (tierCounts[g.tier_name] || 0) + 1;
      }
    });

    return {
      totalGuests: guests.length,
      invited,
      pending,
      attending: attendingGuests.length,
      declined,
      pendingApprovalCount,
      waitlistedCount,
      totalAttendeesCount,
      checkedInCount,
      checkinPercentage,
      capacityLimit,
      capacityRemaining,
      tierCounts,
    };
  }

  // ====================================================================
  // Ticket Tier Management
  // ====================================================================

  public async getTicketTiers(eventId: string) {
    db.ticketTiers = db.ticketTiers || [];
    let tiers = db.ticketTiers.filter((t) => t.event_id === eventId);
    if (tiers.length === 0) {
      const event = await this.getEventById(eventId);
      const defaults = [
        {
          id: crypto.randomUUID(),
          event_id: eventId,
          name: "General Admission",
          description: "Full access to keynotes, workshops, and afternoon breakouts",
          price: 0,
          capacity: 150,
          badge_color: "sky",
          created_at: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          event_id: eventId,
          name: "VIP All-Access Pass",
          description: "Priority reserved seating, VIP lounge admission & dinner",
          price: 0,
          capacity: 35,
          badge_color: "violet",
          created_at: new Date().toISOString(),
        },
        {
          id: crypto.randomUUID(),
          event_id: eventId,
          name: "Speaker & Panelist",
          description: "Backstage green room access and speaker accreditation",
          price: 0,
          capacity: 20,
          badge_color: "emerald",
          created_at: new Date().toISOString(),
        },
      ];
      db.ticketTiers.push(...defaults);
      tiers = defaults;
    }
    return tiers;
  }

  public async createTicketTier(
    eventId: string,
    input: { name: string; description?: string; capacity: number; badge_color?: string; price?: number }
  ) {
    db.ticketTiers = db.ticketTiers || [];
    const event = await this.getEventById(eventId);
    const newTier = {
      id: crypto.randomUUID(),
      event_id: eventId,
      name: input.name,
      description: input.description || null,
      capacity: input.capacity || 100,
      badge_color: input.badge_color || "sky",
      price: input.price || 0,
      created_at: new Date().toISOString(),
    };
    db.ticketTiers.push(newTier);
    return newTier;
  }

  public async deleteTicketTier(eventId: string, tierId: string) {
    db.ticketTiers = db.ticketTiers || [];
    const idx = db.ticketTiers.findIndex((t) => t.event_id === eventId && t.id === tierId);
    if (idx === -1) return false;
    db.ticketTiers.splice(idx, 1);
    return true;
  }

  // ====================================================================
  // Gate Stations & Multi-Staff Credential Management
  // ====================================================================

  public async getGateCredentials(eventId: string): Promise<(GateCredential & { checkinCount: number })[]> {
    db.gateCredentials = db.gateCredentials || [];
    db.checkins = db.checkins || [];
    let creds = db.gateCredentials.filter(
      (c) => c.event_id === eventId || c.event_id.toLowerCase() === eventId.toLowerCase()
    );

    // Auto-seed default credentials if none configured yet
    if (creds.length === 0) {
      const defaults: GateCredential[] = [
        {
          id: crypto.randomUUID(),
          event_id: eventId,
          user_id: "GATE-01",
          station_name: "Main Entrance Gate",
          section_type: "gate",
          passcode: "GATE-4821",
          is_active: true,
          created_at: new Date().toISOString(),
          last_login_at: null,
          login_count: 0,
          notes: "Primary Entrance Checkpoint",
        },
        {
          id: crypto.randomUUID(),
          event_id: eventId,
          user_id: "FOOD-01",
          station_name: "Food & Catering Hall",
          section_type: "food",
          passcode: "FOOD-2026",
          is_active: true,
          created_at: new Date().toISOString(),
          last_login_at: null,
          login_count: 0,
          notes: "Lunch & Refreshments Counter",
        },
        {
          id: crypto.randomUUID(),
          event_id: eventId,
          user_id: "VIP-01",
          station_name: "VIP Hacker Lounge",
          section_type: "vip_lounge",
          passcode: "VIP-2026",
          is_active: true,
          created_at: new Date().toISOString(),
          last_login_at: null,
          login_count: 0,
          notes: "VIP Area Reception",
        },
      ];
      db.gateCredentials.push(...defaults);
      creds = defaults;
    }

    const checkins = db.checkins.filter(
      (c) => c.event_id === eventId || c.event_id.toLowerCase() === eventId.toLowerCase()
    );

    return creds.map((cred) => {
      const count = checkins.filter(
        (c) => c.gate_user_id === cred.user_id || c.checked_in_by === cred.user_id
      ).length;
      return {
        ...cred,
        checkinCount: count,
      };
    });
  }

  public async createGateCredential(
    eventId: string,
    input: { user_id?: string; station_name?: string; section_type?: StationSectionType; passcode?: string; notes?: string }
  ): Promise<GateCredential> {
    const defaultUserId = `STAFF-${Math.floor(10 + Math.random() * 90)}`;
    const userId = (input.user_id || defaultUserId).trim().toUpperCase();
    const stationName = (input.station_name || "Main Entrance Gate").trim();
    const passcode = (input.passcode || `PASS-${Math.floor(1000 + Math.random() * 9000)}`).trim();

    // Determine section type
    let sectionType: StationSectionType = input.section_type || "gate";
    if (!input.section_type) {
      const lower = stationName.toLowerCase();
      if (lower.includes("food") || lower.includes("banquet") || lower.includes("cater") || lower.includes("dining")) {
        sectionType = "food";
      } else if (lower.includes("vip") || lower.includes("lounge")) {
        sectionType = "vip_lounge";
      } else if (lower.includes("breakout") || lower.includes("lab") || lower.includes("workshop")) {
        sectionType = "breakout";
      }
    }

    const newCred: GateCredential = {
      id: `${userId}-GC`,
      event_id: eventId,
      user_id: userId,
      station_name: stationName,
      section_type: sectionType,
      passcode,
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: null,
      login_count: 0,
      notes: input.notes?.trim() || null,
    };

    db.gateCredentials = db.gateCredentials || [];
    db.gateCredentials.unshift(newCred);
    return newCred;
  }

  public async deleteGateCredential(eventId: string, credId: string): Promise<boolean> {
    db.gateCredentials = db.gateCredentials || [];
    const index = db.gateCredentials.findIndex((c) => c.event_id === eventId && c.id === credId);
    if (index === -1) return false;
    db.gateCredentials.splice(index, 1);
    return true;
  }

  public async toggleGateCredential(
    eventId: string,
    credId: string,
    isActive: boolean
  ): Promise<GateCredential | null> {
    db.gateCredentials = db.gateCredentials || [];
    const cred = db.gateCredentials.find((c) => c.event_id === eventId && c.id === credId);
    if (!cred) return null;
    cred.is_active = isActive;
    return cred;
  }

  public async authenticateGate(
    eventId: string,
    userId: string,
    passcode: string
  ): Promise<{ success: boolean; credential?: GateCredential; eventTitle: string; error?: string }> {
    // Ensure default credentials exist
    await this.getGateCredentials(eventId);
    const event = await this.getEventById(eventId);
    if (!event) {
      return { success: false, eventTitle: "", error: "Event not found" };
    }

    const normUser = userId ? userId.trim().toLowerCase() : "";
    const normPass = passcode ? passcode.trim().toLowerCase() : "";

    if (!normPass) {
      return { success: false, eventTitle: event.title, error: "Passcode is required." };
    }

    const settings = await this.getEventSettings(eventId);
    const masterPin = (settings.checkin_pin || "GATE-4821").toLowerCase().trim();

    // 1. First Priority: Check exact match against configured gate credentials
    const cred = db.gateCredentials.find(
      (c) =>
        (c.event_id === eventId || c.event_id.toLowerCase() === eventId.toLowerCase()) &&
        (c.user_id.toLowerCase() === normUser || c.station_name.toLowerCase() === normUser || (normUser.includes("gate") && c.user_id.toLowerCase() === "gate-01") || (normUser.includes("food") && c.user_id.toLowerCase() === "food-01") || (normUser.includes("vip") && c.user_id.toLowerCase() === "vip-01")) &&
        c.passcode.toLowerCase() === normPass
    );

    if (cred) {
      if (!cred.is_active) {
        return { success: false, eventTitle: event.title, error: "This gate credential has been deactivated by the host." };
      }
      cred.last_login_at = new Date().toISOString();
      cred.login_count = (cred.login_count || 0) + 1;
      return { success: true, credential: cred, eventTitle: event.title };
    }

    // 2. Check match by passcode alone across configured station credentials for this event
    const credByPassOnly = db.gateCredentials.find(
      (c) =>
        (c.event_id === eventId || c.event_id.toLowerCase() === eventId.toLowerCase()) &&
        c.is_active &&
        c.passcode.toLowerCase() === normPass
    );

    if (credByPassOnly) {
      credByPassOnly.last_login_at = new Date().toISOString();
      credByPassOnly.login_count = (credByPassOnly.login_count || 0) + 1;
      return { success: true, credential: credByPassOnly, eventTitle: event.title };
    }

    // 3. Check staff assignments (manager & employee roles)
    db.eventStaffAssignments = db.eventStaffAssignments || [];
    const staffAssignment = db.eventStaffAssignments.find(
      (s) =>
        (s.event_id === eventId || s.event_id.toLowerCase() === eventId.toLowerCase()) &&
        s.is_active &&
        s.passcode.toLowerCase() === normPass &&
        (!normUser || s.staff_user_id.toLowerCase() === normUser)
    );

    if (staffAssignment) {
      const staffCred: GateCredential = {
        id: staffAssignment.id,
        event_id: eventId,
        user_id: staffAssignment.staff_user_id,
        station_name: "Staff Checkpoint",
        section_type: "gate",
        passcode: staffAssignment.passcode,
        is_active: true,
        created_at: staffAssignment.created_at || new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        login_count: 1,
        notes: `Assigned Role: ${staffAssignment.role_type}`,
      };
      return { success: true, credential: staffCred, eventTitle: event.title };
    }

    // 4. Master Event PIN / Gate Password fallback
    // If the entered passcode matches the event's master checkin_pin, ALWAYS authorize!
    if (normPass === masterPin) {
      const fallbackCred: GateCredential = {
        id: `gc_master_${eventId}`,
        event_id: eventId,
        user_id: userId ? userId.trim().toUpperCase() : "GATE-STAFF",
        station_name: "Main Entrance Gate",
        section_type: "gate",
        passcode: settings.checkin_pin || "GATE-4821",
        is_active: true,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        login_count: 1,
        notes: "Master Event PIN access",
      };
      return { success: true, credential: fallbackCred, eventTitle: event.title };
    }

    return {
      success: false,
      eventTitle: event.title,
      error: "Invalid Gate User ID or Password. Please check with your event host.",
    };
  }

  public async getEventByGateAccessKey(accessKey: string): Promise<Event | null> {
    const cleanKey = accessKey.trim();
    // 1. Check settings gate_access_key
    const settings = db.eventSettings.find((s) => s.gate_access_key === cleanKey);
    if (settings) {
      return this.getEventById(settings.event_id);
    }
    // 2. Fallback to direct event ID or slug match
    return (await this.getEventById(cleanKey)) || (await this.getEventBySlug(cleanKey));
  }

  // ====================================================================
  // Configurable Event Modules
  // ====================================================================
  public async getEventModules(eventId: string): Promise<EventModule[]> {
    db.eventModules = db.eventModules || [];
    let modules = db.eventModules.filter(
      (m) => m.event_id === eventId || m.event_id.toLowerCase() === eventId.toLowerCase()
    );
    if (modules.length === 0) {
      // Default initial modules for existing events
      const defaultKeys: EventModuleKey[] = [
        "rsvp",
        "guest_management",
        "qr_entry",
        "gates",
        "areas",
        "food",
        "passes",
        "analytics",
      ];
      modules = defaultKeys.map((key) => ({
        id: `MOD-${eventId.slice(0, 6)}-${key}`,
        event_id: eventId,
        module_key: key,
        is_enabled: true,
      }));
      db.eventModules.push(...modules);
    }
    return modules;
  }

  public async updateEventModules(
    eventId: string,
    updates: { module_key: EventModuleKey; is_enabled: boolean; config?: Record<string, any> }[]
  ): Promise<EventModule[]> {
    db.eventModules = db.eventModules || [];
    for (const update of updates) {
      let mod = db.eventModules.find(
        (m) =>
          (m.event_id === eventId || m.event_id.toLowerCase() === eventId.toLowerCase()) &&
          m.module_key === update.module_key
      );
      if (mod) {
        mod.is_enabled = update.is_enabled;
        if (update.config) mod.config = update.config;
      } else {
        mod = {
          id: `MOD-${eventId.slice(0, 6)}-${update.module_key}`,
          event_id: eventId,
          module_key: update.module_key,
          is_enabled: update.is_enabled,
          config: update.config,
        };
        db.eventModules.push(mod);
      }
    }
    return this.getEventModules(eventId);
  }

  // ====================================================================
  // Configurable Gates
  // ====================================================================
  public async getEventGates(eventId: string): Promise<EventGate[]> {
    db.eventGates = db.eventGates || [];
    let gates = db.eventGates.filter(
      (g) => g.event_id === eventId || g.event_id.toLowerCase() === eventId.toLowerCase()
    );
    if (gates.length === 0) {
      const defaults: EventGate[] = [
        {
          id: `GATE-${eventId.slice(0, 6)}-01`,
          event_id: eventId,
          name: "Main Entrance Gate",
          gate_type: "bidirectional",
          code: "GATE-N1",
          description: "Primary attendee entrance and badge scanning checkpoint",
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: `GATE-${eventId.slice(0, 6)}-02`,
          event_id: eventId,
          name: "VIP Red Carpet Gate",
          gate_type: "bidirectional",
          code: "GATE-VIP",
          description: "Expedited fast-track lane for VIP and speaker badge holders",
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];
      db.eventGates.push(...defaults);
      gates = defaults;
    }
    return gates;
  }

  public async createEventGate(eventId: string, input: Partial<EventGate>): Promise<EventGate> {
    db.eventGates = db.eventGates || [];
    const newGate: EventGate = {
      id: crypto.randomUUID(),
      event_id: eventId,
      name: input.name || "Main Gate Entrance",
      gate_type: input.gate_type || "bidirectional",
      code: input.code || `GATE-${Math.floor(1 + Math.random() * 9)}`,
      description: input.description || null,
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_at: new Date().toISOString(),
    };
    db.eventGates.push(newGate);
    return newGate;
  }

  public async deleteEventGate(eventId: string, gateId: string): Promise<boolean> {
    db.eventGates = db.eventGates || [];
    const idx = db.eventGates.findIndex(
      (g) => (g.event_id === eventId || g.event_id.toLowerCase() === eventId.toLowerCase()) && g.id === gateId
    );
    if (idx === -1) return false;
    db.eventGates.splice(idx, 1);
    return true;
  }

  // ====================================================================
  // Configurable Areas & Sections
  // ====================================================================
  public async getEventAreas(eventId: string): Promise<EventArea[]> {
    db.eventAreas = db.eventAreas || [];
    let areas = db.eventAreas.filter(
      (a) => a.event_id === eventId || a.event_id.toLowerCase() === eventId.toLowerCase()
    );
    if (areas.length === 0) {
      const defaults: EventArea[] = [
        {
          id: `AREA-${eventId.slice(0, 6)}-01`,
          event_id: eventId,
          name: "General Floor",
          area_type: "general",
          capacity: 250,
          current_occupancy: 0,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: `AREA-${eventId.slice(0, 6)}-02`,
          event_id: eventId,
          name: "VVIP Royal Lounge",
          area_type: "vip",
          capacity: 50,
          current_occupancy: 0,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];
      db.eventAreas.push(...defaults);
      areas = defaults;
    }
    return areas;
  }

  public async createEventArea(eventId: string, input: Partial<EventArea>): Promise<EventArea> {
    db.eventAreas = db.eventAreas || [];
    const newArea: EventArea = {
      id: crypto.randomUUID(),
      event_id: eventId,
      name: input.name || "General Hall",
      area_type: input.area_type || "general",
      capacity: input.capacity || 100,
      current_occupancy: 0,
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_at: new Date().toISOString(),
    };
    db.eventAreas.push(newArea);
    return newArea;
  }

  public async deleteEventArea(eventId: string, areaId: string): Promise<boolean> {
    db.eventAreas = db.eventAreas || [];
    const idx = db.eventAreas.findIndex(
      (a) => (a.event_id === eventId || a.event_id.toLowerCase() === eventId.toLowerCase()) && a.id === areaId
    );
    if (idx === -1) return false;
    db.eventAreas.splice(idx, 1);
    return true;
  }

  public async getEventSections(eventId: string): Promise<EventSection[]> {
    db.eventSections = db.eventSections || [];
    return db.eventSections.filter(
      (s) => s.event_id === eventId || s.event_id.toLowerCase() === eventId.toLowerCase()
    );
  }

  public async createEventSection(eventId: string, input: Partial<EventSection>): Promise<EventSection> {
    db.eventSections = db.eventSections || [];
    const newSection: EventSection = {
      id: `SEC-${Date.now().toString(36)}-${Math.floor(10 + Math.random() * 90)}`,
      event_id: eventId,
      area_id: input.area_id || null,
      name: input.name || "Section A",
      capacity: input.capacity || 50,
      created_at: new Date().toISOString(),
    };
    db.eventSections.push(newSection);
    return newSection;
  }

  // ====================================================================
  // Configurable Pass Types
  // ====================================================================
  public async getEventPassTypes(eventId: string): Promise<EventPassType[]> {
    db.eventPassTypes = db.eventPassTypes || [];
    let passes = db.eventPassTypes.filter(
      (p) => p.event_id === eventId || p.event_id.toLowerCase() === eventId.toLowerCase()
    );
    if (passes.length === 0) {
      // Map from existing ticket tiers
      const tiers = await this.getTicketTiers(eventId);
      passes = tiers.map((t) => ({
        id: t.id,
        event_id: eventId,
        name: t.name,
        code: t.name.slice(0, 3).toUpperCase(),
        description: t.description,
        price: t.price || 0,
        quota: t.capacity,
        issued_count: 0,
        badge_color: t.badge_color || "sky",
        is_active: true,
      }));
      db.eventPassTypes.push(...passes);
    }
    return passes;
  }

  public async createEventPassType(eventId: string, input: Partial<EventPassType>): Promise<EventPassType> {
    db.eventPassTypes = db.eventPassTypes || [];
    const newPass: EventPassType = {
      id: crypto.randomUUID(),
      event_id: eventId,
      name: input.name || "General Pass",
      code: input.code || input.name?.slice(0, 3).toUpperCase() || "GA",
      description: input.description || null,
      price: Number(input.price || 0),
      quota: input.quota || 100,
      issued_count: 0,
      badge_color: input.badge_color || "sky",
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_at: new Date().toISOString(),
    };
    db.eventPassTypes.push(newPass);
    return newPass;
  }

  // ====================================================================
  // Configurable Food Categories
  // ====================================================================
  public async getEventFoodCategories(eventId: string): Promise<EventFoodCategory[]> {
    db.eventFoodCategories = db.eventFoodCategories || [];
    let food = db.eventFoodCategories.filter(
      (f) => f.event_id === eventId || f.event_id.toLowerCase() === eventId.toLowerCase()
    );
    if (food.length === 0) {
      const defaults: EventFoodCategory[] = [
        {
          id: `FOOD-${eventId.slice(0, 6)}-01`,
          event_id: eventId,
          name: "Standard Meal Voucher",
          dietary_info: "Veg / Non-Veg Standard Platter",
          total_quota: 250,
          redeemed_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
        },
        {
          id: `FOOD-${eventId.slice(0, 6)}-02`,
          event_id: eventId,
          name: "Executive Lunch Buffet",
          dietary_info: "Premium Gourmet Buffet & Beverages",
          total_quota: 80,
          redeemed_count: 0,
          is_active: true,
          created_at: new Date().toISOString(),
        },
      ];
      db.eventFoodCategories.push(...defaults);
      food = defaults;
    }
    return food;
  }

  public async createEventFoodCategory(eventId: string, input: Partial<EventFoodCategory>): Promise<EventFoodCategory> {
    db.eventFoodCategories = db.eventFoodCategories || [];
    const newFood: EventFoodCategory = {
      id: `FOOD-${Date.now().toString(36)}-${Math.floor(10 + Math.random() * 90)}`,
      event_id: eventId,
      name: input.name || "Standard Meal Voucher",
      dietary_info: input.dietary_info || "Veg / Non-Veg",
      total_quota: input.total_quota || 100,
      redeemed_count: 0,
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_at: new Date().toISOString(),
    };
    db.eventFoodCategories.push(newFood);
    return newFood;
  }

  // ====================================================================
  // Configurable Access Rules
  // ====================================================================
  public async getEventAccessRules(eventId: string): Promise<EventAccessRule[]> {
    db.eventAccessRules = db.eventAccessRules || [];
    return db.eventAccessRules.filter(
      (r) => r.event_id === eventId || r.event_id.toLowerCase() === eventId.toLowerCase()
    );
  }

  public async saveEventAccessRules(eventId: string, rules: EventAccessRule[]): Promise<EventAccessRule[]> {
    db.eventAccessRules = db.eventAccessRules || [];
    // Remove existing for this event
    db.eventAccessRules = db.eventAccessRules.filter(
      (r) => r.event_id !== eventId && r.event_id.toLowerCase() !== eventId.toLowerCase()
    );
    // Add fresh rules
    db.eventAccessRules.push(...rules);
    return rules;
  }

  // ====================================================================
  // Configurable Staff Assignments (Managers & Employees)
  // ====================================================================
  public async getEventStaff(eventId: string): Promise<EventStaffAssignment[]> {
    db.eventStaffAssignments = db.eventStaffAssignments || [];
    return db.eventStaffAssignments.filter(
      (s) => s.event_id === eventId || s.event_id.toLowerCase() === eventId.toLowerCase()
    );
  }

  public async assignEventStaff(eventId: string, input: Partial<EventStaffAssignment>): Promise<EventStaffAssignment> {
    db.eventStaffAssignments = db.eventStaffAssignments || [];
    const event = await this.getEventById(eventId);
    const prefix = input.role_type === "manager" ? "MGR" : "STAFF";
    const defaultStaffId = `${prefix}-${Math.floor(10 + Math.random() * 90)}`;
    const assignment: EventStaffAssignment = {
      id: crypto.randomUUID(),
      event_id: eventId,
      user_id: input.user_id || null,
      staff_user_id: (input.staff_user_id || defaultStaffId).trim().toUpperCase(),
      role_type: input.role_type || "employee",
      assigned_gate_id: input.assigned_gate_id || null,
      assigned_area_id: input.assigned_area_id || null,
      assigned_food_id: input.assigned_food_id || null,
      can_checkin: input.can_checkin !== undefined ? input.can_checkin : true,
      can_checkout: input.can_checkout !== undefined ? input.can_checkout : true,
      can_manage_food: input.can_manage_food !== undefined ? input.can_manage_food : true,
      can_add_guests: input.can_add_guests !== undefined ? input.can_add_guests : false,
      can_block_guests: input.can_block_guests !== undefined ? input.can_block_guests : false,
      passcode: input.passcode || `PIN-${Math.floor(1000 + Math.random() * 9000)}`,
      is_active: input.is_active !== undefined ? input.is_active : true,
      created_at: new Date().toISOString(),
    };
    db.eventStaffAssignments.push(assignment);
    return assignment;
  }

  public async deleteEventStaff(eventId: string, staffId: string): Promise<boolean> {
    db.eventStaffAssignments = db.eventStaffAssignments || [];
    const idx = db.eventStaffAssignments.findIndex(
      (s) => (s.event_id === eventId || s.event_id.toLowerCase() === eventId.toLowerCase()) && s.id === staffId
    );
    if (idx === -1) return false;
    db.eventStaffAssignments.splice(idx, 1);
    return true;
  }

  /**
   * Unified Config Bundle: Returns all modules, gates, areas, passes, food, and rules
   */
  public async getEventFullConfig(eventId: string) {
    const [modules, gates, areas, sections, passTypes, foodCategories, accessRules, staff] = await Promise.all([
      this.getEventModules(eventId),
      this.getEventGates(eventId),
      this.getEventAreas(eventId),
      this.getEventSections(eventId),
      this.getEventPassTypes(eventId),
      this.getEventFoodCategories(eventId),
      this.getEventAccessRules(eventId),
      this.getEventStaff(eventId),
    ]);

    return {
      modules,
      gates,
      areas,
      sections,
      passTypes,
      foodCategories,
      accessRules,
      staff,
    };
  }
}

export const eventService = new EventService();
