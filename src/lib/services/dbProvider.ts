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

// Clean, production-ready in-memory database store (fallback & local development)
class InMemoryDB {
  public profiles: Profile[] = [
    {
      id: "ADMIN-01",
      email: "chandan2004.n@gmail.com",
      full_name: "Chandan N",
      role: "admin",
      avatar_url: "",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  public events: Event[] = [];
  public eventModules: EventModule[] = [];
  public eventGates: EventGate[] = [];
  public eventAreas: EventArea[] = [];
  public eventSections: EventSection[] = [];
  public eventPassTypes: EventPassType[] = [];
  public eventFoodCategories: EventFoodCategory[] = [];
  public eventAccessRules: EventAccessRule[] = [];
  public eventStaffAssignments: EventStaffAssignment[] = [];
  public scanLogs: ScanLog[] = [];
  public paymentOrders: PaymentOrder[] = [];
  public paymentTransactions: PaymentTransaction[] = [];
  public payoutRequests: PayoutRequest[] = [];
  public auditLogs: AuditLog[] = [];
  public guestFoodEntitlements: GuestFoodEntitlement[] = [];
  public eventSettings: EventSettings[] = [];
  public ticketTiers: TicketTier[] = [];
  public gateCredentials: GateCredential[] = [];
  public questions: (RsvpQuestion & { options?: RsvpQuestionOption[] })[] = [];
  public guests: Guest[] = [];
  public tickets: Ticket[] = [];
  public checkins: Checkin[] = [];
  public responses: RsvpResponse[] = [];
  public answers: RsvpAnswer[] = [];
  public notificationLogs: NotificationLog[] = [];
}

// Global singleton for in-memory fallback with version-based hot reload
const DB_VERSION = 7;
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
