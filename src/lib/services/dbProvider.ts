import {
  Event,
  EventSettings,
  GateCredential,
  Guest,
  RsvpQuestion,
  RsvpQuestionOption,
  RsvpResponse,
  RsvpAnswer,
  Ticket,
  Checkin,
  NotificationLog,
  Profile,
  TicketTier,
  EventModule,
  EventGate,
  EventArea,
  EventSection,
  EventPassType,
  EventFoodCategory,
  EventAccessRule,
  EventStaffAssignment,
  GuestFoodEntitlement,
  ScanLog,
  PaymentOrder,
  PaymentTransaction,
  PayoutRequest,
  AuditLog,
} from "@/types/database";

// In-Memory Database store for resilient local development & fallback
class InMemoryDB {
  public profiles: Profile[] = [
    {
      id: "GBH-dec-2026-HOST-01",
      email: "chandan2004.n@gmail.com",
      full_name: "Chandan N",
      role: "admin",
      avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "USER-CLIENT-01",
      email: "client@buildhackathon.io",
      full_name: "Sarah Jenkins",
      role: "client",
      avatar_url: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=256&q=80",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "USER-MANAGER-01",
      email: "manager@operations.io",
      full_name: "Alex Rivera",
      role: "manager",
      avatar_url: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=256&q=80",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "USER-STAFF-01",
      email: "staff@operations.io",
      full_name: "Devon Marcus",
      role: "employee",
      avatar_url: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=256&q=80",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public events: Event[] = [
    {
      id: "GBH-dec-2026-001",
      created_by: "GBH-dec-2026-HOST-01",
      client_id: "GBH-dec-2026-HOST-01",
      title: "Google Build Hackathon 2026",
      slug: "google-build-hackathon-2026",
      description:
        "A high-intensity 48-hour builder hackathon for developers, researchers, and AI pioneers. Keynote sessions, hardware breakout labs, and an exclusive demo-day pitch session with venture leaders.",
      cover_image_url:
        "https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80",
      start_date: "2026-12-10T09:00:00.000Z",
      end_date: "2026-12-12T18:00:00.000Z",
      timezone: "America/Los_Angeles",
      location_name: "Google Community Space & Tech Dome",
      location_address: "188 Embarcadero, San Francisco, CA 94105",
      is_published: true,
      status: "published",
      max_capacity: 150,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "GAS-oct-2026-001",
      created_by: "GBH-dec-2026-HOST-01",
      client_id: "USER-CLIENT-01",
      title: "Global AI Summit 2026",
      slug: "global-ai-summit-2026",
      description:
        "The premier global gathering on generative AI, autonomous agent systems, and enterprise deployment strategies.",
      cover_image_url:
        "https://images.unsplash.com/photo-1505373877841-8d25f7d46678?auto=format&fit=crop&w=1600&q=80",
      start_date: "2026-10-15T09:00:00.000Z",
      end_date: "2026-10-17T17:00:00.000Z",
      timezone: "America/San_Francisco",
      location_name: "Moscone Center West",
      location_address: "747 Howard St, San Francisco, CA 94103",
      is_published: true,
      status: "published",
      max_capacity: 350,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Configurable Relational Modules
  // ------------------------------------------------------------------
  public eventModules: EventModule[] = [
    // Google Build Hackathon (Comprehensive modules enabled)
    { id: "MOD-GBH-1", event_id: "GBH-dec-2026-001", module_key: "rsvp", is_enabled: true },
    { id: "MOD-GBH-2", event_id: "GBH-dec-2026-001", module_key: "guest_management", is_enabled: true },
    { id: "MOD-GBH-3", event_id: "GBH-dec-2026-001", module_key: "qr_entry", is_enabled: true },
    { id: "MOD-GBH-4", event_id: "GBH-dec-2026-001", module_key: "gates", is_enabled: true },
    { id: "MOD-GBH-5", event_id: "GBH-dec-2026-001", module_key: "areas", is_enabled: true },
    { id: "MOD-GBH-6", event_id: "GBH-dec-2026-001", module_key: "sections", is_enabled: true },
    { id: "MOD-GBH-7", event_id: "GBH-dec-2026-001", module_key: "food", is_enabled: true },
    { id: "MOD-GBH-8", event_id: "GBH-dec-2026-001", module_key: "passes", is_enabled: true },
    { id: "MOD-GBH-9", event_id: "GBH-dec-2026-001", module_key: "paid_entry", is_enabled: true },
    { id: "MOD-GBH-10", event_id: "GBH-dec-2026-001", module_key: "analytics", is_enabled: true },
    // Global AI Summit (Simple meetup - NO Food, NO VIP areas, Demonstrating dynamic adaptivity!)
    { id: "MOD-GAS-1", event_id: "GAS-oct-2026-001", module_key: "rsvp", is_enabled: true },
    { id: "MOD-GAS-2", event_id: "GAS-oct-2026-001", module_key: "guest_management", is_enabled: true },
    { id: "MOD-GAS-3", event_id: "GAS-oct-2026-001", module_key: "qr_entry", is_enabled: true },
    { id: "MOD-GAS-4", event_id: "GAS-oct-2026-001", module_key: "gates", is_enabled: true },
    { id: "MOD-GAS-5", event_id: "GAS-oct-2026-001", module_key: "analytics", is_enabled: true },
  ];

  // ------------------------------------------------------------------
  // Configurable Gates
  // ------------------------------------------------------------------
  public eventGates: EventGate[] = [
    {
      id: "GATE-GBH-MAIN",
      event_id: "GBH-dec-2026-001",
      name: "Main Entrance Gate",
      gate_type: "bidirectional",
      code: "GATE-01",
      description: "Primary turnstiles on Embarcadero",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "GATE-GBH-VIP",
      event_id: "GBH-dec-2026-001",
      name: "VIP North Gate",
      gate_type: "entry",
      code: "VIP-GATE-01",
      description: "Priority entrance for VIP and Mentors",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "GATE-GBH-EXIT",
      event_id: "GBH-dec-2026-001",
      name: "East Exit Only",
      gate_type: "exit",
      code: "EXIT-01",
      description: "Check-out turnstile",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "GATE-GAS-NORTH",
      event_id: "GAS-oct-2026-001",
      name: "Summit Primary Door",
      gate_type: "bidirectional",
      code: "NORTH-DOOR",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Configurable Areas
  // ------------------------------------------------------------------
  public eventAreas: EventArea[] = [
    {
      id: "AREA-GBH-GEN",
      event_id: "GBH-dec-2026-001",
      name: "Main Hackathon Hall",
      area_type: "general",
      capacity: 150,
      current_occupancy: 2,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "AREA-GBH-VIP",
      event_id: "GBH-dec-2026-001",
      name: "VIP Hacker Lounge",
      area_type: "vip",
      capacity: 35,
      current_occupancy: 1,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "AREA-GBH-VVIP",
      event_id: "GBH-dec-2026-001",
      name: "VVIP Investor Suite",
      area_type: "vvip",
      capacity: 15,
      current_occupancy: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "AREA-GBH-LABS",
      event_id: "GBH-dec-2026-001",
      name: "Breakout Hardware Lab",
      area_type: "conference",
      capacity: 40,
      current_occupancy: 0,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Configurable Sections
  // ------------------------------------------------------------------
  public eventSections: EventSection[] = [
    {
      id: "SEC-GBH-A",
      event_id: "GBH-dec-2026-001",
      area_id: "AREA-GBH-GEN",
      name: "Section A - AI Benches",
      capacity: 75,
      created_at: new Date().toISOString(),
    },
    {
      id: "SEC-GBH-B",
      event_id: "GBH-dec-2026-001",
      area_id: "AREA-GBH-GEN",
      name: "Section B - Hardware Pods",
      capacity: 75,
      created_at: new Date().toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Configurable Pass Types
  // ------------------------------------------------------------------
  public eventPassTypes: EventPassType[] = [
    {
      id: "PASS-GBH-GA",
      event_id: "GBH-dec-2026-001",
      name: "General Admission Pass",
      code: "GA",
      description: "Full hackathon admission, 48hr meals, energy drinks & builder kit",
      price: 0,
      quota: 100,
      issued_count: 5,
      badge_color: "sky",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "PASS-GBH-VIP",
      event_id: "GBH-dec-2026-001",
      name: "VIP Builder Pass",
      code: "VIP",
      description: "Priority hardware breakout benches, cloud compute credits & mentor access",
      price: 499,
      quota: 35,
      issued_count: 2,
      badge_color: "violet",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "PASS-GBH-VVIP",
      event_id: "GBH-dec-2026-001",
      name: "VVIP Speaker & Judge Pass",
      code: "VVIP",
      description: "Backstage investor lounge, judging committee access & banquet",
      price: 1499,
      quota: 15,
      issued_count: 1,
      badge_color: "amber",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Configurable Food Categories
  // ------------------------------------------------------------------
  public eventFoodCategories: EventFoodCategory[] = [
    {
      id: "FOOD-GBH-STD",
      event_id: "GBH-dec-2026-001",
      name: "Standard Builder Meal Voucher",
      dietary_info: "Veg / Non-Veg / Vegan",
      total_quota: 150,
      redeemed_count: 4,
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "FOOD-GBH-VIP",
      event_id: "GBH-dec-2026-001",
      name: "VIP Executive Banquet Buffet",
      dietary_info: "Chef Curated High Tea & Dinner",
      total_quota: 50,
      redeemed_count: 2,
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Configurable Access Rules
  // ------------------------------------------------------------------
  public eventAccessRules: EventAccessRule[] = [
    // General Pass Permissions
    {
      id: "RULE-GA-GATE",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-GA",
      gate_id: "GATE-GBH-MAIN",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "RULE-GA-AREA",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-GA",
      area_id: "AREA-GBH-GEN",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "RULE-GA-FOOD",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-GA",
      food_category_id: "FOOD-GBH-STD",
      is_allowed: true,
      usage_limit: 3,
      created_at: new Date().toISOString(),
    },
    // VIP Pass Permissions (Access to Main Gate + VIP Gate, General Hall + VIP Lounge)
    {
      id: "RULE-VIP-GATE-M",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-VIP",
      gate_id: "GATE-GBH-MAIN",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "RULE-VIP-GATE-V",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-VIP",
      gate_id: "GATE-GBH-VIP",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "RULE-VIP-AREA-G",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-VIP",
      area_id: "AREA-GBH-GEN",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "RULE-VIP-AREA-V",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-VIP",
      area_id: "AREA-GBH-VIP",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "RULE-VIP-FOOD-STD",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-VIP",
      food_category_id: "FOOD-GBH-STD",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "RULE-VIP-FOOD-VIP",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-VIP",
      food_category_id: "FOOD-GBH-VIP",
      is_allowed: true,
      usage_limit: 1,
      created_at: new Date().toISOString(),
    },
    // VVIP Pass Permissions (All access)
    {
      id: "RULE-VVIP-GATE-M",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-VVIP",
      gate_id: "GATE-GBH-MAIN",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "RULE-VVIP-GATE-V",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-VVIP",
      gate_id: "GATE-GBH-VIP",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "RULE-VVIP-AREA-VVIP",
      event_id: "GBH-dec-2026-001",
      pass_type_id: "PASS-GBH-VVIP",
      area_id: "AREA-GBH-VVIP",
      is_allowed: true,
      created_at: new Date().toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Configurable Staff Assignments
  // ------------------------------------------------------------------
  public eventStaffAssignments: EventStaffAssignment[] = [
    {
      id: "STAFF-GBH-01",
      event_id: "GBH-dec-2026-001",
      user_id: "USER-STAFF-01",
      staff_user_id: "GBH-dec-2026-GATE-01",
      role_type: "employee",
      assigned_gate_id: "GATE-GBH-MAIN",
      can_checkin: true,
      can_checkout: true,
      can_manage_food: false,
      can_add_guests: false,
      can_block_guests: false,
      passcode: "GATE-4821",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "STAFF-GBH-FOOD",
      event_id: "GBH-dec-2026-001",
      staff_user_id: "GBH-dec-2026-FOOD-01",
      role_type: "employee",
      assigned_food_id: "FOOD-GBH-STD",
      can_checkin: false,
      can_checkout: false,
      can_manage_food: true,
      can_add_guests: false,
      can_block_guests: false,
      passcode: "FOOD-2026",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "STAFF-GBH-VIP",
      event_id: "GBH-dec-2026-001",
      staff_user_id: "GBH-dec-2026-VIP-01",
      role_type: "employee",
      assigned_area_id: "AREA-GBH-VIP",
      can_checkin: true,
      can_checkout: true,
      can_manage_food: true,
      can_add_guests: true,
      can_block_guests: true,
      passcode: "VIP-9999",
      is_active: true,
      created_at: new Date().toISOString(),
    },
    {
      id: "STAFF-GBH-MGR",
      event_id: "GBH-dec-2026-001",
      user_id: "USER-MANAGER-01",
      staff_user_id: "GBH-dec-2026-MGR-01",
      role_type: "manager",
      can_checkin: true,
      can_checkout: true,
      can_manage_food: true,
      can_add_guests: true,
      can_block_guests: true,
      passcode: "MGR-2026",
      is_active: true,
      created_at: new Date().toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Immutable Scan Logs (Entry / Exit / Re-Entry / Food)
  // ------------------------------------------------------------------
  public scanLogs: ScanLog[] = [
    {
      id: "SCAN-001",
      event_id: "GBH-dec-2026-001",
      guest_id: "GBH-dec-2026-GST-1001",
      employee_id: "GBH-dec-2026-GATE-01",
      gate_id: "GATE-GBH-MAIN",
      scan_type: "entry",
      result: "ALLOWED",
      scanned_code: "GBH-dec-2026-1001",
      scanned_at: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "SCAN-002",
      event_id: "GBH-dec-2026-001",
      guest_id: "GBH-dec-2026-GST-1001",
      employee_id: "GBH-dec-2026-FOOD-01",
      food_category_id: "FOOD-GBH-STD",
      scan_type: "food_redemption",
      result: "ALLOWED",
      scanned_code: "GBH-dec-2026-1001",
      scanned_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Financial Ledger & Razorpay Payments
  // ------------------------------------------------------------------
  public paymentOrders: PaymentOrder[] = [
    {
      id: "ORDER-001",
      event_id: "GBH-dec-2026-001",
      client_id: "GBH-dec-2026-HOST-01",
      guest_id: "GBH-dec-2026-GST-1001",
      pass_type_id: "PASS-GBH-VIP",
      razorpay_order_id: "order_Qz981kLx891",
      amount: 499,
      currency: "INR",
      platform_fee: 24.95, // 5% platform fee
      net_amount: 474.05,
      status: "paid",
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7100000).toISOString(),
    },
    {
      id: "ORDER-002",
      event_id: "GBH-dec-2026-001",
      client_id: "GBH-dec-2026-HOST-01",
      guest_id: "GBH-dec-2026-GST-1002",
      pass_type_id: "PASS-GBH-VVIP",
      razorpay_order_id: "order_Qz981kLx892",
      amount: 1499,
      currency: "INR",
      platform_fee: 74.95,
      net_amount: 1424.05,
      status: "paid",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3500000).toISOString(),
    },
  ];

  public paymentTransactions: PaymentTransaction[] = [
    {
      id: "TXN-001",
      order_id: "ORDER-001",
      event_id: "GBH-dec-2026-001",
      razorpay_payment_id: "pay_Qz981kLx001",
      razorpay_signature: "sig_mock_valid_001",
      amount: 499,
      currency: "INR",
      method: "upi",
      status: "captured",
      created_at: new Date(Date.now() - 7100000).toISOString(),
    },
    {
      id: "TXN-002",
      order_id: "ORDER-002",
      event_id: "GBH-dec-2026-001",
      razorpay_payment_id: "pay_Qz981kLx002",
      razorpay_signature: "sig_mock_valid_002",
      amount: 1499,
      currency: "INR",
      method: "card",
      status: "captured",
      created_at: new Date(Date.now() - 3500000).toISOString(),
    },
  ];

  public payoutRequests: PayoutRequest[] = [
    {
      id: "PAYOUT-001",
      event_id: "GBH-dec-2026-001",
      client_id: "GBH-dec-2026-HOST-01",
      amount: 1500,
      status: "pending",
      bank_account_holder: "Chandan N",
      bank_account_number_masked: "••••••••4821",
      bank_ifsc: "HDFC0001234",
      requested_at: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Immutable Audit Logs
  // ------------------------------------------------------------------
  public auditLogs: AuditLog[] = [
    {
      id: "AUDIT-001",
      event_id: "GBH-dec-2026-001",
      actor_id: "GBH-dec-2026-HOST-01",
      actor_email: "chandan2004.n@gmail.com",
      actor_role: "admin",
      action: "event.modules_configured",
      resource_type: "event_modules",
      resource_id: "GBH-dec-2026-001",
      new_values: { enabled_count: 10 },
      created_at: new Date(Date.now() - 86400000).toISOString(),
    },
    {
      id: "AUDIT-002",
      event_id: "GBH-dec-2026-001",
      actor_id: "GBH-dec-2026-GATE-01",
      actor_role: "employee",
      action: "scan.entry_allowed",
      resource_type: "guest",
      resource_id: "GBH-dec-2026-GST-1001",
      created_at: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  public guestFoodEntitlements: GuestFoodEntitlement[] = [
    {
      id: "ENT-001",
      event_id: "GBH-dec-2026-001",
      guest_id: "GBH-dec-2026-GST-1001",
      food_category_id: "FOOD-GBH-STD",
      total_allowed: 2,
      redeemed_count: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // ------------------------------------------------------------------
  // Legacy Adapters (Settings, Tiers, Gate Credentials)
  // ------------------------------------------------------------------
  public eventSettings: EventSettings[] = [
    {
      id: "GBH-dec-2026-SET-01",
      event_id: "GBH-dec-2026-001",
      allow_guest_list_public: true,
      notify_host_on_rsvp: true,
      confirmation_email_enabled: true,
      checkin_pin: "GATE-4821",
      staff_email: "staff@buildhackathon.io",
      gate_access_key: "gk_GBH-dec-2026",
      close_rsvp_at: "2026-12-09T23:59:59.000Z",
      is_rsvp_closed: false,
      requires_approval: false,
      enable_waitlist: true,
      ticket_tiers_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "GAS-oct-2026-SET-01",
      event_id: "GAS-oct-2026-001",
      allow_guest_list_public: false,
      notify_host_on_rsvp: true,
      confirmation_email_enabled: true,
      checkin_pin: "GATE-4821",
      staff_email: "staff@craftconf.io",
      gate_access_key: "gk_GAS-oct-2026",
      close_rsvp_at: "2026-10-14T23:59:59.000Z",
      is_rsvp_closed: false,
      requires_approval: false,
      enable_waitlist: true,
      ticket_tiers_enabled: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public ticketTiers: TicketTier[] = [
    {
      id: "GBH-dec-2026-TIER-GA",
      event_id: "GBH-dec-2026-001",
      name: "General Admission",
      description: "Full hackathon admission, 48hr meals, energy drinks & builder kit",
      price: 0,
      capacity: 100,
      badge_color: "sky",
      created_at: new Date().toISOString(),
    },
    {
      id: "GBH-dec-2026-TIER-VIP",
      event_id: "GBH-dec-2026-001",
      name: "VIP Builder Pass",
      description: "Priority hardware breakout benches, cloud compute credits & mentor access",
      price: 499,
      capacity: 35,
      badge_color: "violet",
      created_at: new Date().toISOString(),
    },
    {
      id: "GBH-dec-2026-TIER-MENTOR",
      event_id: "GBH-dec-2026-001",
      name: "Mentor & Judge Pass",
      description: "Backstage mentor lounge, judging committee access & banquet",
      price: 1499,
      capacity: 15,
      badge_color: "emerald",
      created_at: new Date().toISOString(),
    },
  ];

  public gateCredentials: GateCredential[] = [
    {
      id: "GBH-dec-2026-GC-01",
      event_id: "GBH-dec-2026-001",
      user_id: "GBH-dec-2026-GATE-01",
      station_name: "Main Entrance Gate",
      section_type: "gate",
      passcode: "GATE-4821",
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      login_count: 5,
      notes: "Main Gate Turnstile Tablet #1",
    },
    {
      id: "GBH-dec-2026-GC-FOOD",
      event_id: "GBH-dec-2026-001",
      user_id: "GBH-dec-2026-FOOD-01",
      station_name: "Food & Catering Hall",
      section_type: "food",
      passcode: "FOOD-2026",
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      login_count: 3,
      notes: "Catering Meal Voucher & Dietary Counter",
    },
    {
      id: "GBH-dec-2026-GC-VIP",
      event_id: "GBH-dec-2026-001",
      user_id: "GBH-dec-2026-VIP-01",
      station_name: "VIP Hacker Lounge",
      section_type: "vip_lounge",
      passcode: "VIP-9999",
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      login_count: 2,
      notes: "VIP Lounge & Reception Checkpoint",
    },
    {
      id: "GBH-dec-2026-GC-BREAKOUT",
      event_id: "GBH-dec-2026-001",
      user_id: "GBH-dec-2026-BREAKOUT-01",
      station_name: "Breakout Labs & Workshops",
      section_type: "breakout",
      passcode: "LABS-2026",
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: null,
      login_count: 0,
      notes: "Hardware Workshop Room A/B Scanner",
    },
    {
      id: "GAS-oct-2026-GC-01",
      event_id: "GAS-oct-2026-001",
      user_id: "GAS-oct-2026-GATE-01",
      station_name: "North Terminal",
      section_type: "gate",
      passcode: "GATE-4821",
      is_active: true,
      created_at: new Date().toISOString(),
      last_login_at: new Date().toISOString(),
      login_count: 1,
      notes: "Summit primary door",
    },
  ];

  public questions: (RsvpQuestion & { options?: RsvpQuestionOption[] })[] = [
    {
      id: "GBH-dec-2026-Q1",
      event_id: "GBH-dec-2026-001",
      prompt: "Do you have any dietary restrictions?",
      question_type: "single_choice",
      is_required: true,
      order_index: 1,
      created_at: new Date().toISOString(),
      options: [
        {
          id: "GBH-dec-2026-OPT-1",
          question_id: "GBH-dec-2026-Q1",
          label: "Standard / Omnivore",
          value: "standard",
          order_index: 1,
          created_at: new Date().toISOString(),
        },
        {
          id: "GBH-dec-2026-OPT-2",
          question_id: "GBH-dec-2026-Q1",
          label: "Vegetarian",
          value: "vegetarian",
          order_index: 2,
          created_at: new Date().toISOString(),
        },
        {
          id: "GBH-dec-2026-OPT-3",
          question_id: "GBH-dec-2026-Q1",
          label: "Vegan",
          value: "vegan",
          order_index: 3,
          created_at: new Date().toISOString(),
        },
        {
          id: "GBH-dec-2026-OPT-4",
          question_id: "GBH-dec-2026-Q1",
          label: "Gluten-Free",
          value: "gluten_free",
          order_index: 4,
          created_at: new Date().toISOString(),
        },
      ],
    },
    {
      id: "GBH-dec-2026-Q2",
      event_id: "GBH-dec-2026-001",
      prompt: "Which developer community or university are you representing?",
      question_type: "text",
      is_required: false,
      order_index: 2,
      created_at: new Date().toISOString(),
    },
  ];

  public guests: Guest[] = [
    {
      id: "GBH-dec-2026-GST-1001",
      event_id: "GBH-dec-2026-001",
      first_name: "Elena",
      last_name: "Rostova",
      email: "elena.rostova@techcorp.io",
      phone: "+1 (555) 234-5678",
      status: "attending",
      plus_ones_allowed: 1,
      plus_ones_count: 1,
      qr_token: "GBH-dec-2026-1001",
      notes: "Senior ML Systems Architect at TechCorp",
      tier_id: "GBH-dec-2026-TIER-VIP",
      tier_name: "VIP Builder Pass",
      pass_type_id: "PASS-GBH-VIP",
      pass_name: "VIP Builder Pass",
      food_category_id: "FOOD-GBH-VIP",
      food_category_name: "VIP Executive Banquet Buffet",
      is_blocked: false,
      is_inside: true,
      checked_in_count: 1,
      checked_out_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "GBH-dec-2026-GST-1002",
      event_id: "GBH-dec-2026-001",
      first_name: "Marcus",
      last_name: "Vance",
      email: "marcus.v@deepmind.com",
      phone: "+1 (555) 876-5432",
      status: "attending",
      plus_ones_allowed: 0,
      plus_ones_count: 0,
      qr_token: "GBH-dec-2026-1002",
      notes: "Keynote Speaker on Autonomous Agents",
      tier_id: "GBH-dec-2026-TIER-MENTOR",
      tier_name: "Mentor & Judge Pass",
      pass_type_id: "PASS-GBH-VVIP",
      pass_name: "VVIP Speaker & Judge Pass",
      food_category_id: "FOOD-GBH-VIP",
      food_category_name: "VIP Executive Banquet Buffet",
      is_blocked: false,
      is_inside: false,
      checked_in_count: 0,
      checked_out_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: "GBH-dec-2026-GST-1003",
      event_id: "GBH-dec-2026-001",
      first_name: "Aria",
      last_name: "Chen",
      email: "aria.chen@stanford.edu",
      phone: "+1 (555) 345-6789",
      status: "pending_approval",
      plus_ones_allowed: 0,
      plus_ones_count: 0,
      qr_token: "GBH-dec-2026-1003",
      notes: "Stanford AI Lab PhD Researcher",
      tier_id: "GBH-dec-2026-TIER-GA",
      tier_name: "General Admission",
      pass_type_id: "PASS-GBH-GA",
      pass_name: "General Admission Pass",
      is_blocked: false,
      is_inside: false,
      checked_in_count: 0,
      checked_out_count: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public tickets: Ticket[] = [
    {
      id: "GBH-dec-2026-TK-1001",
      event_id: "GBH-dec-2026-001",
      guest_id: "GBH-dec-2026-GST-1001",
      ticket_code: "GBH-dec-2026-1001",
      qr_code_data: "RSVP:GBH-dec-2026-001:GBH-dec-2026-1001",
      status: "valid",
      issued_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
    {
      id: "GBH-dec-2026-TK-1002",
      event_id: "GBH-dec-2026-001",
      guest_id: "GBH-dec-2026-GST-1002",
      ticket_code: "GBH-dec-2026-1002",
      qr_code_data: "RSVP:GBH-dec-2026-001:GBH-dec-2026-1002",
      status: "valid",
      issued_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  public checkins: Checkin[] = [
    {
      id: "GBH-dec-2026-CHK-1001",
      event_id: "GBH-dec-2026-001",
      ticket_id: "GBH-dec-2026-TK-1001",
      guest_id: "GBH-dec-2026-GST-1001",
      checked_in_by: "GBH-dec-2026-HOST-01",
      checkin_time: new Date().toISOString(),
      checkin_method: "qr_scan",
      checkpoint: "Main Gate Entrance",
      gate_user_id: "GBH-dec-2026-GATE-01",
      created_at: new Date().toISOString(),
    },
  ];

  public responses: RsvpResponse[] = [
    {
      id: "GBH-dec-2026-RESP-1001",
      event_id: "GBH-dec-2026-001",
      guest_id: "GBH-dec-2026-GST-1001",
      status: "attending",
      attending_count: 2,
      submitted_at: new Date().toISOString(),
      notes: "Bringing a team hardware collaborator",
      created_at: new Date().toISOString(),
    },
  ];

  public answers: RsvpAnswer[] = [
    {
      id: "GBH-dec-2026-ANS-1001-1",
      response_id: "GBH-dec-2026-RESP-1001",
      question_id: "GBH-dec-2026-Q1",
      answer_text: "vegetarian",
      answer_json: null,
      created_at: new Date().toISOString(),
    },
    {
      id: "GBH-dec-2026-ANS-1001-2",
      response_id: "GBH-dec-2026-RESP-1001",
      question_id: "GBH-dec-2026-Q2",
      answer_text: "Google Developer Group",
      answer_json: null,
      created_at: new Date().toISOString(),
    },
  ];

  public notificationLogs: NotificationLog[] = [];
}

// Global singleton for in-memory fallback with version-based hot reload
const DB_VERSION = 6;
const globalForDb = globalThis as unknown as { inMemoryDb?: InMemoryDB; inMemoryDbVersion?: number };
if (!globalForDb.inMemoryDb || globalForDb.inMemoryDbVersion !== DB_VERSION) {
  globalForDb.inMemoryDb = new InMemoryDB();
  globalForDb.inMemoryDbVersion = DB_VERSION;
}
export const db = globalForDb.inMemoryDb;
if (!db.gateCredentials) db.gateCredentials = [];
if (!db.ticketTiers) db.ticketTiers = [];
if (!db.eventModules) db.eventModules = [];
if (!db.eventGates) db.eventGates = [];
if (!db.eventAreas) db.eventAreas = [];
if (!db.eventSections) db.eventSections = [];
if (!db.eventPassTypes) db.eventPassTypes = [];
if (!db.eventFoodCategories) db.eventFoodCategories = [];
if (!db.eventAccessRules) db.eventAccessRules = [];
if (!db.eventStaffAssignments) db.eventStaffAssignments = [];
if (!db.scanLogs) db.scanLogs = [];
if (!db.paymentOrders) db.paymentOrders = [];
if (!db.paymentTransactions) db.paymentTransactions = [];
if (!db.payoutRequests) db.payoutRequests = [];
if (!db.auditLogs) db.auditLogs = [];
if (!db.guestFoodEntitlements) db.guestFoodEntitlements = [];

if (process.env.NODE_ENV !== "production") {
  globalForDb.inMemoryDb = db;
  globalForDb.inMemoryDbVersion = DB_VERSION;
}
