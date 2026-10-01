-- ====================================================================
-- Production RSVP & Event Management PostgreSQL Migration
-- ====================================================================

-- Enable pgcrypto for UUIDs & cryptographic tokens
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Helper function for auto-updating timestamps
CREATE OR REPLACE FUNCTION set_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. Profiles Table (syncs with Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY,
    email TEXT NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_profiles_modtime
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- 2. Events Table
CREATE TABLE IF NOT EXISTS events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    cover_image_url TEXT,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    location_name TEXT,
    location_address TEXT,
    is_published BOOLEAN NOT NULL DEFAULT TRUE,
    max_capacity INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_events_slug ON events(slug);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON events(created_by);

CREATE TRIGGER update_events_modtime
    BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- 3. Event Members Table (Roles: owner, admin, staff)
CREATE TABLE IF NOT EXISTS event_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'staff')) DEFAULT 'staff',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_members_event_user ON event_members(event_id, user_id);

-- 4. Event Settings Table
CREATE TABLE IF NOT EXISTS event_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL UNIQUE REFERENCES events(id) ON DELETE CASCADE,
    allow_guest_list_public BOOLEAN NOT NULL DEFAULT FALSE,
    notify_host_on_rsvp BOOLEAN NOT NULL DEFAULT TRUE,
    confirmation_email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    checkin_pin TEXT,
    close_rsvp_at TIMESTAMPTZ,
    is_rsvp_closed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_event_settings_modtime
    BEFORE UPDATE ON event_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- 5. Invitation Templates Table
CREATE TABLE IF NOT EXISTS invitation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    body_html TEXT,
    body_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER update_invitation_templates_modtime
    BEFORE UPDATE ON invitation_templates
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- 6. Guests Table
CREATE TABLE IF NOT EXISTS guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    status TEXT NOT NULL CHECK (status IN ('invited', 'pending', 'attending', 'declined')) DEFAULT 'pending',
    plus_ones_allowed INTEGER NOT NULL DEFAULT 0 CHECK (plus_ones_allowed >= 0),
    plus_ones_count INTEGER NOT NULL DEFAULT 0 CHECK (plus_ones_count >= 0),
    qr_token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, email)
);

CREATE INDEX IF NOT EXISTS idx_guests_event_id ON guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(email);
CREATE INDEX IF NOT EXISTS idx_guests_qr_token ON guests(qr_token);
CREATE INDEX IF NOT EXISTS idx_guests_status ON guests(status);

CREATE TRIGGER update_guests_modtime
    BEFORE UPDATE ON guests
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- 7. Invitations Table
CREATE TABLE IF NOT EXISTS invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    template_id UUID REFERENCES invitation_templates(id) ON DELETE SET NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'sent', 'delivered', 'failed')) DEFAULT 'pending',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_invitations_guest_id ON invitations(guest_id);
CREATE INDEX IF NOT EXISTS idx_invitations_event_id ON invitations(event_id);

CREATE TRIGGER update_invitations_modtime
    BEFORE UPDATE ON invitations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at_column();

-- 8. RSVP Questions Table
CREATE TABLE IF NOT EXISTS rsvp_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    prompt TEXT NOT NULL,
    question_type TEXT NOT NULL CHECK (question_type IN ('text', 'textarea', 'single_choice', 'multiple_choice', 'boolean')),
    is_required BOOLEAN NOT NULL DEFAULT FALSE,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_questions_event_id ON rsvp_questions(event_id, order_index);

-- 9. RSVP Question Options Table
CREATE TABLE IF NOT EXISTS rsvp_question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL REFERENCES rsvp_questions(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    value TEXT NOT NULL,
    order_index INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_question_options_q ON rsvp_question_options(question_id, order_index);

-- 10. RSVP Responses Table
CREATE TABLE IF NOT EXISTS rsvp_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('attending', 'declined')),
    attending_count INTEGER NOT NULL DEFAULT 1 CHECK (attending_count >= 1),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_responses_guest_id ON rsvp_responses(guest_id);
CREATE INDEX IF NOT EXISTS idx_rsvp_responses_event_id ON rsvp_responses(event_id);

-- 11. RSVP Answers Table
CREATE TABLE IF NOT EXISTS rsvp_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID NOT NULL REFERENCES rsvp_responses(id) ON DELETE CASCADE,
    question_id UUID NOT NULL REFERENCES rsvp_questions(id) ON DELETE CASCADE,
    answer_text TEXT,
    answer_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rsvp_answers_response_id ON rsvp_answers(response_id);

-- 12. Tickets Table
CREATE TABLE IF NOT EXISTS tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    ticket_code TEXT NOT NULL UNIQUE,
    qr_code_data TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('valid', 'used', 'cancelled')) DEFAULT 'valid',
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_code ON tickets(ticket_code);
CREATE INDEX IF NOT EXISTS idx_tickets_guest_id ON tickets(guest_id);
CREATE INDEX IF NOT EXISTS idx_tickets_event_id ON tickets(event_id);

