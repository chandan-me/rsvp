// ====================================================================
// Database Types & Relational Interfaces
// Configurable Event Operations, Access Control, and Payments Engine
// ====================================================================

export type UserRoleType = 'admin' | 'manager' | 'client' | 'employee';
export type EventRole = 'owner' | 'admin' | 'staff';
export type EventLifecycleStatus = 'draft' | 'published' | 'live' | 'completed' | 'cancelled' | 'archived';
export type GuestStatus = 'invited' | 'pending' | 'attending' | 'declined' | 'pending_approval' | 'waitlisted' | 'active' | 'blocked' | 'cancelled';
export type InvitationStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type QuestionType =
  | 'text'
  | 'textarea'
  | 'single_choice'
  | 'multiple_choice'
  | 'boolean'
  | 'file_upload'
  | 'image_upload';

export type RsvpStatus = 'attending' | 'declined' | 'pending_approval' | 'waitlisted';
export type TicketStatus = 'valid' | 'used' | 'cancelled';
export type CheckinMethod = 'qr_scan' | 'manual';
export type NotificationType = 'invitation' | 'confirmation' | 'reminder';
export type NotificationStatus = 'sent' | 'failed' | 'simulated';

export type GateType = 'entry' | 'exit' | 'bidirectional';
export type ScanType = 'entry' | 'exit' | 're_entry' | 'area_access' | 'food_redemption';
export type ScanResult = 'ALLOWED' | 'DENIED';
export type PayoutStatus = 'pending' | 'approved' | 'processing' | 'paid' | 'rejected';
export type PaymentOrderStatus = 'created' | 'attempted' | 'paid' | 'failed' | 'refunded';

export type EventModuleKey =
  | 'rsvp'
  | 'guest_management'
  | 'qr_entry'
  | 'qr_access'
  | 'gates'
  | 'areas'
  | 'sections'
  | 'food'
  | 'passes'
  | 'pass_types'
  | 'seating'
  | 'paid_entry'
  | 'payments'
  | 'parking'
  | 'staff_checkin'
  | 'analytics';

// --------------------------------------------------------------------
// 1. User & Authentication Models
// --------------------------------------------------------------------
export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  role?: UserRoleType;
  created_at: string;
  updated_at: string;
}

export interface UserRole {
  id: string;
  user_id: string;
  role_id: UserRoleType;
  created_at: string;
}

// --------------------------------------------------------------------
// 2. Event & Module Models
// --------------------------------------------------------------------
export interface Event {
  id: string;
  created_by: string | null;
  client_id?: string | null;
  title: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  start_date: string;
  end_date: string | null;
  timezone: string;
  location_name: string | null;
  location_address: string | null;
  is_published: boolean;
  status?: EventLifecycleStatus;
  max_capacity: number | null;
  created_at: string;
  updated_at: string;
  // Dynamic relations attached on query
  modules?: EventModule[];
  gates?: EventGate[];
  areas?: EventArea[];
  sections?: EventSection[];
  pass_types?: EventPassType[];
  food_categories?: EventFoodCategory[];
}

export interface EventModule {
  id: string;
  event_id: string;
  module_key: EventModuleKey;
  is_enabled: boolean;
  config?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  role: EventRole;
  created_at: string;
  profile?: Profile;
}

// --------------------------------------------------------------------
// 3. Physical Topography (Gates, Areas, Sections)
// --------------------------------------------------------------------
export interface EventGate {
  id: string;
  event_id: string;
  name: string;
  gate_type: GateType;
  code?: string | null;
  description?: string | null;
  is_active: boolean;
  created_at?: string;
}

export interface EventArea {
  id: string;
  event_id: string;
  name: string;
  area_type: string; // 'general' | 'vip' | 'vvip' | 'backstage' | 'conference' | 'dining'
  capacity?: number | null;
  current_occupancy?: number;
  is_active: boolean;
  created_at?: string;
}

export interface EventSection {
  id: string;
  event_id: string;
  area_id?: string | null;
  name: string;
  capacity?: number | null;
  created_at?: string;
}

// --------------------------------------------------------------------
// 4. Pass Types & Food Entitlements
// --------------------------------------------------------------------
export interface EventPassType {
  id: string;
  event_id: string;
  name: string;
  code?: string | null;
  description?: string | null;
  price: number;
  quota?: number | null;
  issued_count?: number;
  badge_color: string;
  is_active: boolean;
  created_at?: string;
}

