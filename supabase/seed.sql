-- ====================================================================
-- Production-Grade Seed Data for Local Development & Testing
-- ====================================================================

-- 1. Mock Profile (Organizer)
INSERT INTO profiles (id, email, full_name, avatar_url)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'organizer@craftconf.io',
    'Alex Rivera',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80'
) ON CONFLICT (id) DO NOTHING;

-- 2. Mock Event: Craft & Code Summit 2026
INSERT INTO events (
    id,
    created_by,
    title,
    slug,
    description,
    cover_image_url,
    start_date,
    end_date,
    timezone,
    location_name,
    location_address,
    is_published,
    max_capacity
) VALUES (
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'Craft & Code Summit 2026',
    'craft-and-code-summit-2026',
    'An intimate gathering of visionary founders, designers, and software craftspeople. Join us for keynote discussions, hands-on architectural breakouts, and an evening networking reception under the glass atrium.',
    'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&w=1600&q=80',
    NOW() + INTERVAL '14 days',
    NOW() + INTERVAL '14 days 6 hours',
    'America/San_Francisco',
    'The Foundry Atrium & Loft',
    '450 Mission Street, Suite 800, San Francisco, CA 94105',
    TRUE,
    150
) ON CONFLICT (id) DO NOTHING;

-- 3. Event Membership (Owner)
INSERT INTO event_members (id, event_id, user_id, role)
VALUES (
    'm0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    'owner'
) ON CONFLICT DO NOTHING;

-- 4. Event Settings
INSERT INTO event_settings (
    id,
    event_id,
    allow_guest_list_public,
    notify_host_on_rsvp,
    confirmation_email_enabled,
    checkin_pin,
    close_rsvp_at,
    is_rsvp_closed
) VALUES (
    's0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    FALSE,
    TRUE,
    TRUE,
    '7492',
    NOW() + INTERVAL '13 days',
    FALSE
) ON CONFLICT (event_id) DO NOTHING;