-- 13. Checkins Table (Ensures only one checkin per ticket)
CREATE TABLE IF NOT EXISTS checkins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    ticket_id UUID NOT NULL UNIQUE REFERENCES tickets(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    checked_in_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    checkin_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    checkin_method TEXT NOT NULL CHECK (checkin_method IN ('qr_scan', 'manual')) DEFAULT 'qr_scan',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_checkins_event_id ON checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_checkins_guest_id ON checkins(guest_id);

-- 14. Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    recipient_email TEXT NOT NULL,
    recipient_name TEXT,
    notification_type TEXT NOT NULL CHECK (notification_type IN ('invitation', 'confirmation', 'reminder')),
    status TEXT NOT NULL CHECK (status IN ('sent', 'failed', 'simulated')) DEFAULT 'sent',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_logs_event_id ON notification_logs(event_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitation_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_question_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE rsvp_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if current user is an active event member
CREATE OR REPLACE FUNCTION is_event_member(p_event_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM event_members
        WHERE event_id = p_event_id AND user_id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Profiles: Users can view and edit their own profile
CREATE POLICY "Profiles readable by owner" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Profiles updatable by owner" ON profiles
    FOR UPDATE USING (auth.uid() = id);

-- Events: Members can view/edit their events; Public can view published events
CREATE POLICY "Events viewable by members or published" ON events
    FOR SELECT USING (
        is_published = TRUE OR is_event_member(id)
    );

CREATE POLICY "Events insertable by authenticated users" ON events
    FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Events updatable by event members" ON events
    FOR UPDATE USING (is_event_member(id));

CREATE POLICY "Events deletable by event owner" ON events
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM event_members
            WHERE event_id = events.id AND user_id = auth.uid() AND role = 'owner'
        )
    );

-- Event Members
CREATE POLICY "Event members viewable by event team" ON event_members
    FOR SELECT USING (is_event_member(event_id));

CREATE POLICY "Event members managed by owner" ON event_members
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM event_members em
            WHERE em.event_id = event_members.event_id AND em.user_id = auth.uid() AND em.role = 'owner'
        )
    );

-- Event Settings
CREATE POLICY "Event settings viewable by members" ON event_settings
    FOR SELECT USING (is_event_member(event_id));

CREATE POLICY "Event settings updatable by members" ON event_settings
    FOR ALL USING (is_event_member(event_id));

-- Guests
CREATE POLICY "Guests viewable by event members" ON guests
    FOR SELECT USING (is_event_member(event_id));

CREATE POLICY "Guests manageable by event members" ON guests
    FOR ALL USING (is_event_member(event_id));

-- RSVP Questions & Options: Viewable publicly for published events, manageable by members
CREATE POLICY "RSVP questions viewable publicly" ON rsvp_questions
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM events WHERE events.id = rsvp_questions.event_id AND events.is_published = TRUE)
        OR is_event_member(event_id)
    );

CREATE POLICY "RSVP questions manageable by members" ON rsvp_questions
    FOR ALL USING (is_event_member(event_id));

CREATE POLICY "RSVP question options viewable publicly" ON rsvp_question_options
    FOR SELECT USING (TRUE);

CREATE POLICY "RSVP question options manageable by members" ON rsvp_question_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM rsvp_questions q
            WHERE q.id = rsvp_question_options.question_id AND is_event_member(q.event_id)
        )
    );

-- Tickets & Checkins
CREATE POLICY "Tickets viewable by members" ON tickets
    FOR SELECT USING (is_event_member(event_id));

CREATE POLICY "Checkins manageable by members" ON checkins
    FOR ALL USING (is_event_member(event_id));

CREATE POLICY "Notification logs viewable by members" ON notification_logs
    FOR ALL USING (is_event_member(event_id));

-- ====================================================================
-- STORED PROCEDURES (Transactional Operations)
-- ====================================================================

-- Atomic Check-in Stored Procedure
CREATE OR REPLACE FUNCTION process_event_checkin(
    p_event_id UUID,
    p_code_or_token TEXT,
    p_method TEXT,
    p_operator_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_ticket RECORD;
    v_guest RECORD;
    v_existing_checkin RECORD;
    v_checkin_id UUID;
BEGIN
    -- 1. Find ticket by ticket_code or guest's qr_token
    SELECT t.*, g.first_name, g.last_name, g.email, g.status as guest_status, g.plus_ones_count
    INTO v_ticket
    FROM tickets t
    JOIN guests g ON g.id = t.guest_id
    WHERE t.event_id = p_event_id
      AND (t.ticket_code = p_code_or_token OR g.qr_token = p_code_or_token)
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'TICKET_NOT_FOUND',
            'message', 'No valid ticket or guest found with this code.'
        );
    END IF;

    -- 2. Check if already checked in
    SELECT * INTO v_existing_checkin
    FROM checkins
    WHERE ticket_id = v_ticket.id;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'code', 'ALREADY_CHECKED_IN',
            'message', 'Attendee was already checked in at ' || to_char(v_existing_checkin.checkin_time, 'YYYY-MM-DD HH24:MI:SS'),
            'checked_in_at', v_existing_checkin.checkin_time,
            'guest', jsonb_build_object(
                'id', v_ticket.guest_id,
                'name', v_ticket.first_name || ' ' || v_ticket.last_name,
                'email', v_ticket.email
            )
        );
    END IF;

    -- 3. Insert Checkin record
    INSERT INTO checkins (event_id, ticket_id, guest_id, checked_in_by, checkin_method, checkin_time)
    VALUES (p_event_id, v_ticket.id, v_ticket.guest_id, p_operator_id, p_method, NOW())
    RETURNING id INTO v_checkin_id;

    -- 4. Mark ticket as used
    UPDATE tickets SET status = 'used' WHERE id = v_ticket.id;

    RETURN jsonb_build_object(
        'success', true,
        'code', 'CHECKIN_SUCCESS',
        'message', 'Guest checked in successfully!',
        'checkin_id', v_checkin_id,
        'checked_in_at', NOW(),
        'guest', jsonb_build_object(
            'id', v_ticket.guest_id,
            'name', v_ticket.first_name || ' ' || v_ticket.last_name,
            'email', v_ticket.email,
            'plus_ones_count', v_ticket.plus_ones_count,
            'ticket_code', v_ticket.ticket_code
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