export interface EventFoodCategory {
  id: string;
  event_id: string;
  name: string;
  dietary_info?: string | null;
  total_quota?: number | null;
  redeemed_count?: number;
  is_active: boolean;
  created_at?: string;
}

// --------------------------------------------------------------------
// 5. Access Rules (Pass -> Gates, Areas, Sections, Food)
// --------------------------------------------------------------------
export interface EventAccessRule {
  id: string;
  event_id: string;
  pass_type_id: string;
  gate_id?: string | null;
  area_id?: string | null;
  section_id?: string | null;
  food_category_id?: string | null;
  is_allowed: boolean;
  usage_limit?: number | null;
  time_start?: string | null;
  time_end?: string | null;
  notes?: string | null;
  created_at?: string;
}

// --------------------------------------------------------------------
// 6. Staff Assignments (Field Operators & Managers)
// --------------------------------------------------------------------
export interface EventStaffAssignment {
  id: string;
  event_id: string;
  user_id?: string | null;
  staff_user_id: string;
  role_type: 'manager' | 'employee';
  assigned_gate_id?: string | null;
  assigned_area_id?: string | null;
  assigned_food_id?: string | null;
  can_checkin: boolean;
  can_checkout: boolean;
  can_manage_food: boolean;
  can_add_guests: boolean;
  can_block_guests: boolean;
  passcode: string;
  is_active: boolean;
  created_at?: string;
  last_login_at?: string | null;
}

// Legacy GateCredential adapter (backward compatibility)
export type StationSectionType = 'gate' | 'food' | 'vip_lounge' | 'breakout';
export interface GateCredential {
  id: string;
  event_id: string;
  user_id: string;
  station_name: string;
  section_type?: StationSectionType;
  passcode: string;
  is_active: boolean;
  created_at: string;
  last_login_at: string | null;
  login_count: number;
  notes?: string | null;
}

// Legacy TicketTier adapter
export interface TicketTier {
  id: string;
  event_id: string;
  name: string;
  description?: string | null;
  price?: number;
  capacity: number;
  badge_color: string;
  created_at: string;
}

export interface PlusOneDetail {
  first_name: string;
  last_name: string;
  email: string;
}