-- 5. RSVP Questions
-- Q1: Dietary Requirements (Single Choice)
INSERT INTO rsvp_questions (id, event_id, prompt, question_type, is_required, order_index)
VALUES (
    'q0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'Do you have any dietary restrictions?',
    'single_choice',
    TRUE,
    1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO rsvp_question_options (id, question_id, label, value, order_index) VALUES
('o0000000-0000-0000-0000-000000000001', 'q0000000-0000-0000-0000-000000000001', 'Standard / Omnivore', 'standard', 1),
('o0000000-0000-0000-0000-000000000002', 'q0000000-0000-0000-0000-000000000001', 'Vegetarian', 'vegetarian', 2),
('o0000000-0000-0000-0000-000000000003', 'q0000000-0000-0000-0000-000000000001', 'Vegan', 'vegan', 3),
('o0000000-0000-0000-0000-000000000004', 'q0000000-0000-0000-0000-000000000001', 'Gluten-Free', 'gluten_free', 4)
ON CONFLICT (id) DO NOTHING;

-- Q2: Company / Affiliation (Text)
INSERT INTO rsvp_questions (id, event_id, prompt, question_type, is_required, order_index)
VALUES (
    'q0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'What organization or company are you representing?',
    'text',
    FALSE,
    2
) ON CONFLICT (id) DO NOTHING;

-- Q3: Breakout Sessions of Interest (Multiple Choice)
INSERT INTO rsvp_questions (id, event_id, prompt, question_type, is_required, order_index)
VALUES (
    'q0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    'Which afternoon breakout tracks do you plan to join?',
    'multiple_choice',
    FALSE,
    3
) ON CONFLICT (id) DO NOTHING;

INSERT INTO rsvp_question_options (id, question_id, label, value, order_index) VALUES
('o0000000-0000-0000-0000-000000000005', 'q0000000-0000-0000-0000-000000000003', 'High-Performance Web Architecture', 'arch', 1),
('o0000000-0000-0000-0000-000000000006', 'q0000000-0000-0000-0000-000000000003', 'Design Systems & Micro-Interactions', 'design', 2),
('o0000000-0000-0000-0000-000000000007', 'q0000000-0000-0000-0000-000000000003', 'AI-Augmented Engineering Workflows', 'ai_eng', 3)
ON CONFLICT (id) DO NOTHING;

-- 6. Initial Seed Guests
-- Guest 1: Sophia Chen (Attending & Checked-in)
INSERT INTO guests (
    id, event_id, first_name, last_name, email, phone, status, plus_ones_allowed, plus_ones_count, qr_token, notes
) VALUES (
    'g0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'Sophia',
    'Chen',
    'sophia.chen@example.com',
    '+1 (415) 555-0192',
    'attending',
    1,
    1,
    'TOKEN-SC-78912',
    'Keynote speaker panelist'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO tickets (id, event_id, guest_id, ticket_code, qr_code_data, status)
VALUES (
    't0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    'g0000000-0000-0000-0000-000000000001',
    'TK-SC-78912',
    'RSVP:e0000000-0000-0000-0000-000000000001:TOKEN-SC-78912',
    'used'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO checkins (id, event_id, ticket_id, guest_id, checked_in_by, checkin_time, checkin_method)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'e0000000-0000-0000-0000-000000000001',
    't0000000-0000-0000-0000-000000000001',
    'g0000000-0000-0000-0000-000000000001',
    'a0000000-0000-0000-0000-000000000001',
    NOW() - INTERVAL '15 minutes',
    'qr_scan'
) ON CONFLICT (ticket_id) DO NOTHING;

-- Guest 2: Marcus Vance (Attending, Not yet checked-in)
INSERT INTO guests (
    id, event_id, first_name, last_name, email, phone, status, plus_ones_allowed, plus_ones_count, qr_token, notes
) VALUES (
    'g0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'Marcus',
    'Vance',
    'marcus.vance@example.com',
    '+1 (415) 555-0843',
    'attending',
    0,
    0,
    'TOKEN-MV-33421',
    NULL
) ON CONFLICT (id) DO NOTHING;

INSERT INTO tickets (id, event_id, guest_id, ticket_code, qr_code_data, status)
VALUES (
    't0000000-0000-0000-0000-000000000002',
    'e0000000-0000-0000-0000-000000000001',
    'g0000000-0000-0000-0000-000000000002',
    'TK-MV-33421',
    'RSVP:e0000000-0000-0000-0000-000000000001:TOKEN-MV-33421',
    'valid'
) ON CONFLICT (id) DO NOTHING;

-- Guest 3: Elena Rostova (Pending RSVP)
INSERT INTO guests (
    id, event_id, first_name, last_name, email, phone, status, plus_ones_allowed, plus_ones_count, qr_token, notes
) VALUES (
    'g0000000-0000-0000-0000-000000000003',
    'e0000000-0000-0000-0000-000000000001',
    'Elena',
    'Rostova',
    'elena.rostova@example.com',
    '+1 (650) 555-0144',
    'pending',
    0,
    0,
    'TOKEN-ER-91823',
    NULL
) ON CONFLICT (id) DO NOTHING;

-- Guest 4: David Kim (Declined)
INSERT INTO guests (
    id, event_id, first_name, last_name, email, phone, status, plus_ones_allowed, plus_ones_count, qr_token, notes
) VALUES (
    'g0000000-0000-0000-0000-000000000004',
    'e0000000-0000-0000-0000-000000000001',
    'David',
    'Kim',
    'david.kim@example.com',
    '+1 (408) 555-0167',
    'declined',
    0,
    0,
    'TOKEN-DK-55612',
    'Traveling abroad during summit dates'
) ON CONFLICT (id) DO NOTHING;

-- Guest 5: Olivia Sterling (Invited)
INSERT INTO guests (
    id, event_id, first_name, last_name, email, phone, status, plus_ones_allowed, plus_ones_count, qr_token, notes
) VALUES (
    'g0000000-0000-0000-0000-000000000005',
    'e0000000-0000-0000-0000-000000000001',
    'Olivia',
    'Sterling',
    'olivia.sterling@example.com',
    '+1 (212) 555-0988',
    'invited',
    1,
    0,
    'TOKEN-OS-66782',
    NULL
) ON CONFLICT (id) DO NOTHING;
