import {
  Event,
  EventSettings,
  Guest,
  RsvpQuestion,
  RsvpQuestionOption,
  RsvpResponse,
  RsvpAnswer,
  Ticket,
  Checkin,
  NotificationLog,
  Profile,
} from "@/types/database";

// In-Memory Database store for resilient local development & fallback
class InMemoryDB {
  public profiles: Profile[] = [
    {
      id: "a0000000-0000-0000-0000-000000000001",
      email: "organizer@craftconf.io",
      full_name: "Alex Rivera",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public events: Event[] = [
    {
      id: "e0000000-0000-0000-0000-000000000001",
      created_by: "a0000000-0000-0000-0000-000000000001",
      title: "Craft & Code Summit 2026",
      slug: "craft-and-code-summit-2026",
      description:
        "An intimate gathering of visionary founders, designers, and software craftspeople. Join us for keynote discussions, hands-on architectural breakouts, and an evening networking reception under the glass atrium.",
      cover_image_url:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80",
      start_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
      end_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000 + 6 * 60 * 60 * 1000).toISOString(),
      timezone: "America/San_Francisco",
      location_name: "The Foundry Atrium & Loft",
      location_address: "450 Mission Street, Suite 800, San Francisco, CA 94105",
      is_published: true,
      max_capacity: 150,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public eventSettings: EventSettings[] = [
    {
      id: "20000000-0000-0000-0000-000000000001",
      event_id: "e0000000-0000-0000-0000-000000000001",
      allow_guest_list_public: false,
      notify_host_on_rsvp: true,
      confirmation_email_enabled: true,
      checkin_pin: "7492",
      close_rsvp_at: new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString(),
      is_rsvp_closed: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public questions: (RsvpQuestion & { options?: RsvpQuestionOption[] })[] = [
    {
      id: "30000000-0000-0000-0000-000000000001",
      event_id: "e0000000-0000-0000-0000-000000000001",
      prompt: "Do you have any dietary restrictions?",
      question_type: "single_choice",
      is_required: true,
      order_index: 1,
      created_at: new Date().toISOString(),
      options: [
        {
          id: "40000000-0000-0000-0000-000000000001",
          question_id: "30000000-0000-0000-0000-000000000001",
          label: "Standard / Omnivore",
          value: "standard",
          order_index: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: "40000000-0000-0000-0000-000000000002",
          question_id: "30000000-0000-0000-0000-000000000001",
          label: "Vegetarian",
          value: "vegetarian",
          order_index: 2,
          created_at: new Date().toISOString(),
        },
        {
          id: "40000000-0000-0000-0000-000000000003",
          question_id: "30000000-0000-0000-0000-000000000001",
          label: "Vegan",
          value: "vegan",
          order_index: 3,
          created_at: new Date().toISOString(),
        },
        {
          id: "40000000-0000-0000-0000-000000000004",
          question_id: "30000000-0000-0000-0000-000000000001",
          label: "Gluten-Free",
          value: "gluten_free",
          order_index: 4,
          created_at: new Date().toISOString(),
        },
      ],
    },
    {
      id: "30000000-0000-0000-0000-000000000002",
      event_id: "e0000000-0000-0000-0000-000000000001",
      prompt: "What organization or company are you representing?",
      question_type: "text",
      is_required: false,
      order_index: 2,
      created_at: new Date().toISOString(),
      options: [],
    },
    {
      id: "30000000-0000-0000-0000-000000000003",
      event_id: "e0000000-0000-0000-0000-000000000001",
      prompt: "Which breakout tracks do you plan to join?",
      question_type: "multiple_choice",
      is_required: false,
      order_index: 3,
      created_at: new Date().toISOString(),
      options: [
        {
          id: "40000000-0000-0000-0000-000000000005",
          question_id: "30000000-0000-0000-0000-000000000003",
          label: "High-Performance Web Architecture",
          value: "arch",
          order_index: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: "40000000-0000-0000-0000-000000000006",
          question_id: "30000000-0000-0000-0000-000000000003",
          label: "Design Systems & Micro-Interactions",
          value: "design",
          order_index: 2,
          created_at: new Date().toISOString(),
        },
        {
          id: "40000000-0000-0000-0000-000000000007",
          question_id: "30000000-0000-0000-0000-000000000003",
          label: "AI-Augmented Engineering Workflows",
          value: "ai_eng",
          order_index: 3,
          created_at: new Date().toISOString(),
        },
      ],
    },
  ];

  public guests: Guest[] = [
    {
      id: "50000000-0000-0000-0000-000000000001",
      event_id: "e0000000-0000-0000-0000-000000000001",
      first_name: "Sophia",
      last_name: "Chen",
      email: "sophia.chen@example.com",
      phone: "+1 (415) 555-0192",
      status: "attending",
      plus_ones_allowed: 1,
      plus_ones_count: 1,
      qr_token: "TOKEN-SC-78912",
      notes: "Keynote speaker panelist",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "50000000-0000-0000-0000-000000000002",
      event_id: "e0000000-0000-0000-0000-000000000001",
      first_name: "Marcus",
      last_name: "Vance",
      email: "marcus.vance@example.com",
      phone: "+1 (415) 555-0843",
      status: "attending",
      plus_ones_allowed: 0,
      plus_ones_count: 0,
      qr_token: "TOKEN-MV-33421",
      notes: null,
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
    {
      id: "50000000-0000-0000-0000-000000000003",
      event_id: "e0000000-0000-0000-0000-000000000001",
      first_name: "Elena",
      last_name: "Rostova",
      email: "elena.rostova@example.com",
      phone: "+1 (650) 555-0144",
      status: "pending",
      plus_ones_allowed: 0,
      plus_ones_count: 0,
      qr_token: "TOKEN-ER-91823",
      notes: null,
      created_at: new Date(Date.now() - 3600000 * 6).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 6).toISOString(),
    },
    {
      id: "50000000-0000-0000-0000-000000000004",
      event_id: "e0000000-0000-0000-0000-000000000001",
      first_name: "David",
      last_name: "Kim",
      email: "david.kim@example.com",
      phone: "+1 (408) 555-0167",
      status: "declined",
      plus_ones_allowed: 0,
      plus_ones_count: 0,
      qr_token: "TOKEN-DK-55612",
      notes: "Traveling abroad during summit dates",
      created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    },
    {
      id: "50000000-0000-0000-0000-000000000005",
      event_id: "e0000000-0000-0000-0000-000000000001",
      first_name: "Olivia",
      last_name: "Sterling",
      email: "olivia.sterling@example.com",
      phone: "+1 (212) 555-0988",
      status: "invited",
      plus_ones_allowed: 1,
      plus_ones_count: 0,
      qr_token: "TOKEN-OS-66782",
      notes: null,
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      updated_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
  ];

  public tickets: Ticket[] = [
    {
      id: "60000000-0000-0000-0000-000000000001",
      event_id: "e0000000-0000-0000-0000-000000000001",
      guest_id: "50000000-0000-0000-0000-000000000001",
      ticket_code: "TK-SC-78912",
      qr_code_data: "RSVP:e0000000-0000-0000-0000-000000000001:TOKEN-SC-78912",
      status: "used",
      issued_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
    {
      id: "60000000-0000-0000-0000-000000000002",
      event_id: "e0000000-0000-0000-0000-000000000001",
      guest_id: "50000000-0000-0000-0000-000000000002",
      ticket_code: "TK-MV-33421",
      qr_code_data: "RSVP:e0000000-0000-0000-0000-000000000001:TOKEN-MV-33421",
      status: "valid",
      issued_at: new Date(Date.now() - 3600000 * 12).toISOString(),
      created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    },
  ];

  public checkins: Checkin[] = [
    {
      id: "70000000-0000-0000-0000-000000000001",
      event_id: "e0000000-0000-0000-0000-000000000001",
      ticket_id: "60000000-0000-0000-0000-000000000001",
      guest_id: "50000000-0000-0000-0000-000000000001",
      checked_in_by: "a0000000-0000-0000-0000-000000000001",
      checkin_time: new Date(Date.now() - 15 * 60000).toISOString(),
      checkin_method: "qr_scan",
      created_at: new Date(Date.now() - 15 * 60000).toISOString(),
    },
  ];

  public responses: RsvpResponse[] = [
    {
      id: "80000000-0000-0000-0000-000000000001",
      event_id: "e0000000-0000-0000-0000-000000000001",
      guest_id: "50000000-0000-0000-0000-000000000001",
      status: "attending",
      attending_count: 2,
      submitted_at: new Date(Date.now() - 3600000 * 24).toISOString(),
      notes: "Looking forward to speaking!",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  public answers: RsvpAnswer[] = [
    {
      id: "90000000-0000-0000-0000-000000000001",
      response_id: "80000000-0000-0000-0000-000000000001",
      question_id: "30000000-0000-0000-0000-000000000001",
      answer_text: "vegetarian",
      answer_json: null,
      created_at: new Date().toISOString(),
    },
    {
      id: "90000000-0000-0000-0000-000000000002",
      response_id: "80000000-0000-0000-0000-000000000001",
      question_id: "30000000-0000-0000-0000-000000000002",
      answer_text: "Acme Design Lab",
      answer_json: null,
      created_at: new Date().toISOString(),
    },
  ];

  public notificationLogs: NotificationLog[] = [];
}

// Global singleton for in-memory fallback
const globalForDb = globalThis as unknown as { inMemoryDb?: InMemoryDB };
export const db = globalForDb.inMemoryDb || new InMemoryDB();
if (process.env.NODE_ENV !== "production") globalForDb.inMemoryDb = db;
