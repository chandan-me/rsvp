// ====================================================================
// Database Types & Relational Interfaces
// ====================================================================

export type EventRole = 'owner' | 'admin' | 'staff';
export type GuestStatus = 'invited' | 'pending' | 'attending' | 'declined';
export type InvitationStatus = 'pending' | 'sent' | 'delivered' | 'failed';
export type QuestionType = 'text' | 'textarea' | 'single_choice' | 'multiple_choice' | 'boolean';
export type RsvpStatus = 'attending' | 'declined';
export type TicketStatus = 'valid' | 'used' | 'cancelled';
export type CheckinMethod = 'qr_scan' | 'manual';
export type NotificationType = 'invitation' | 'confirmation' | 'reminder';
export type NotificationStatus = 'sent' | 'failed' | 'simulated';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  created_by: string | null;
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
  max_capacity: number | null;
  created_at: string;
  updated_at: string;
}

export interface EventMember {
  id: string;
  event_id: string;
  user_id: string;
  role: EventRole;
  created_at: string;
  profile?: Profile;
}

export interface EventSettings {
  id: string;
  event_id: string;
  allow_guest_list_public: boolean;
  notify_host_on_rsvp: boolean;
  confirmation_email_enabled: boolean;
  checkin_pin: string | null;
  staff_email?: string | null;
  close_rsvp_at: string | null;
  is_rsvp_closed: boolean;
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
  created_at: string;
  updated_at: string;
  ticket?: Ticket;
  checkin?: Checkin;
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
  created_at: string;
  guest?: Guest;
  ticket?: Ticket;
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

// Aggregated View / Metric Types
export interface EventStats {
  totalGuests: number;
  invited: number;
  pending: number;
  attending: number;
  declined: number;
  totalAttendeesCount: number; // Including plus-ones
  checkedInCount: number;
  checkinPercentage: number;
  capacityLimit: number | null;
  capacityRemaining: number | null;
}