export interface EventSettings {
  id: string;
  event_id: string;
  allow_guest_list_public: boolean;
  notify_host_on_rsvp: boolean;
  confirmation_email_enabled: boolean;
  checkin_pin: string | null;
  staff_email?: string | null;
  gate_access_key?: string | null;
  close_rsvp_at: string | null;
  is_rsvp_closed: boolean;
  requires_approval: boolean;
  enable_waitlist: boolean;
  ticket_tiers_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface InvitationTemplate {
  id: string;
  event_id: string;
  name: string;
  subject: string;
  body_html: string | null;
  body_text: string | null;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------------------------------
// 7. Guests & Attendance
// --------------------------------------------------------------------
export interface Guest {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  status: GuestStatus;
  plus_ones_allowed: number;
  plus_ones_count: number;
  qr_token: string;
  notes: string | null;
  tier_id?: string | null;
  tier_name?: string | null;
  pass_type_id?: string | null;
  pass_name?: string | null;
  food_category_id?: string | null;
  food_category_name?: string | null;
  primary_guest_id?: string | null;
  is_plus_one?: boolean;
  is_blocked?: boolean;
  blocked_reason?: string | null;
  blocked_at?: string | null;
  is_inside?: boolean;
  checked_in_count?: number;
  checked_out_count?: number;
  created_at: string;
  updated_at: string;
  ticket?: Ticket;
  checkin?: Checkin;
}

export interface GuestFoodEntitlement {
  id: string;
  event_id: string;
  guest_id: string;
  food_category_id: string;
  total_allowed: number;
  redeemed_count: number;
  created_at?: string;
  updated_at?: string;
}

export interface Invitation {
  id: string;
  event_id: string;
  guest_id: string;
  template_id: string | null;
  status: InvitationStatus;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RsvpQuestionOption {
  id: string;
  question_id: string;
  label: string;
  value: string;
  order_index: number;
  created_at: string;
}

export interface RsvpQuestion {
  id: string;
  event_id: string;
  prompt: string;
  question_type: QuestionType;
  is_required: boolean;
  order_index: number;
  created_at: string;
  options?: RsvpQuestionOption[];
}

export interface RsvpAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_text: string | null;
  answer_json: string[] | boolean | null;
  created_at: string;
  question?: RsvpQuestion;
}

export interface RsvpResponse {
  id: string;
  event_id: string;
  guest_id: string;
  status: RsvpStatus;
  attending_count: number;
  submitted_at: string;
  notes: string | null;
  created_at: string;
  guest?: Guest;
  answers?: RsvpAnswer[];
}

export interface Ticket {
  id: string;
  event_id: string;
  guest_id: string;
  ticket_code: string;
  qr_code_data: string;
  status: TicketStatus;
  issued_at: string;
  created_at: string;
  guest?: Guest;
}

export interface Checkin {
  id: string;
  event_id: string;
  ticket_id: string;
  guest_id: string;
  checked_in_by: string | null;
  checkin_time: string;
  checkin_method: CheckinMethod;
  checkpoint?: string | null;
  gate_user_id?: string | null;
  created_at: string;
  guest?: Guest;
  ticket?: Ticket;
}

// --------------------------------------------------------------------
// 8. Immutable Scan Logs (Entry / Exit / Re-Entry / Food)
// --------------------------------------------------------------------
export interface ScanLog {
  id: string;
  event_id: string;
  guest_id?: string | null;
  employee_id?: string | null;
  gate_id?: string | null;
  area_id?: string | null;
  section_id?: string | null;
  food_category_id?: string | null;
  scan_type: ScanType;
  result: ScanResult;
  denial_reason?: string | null;
  scanned_code: string;
  device_info?: string | null;
  scanned_at: string;
  guest?: Partial<Guest>;
}

export interface AccessDecisionResult {
  allowed: boolean;
  result: ScanResult;
  reason: string;
  scan_type: ScanType;
  guest?: Guest;
  pass?: EventPassType;
  food?: EventFoodCategory;
  checkpoint_name?: string;
  timestamp: string;
}

// --------------------------------------------------------------------
// 9. Financial Ledger & Razorpay Payments
// --------------------------------------------------------------------
export interface PaymentOrder {
  id: string;
  event_id: string;
  client_id?: string | null;
  guest_id?: string | null;
  pass_type_id?: string | null;
  razorpay_order_id: string;
  amount: number;
  currency: string;
  platform_fee: number;
  net_amount: number;
  status: PaymentOrderStatus;
  created_at: string;
  updated_at: string;
}

export interface PaymentTransaction {
  id: string;
  order_id: string;
  event_id: string;
  razorpay_payment_id: string;
  razorpay_signature?: string | null;
  amount: number;
  currency: string;
  method?: string | null;
  status: 'captured' | 'failed' | 'refunded';
  error_code?: string | null;
  error_description?: string | null;
  created_at: string;
}

export interface PayoutRequest {
  id: string;
  event_id: string;
  client_id: string;
  amount: number;
  status: PayoutStatus;
  bank_account_holder?: string | null;
  bank_account_number_masked?: string | null;
  bank_ifsc?: string | null;
  admin_notes?: string | null;
  processed_by?: string | null;
  requested_at: string;
  processed_at?: string | null;
}

export interface EventFinancialSummary {
  eventId: string;
  eventTitle: string;
  grossRevenue: number;
  platformFees: number;
  refunds: number;
  netRevenue: number;
  withdrawnAmount: number;
  pendingSettlement: number;
  availableForWithdrawal: number;
  canRequestWithdrawal: boolean;
  ordersCount: number;
  paidOrdersCount: number;
}

// --------------------------------------------------------------------
// 10. Audit Logs & System Notifications
// --------------------------------------------------------------------
export interface AuditLog {
  id: string;
  event_id?: string | null;
  actor_id: string;
  actor_email?: string | null;
  actor_role?: string | null;
  action: string;
  resource_type: string;
  resource_id?: string | null;
  old_values?: Record<string, any> | null;
  new_values?: Record<string, any> | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at: string;
}

export interface NotificationLog {
  id: string;
  event_id: string;
  recipient_email: string;
  recipient_name: string | null;
  notification_type: NotificationType;
  status: NotificationStatus;
  error_message: string | null;
  created_at: string;
}

export interface EventStats {
  totalGuests: number;
  invited: number;
  pending: number;
  attending: number;
  declined: number;
  pendingApprovalCount: number;
  waitlistedCount: number;
  totalAttendeesCount: number;
  checkedInCount: number;
  checkinPercentage: number;
  capacityLimit: number | null;
  capacityRemaining: number | null;
  tierCounts?: Record<string, number>;
  // Dynamic stats
  currentlyInside?: number;
  checkedOutCount?: number;
  blockedCount?: number;
  scanDenialCount?: number;
}
