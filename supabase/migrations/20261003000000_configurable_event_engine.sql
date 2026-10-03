-- ====================================================================
-- Configurable Event Operations, Access Control, and Payments Schema
-- Migration: 20261003000000_configurable_event_engine.sql
-- ====================================================================

-- 1. Roles & Permissions System
CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY, -- 'admin', 'manager', 'client', 'employee'
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO roles (id, name, description) VALUES
    ('admin', 'Platform Administrator', 'Complete platform and financial access'),
    ('manager', 'Event Operations Manager', 'Operational oversight across assigned events; strictly no financial access'),
    ('client', 'Event Client / Host', 'Creator and owner of events; full event-level management and own event financials'),
    ('employee', 'Field Staff / Operator', 'On-ground operational scanner and gate/area checkpoint operator')
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    role_id TEXT NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, role_id)
);

CREATE INDEX IF NOT EXISTS idx_user_roles_user ON user_roles(user_id);

-- 2. Event Modules Configuration
-- Possible modules: 'rsvp', 'guest_management', 'qr_entry', 'gates', 'areas', 'sections',
--                   'food', 'passes', 'seating', 'paid_entry', 'parking', 'staff_checkin', 'analytics'
CREATE TABLE IF NOT EXISTS event_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    module_key TEXT NOT NULL,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (event_id, module_key)
);

CREATE INDEX IF NOT EXISTS idx_event_modules_event ON event_modules(event_id);

-- 3. Gates / Entry & Exit Checkpoints
CREATE TABLE IF NOT EXISTS event_gates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gate_type TEXT NOT NULL CHECK (gate_type IN ('entry', 'exit', 'bidirectional')) DEFAULT 'entry',
    code TEXT,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_gates_event ON event_gates(event_id);

-- 4. Areas / Zones (General, VIP Lounge, VVIP Lounge, Conference Hall, etc.)
CREATE TABLE IF NOT EXISTS event_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    area_type TEXT NOT NULL DEFAULT 'general', -- 'general', 'vip', 'vvip', 'backstage', 'dining', etc.
    capacity INTEGER,
    current_occupancy INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_areas_event ON event_areas(event_id);

-- 5. Sections / Sub-areas (Section A, Section B, Balcony, Front Row, etc.)
CREATE TABLE IF NOT EXISTS event_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    area_id UUID REFERENCES event_areas(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    capacity INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_sections_event ON event_sections(event_id);

-- 6. Pass Types (General, VIP, VVIP, Staff, Speaker, Media, etc.)
CREATE TABLE IF NOT EXISTS event_pass_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    code TEXT,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    quota INTEGER,
    issued_count INTEGER NOT NULL DEFAULT 0,
    badge_color TEXT NOT NULL DEFAULT 'sky',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_pass_types_event ON event_pass_types(event_id);

-- 7. Food Categories & Entitlements
CREATE TABLE IF NOT EXISTS event_food_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- 'Standard Meal', 'VIP Banquet', 'Snacks & Beverages', etc.
    dietary_info TEXT,  -- 'Veg', 'Non-Veg', 'Halal', 'Jain', 'Vegan', etc.
    total_quota INTEGER,
    redeemed_count INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_food_categories_event ON event_food_categories(event_id);

-- 8. Access Rules (Pass Type -> Gates, Areas, Sections, Food)
CREATE TABLE IF NOT EXISTS event_access_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    pass_type_id UUID NOT NULL REFERENCES event_pass_types(id) ON DELETE CASCADE,
    gate_id UUID REFERENCES event_gates(id) ON DELETE CASCADE,
    area_id UUID REFERENCES event_areas(id) ON DELETE CASCADE,
    section_id UUID REFERENCES event_sections(id) ON DELETE CASCADE,
    food_category_id UUID REFERENCES event_food_categories(id) ON DELETE CASCADE,
    is_allowed BOOLEAN NOT NULL DEFAULT TRUE,
    usage_limit INTEGER, -- null = unlimited, 1 = single-use, etc.
    time_start TIMESTAMPTZ,
    time_end TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_access_rules_lookup ON event_access_rules(event_id, pass_type_id);

-- 9. Event Staff Assignments (Manager & Employees)
CREATE TABLE IF NOT EXISTS event_staff_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    staff_user_id TEXT, -- e.g. "GBH-dec-2026-GATE-01" for hardware terminal logins
    role_type TEXT NOT NULL CHECK (role_type IN ('manager', 'employee')),
    assigned_gate_id UUID REFERENCES event_gates(id) ON DELETE SET NULL,
    assigned_area_id UUID REFERENCES event_areas(id) ON DELETE SET NULL,
    assigned_food_id UUID REFERENCES event_food_categories(id) ON DELETE SET NULL,
    can_checkin BOOLEAN NOT NULL DEFAULT TRUE,
    can_checkout BOOLEAN NOT NULL DEFAULT TRUE,
    can_manage_food BOOLEAN NOT NULL DEFAULT TRUE,
    can_add_guests BOOLEAN NOT NULL DEFAULT FALSE,
    can_block_guests BOOLEAN NOT NULL DEFAULT FALSE,
    passcode TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_event_staff_assignments_event ON event_staff_assignments(event_id);

-- 10. Update Guests Table to support Pass Types, Food Entitlements, and Statuses
ALTER TABLE guests ADD COLUMN IF NOT EXISTS pass_type_id UUID REFERENCES event_pass_types(id) ON DELETE SET NULL;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS food_category_id UUID REFERENCES event_food_categories(id) ON DELETE SET NULL;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS qr_token_hash TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS blocked_reason TEXT;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS blocked_at TIMESTAMPTZ;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS checked_in_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS checked_out_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS is_inside BOOLEAN NOT NULL DEFAULT FALSE;

-- 11. Guest Food Entitlements (Per-guest voucher balances)
CREATE TABLE IF NOT EXISTS guest_food_entitlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id UUID NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
    food_category_id UUID NOT NULL REFERENCES event_food_categories(id) ON DELETE CASCADE,
    total_allowed INTEGER NOT NULL DEFAULT 1,
    redeemed_count INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (guest_id, food_category_id)
);

CREATE INDEX IF NOT EXISTS idx_guest_food_entitlements_lookup ON guest_food_entitlements(event_id, guest_id);

-- 12. Scan Logs (Immutable ledger of all access attempts)
CREATE TABLE IF NOT EXISTS scan_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    employee_id TEXT, -- User ID or Staff ID
    gate_id UUID REFERENCES event_gates(id) ON DELETE SET NULL,
    area_id UUID REFERENCES event_areas(id) ON DELETE SET NULL,
    section_id UUID REFERENCES event_sections(id) ON DELETE SET NULL,
    food_category_id UUID REFERENCES event_food_categories(id) ON DELETE SET NULL,
    scan_type TEXT NOT NULL CHECK (scan_type IN ('entry', 'exit', 're_entry', 'area_access', 'food_redemption')),
    result TEXT NOT NULL CHECK (result IN ('ALLOWED', 'DENIED')),
    denial_reason TEXT,
    scanned_code TEXT NOT NULL,
    device_info TEXT,
    scanned_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scan_logs_event_time ON scan_logs(event_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_scan_logs_guest ON scan_logs(guest_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_gate ON scan_logs(gate_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_area ON scan_logs(area_id);

-- 13. Financial Ledger & Razorpay Payments
CREATE TABLE IF NOT EXISTS payment_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    client_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    guest_id UUID REFERENCES guests(id) ON DELETE SET NULL,
    pass_type_id UUID REFERENCES event_pass_types(id) ON DELETE SET NULL,
    razorpay_order_id TEXT NOT NULL UNIQUE,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    platform_fee NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('created', 'attempted', 'paid', 'failed', 'refunded')) DEFAULT 'created',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_event ON payment_orders(event_id);
CREATE INDEX IF NOT EXISTS idx_payment_orders_rzp ON payment_orders(razorpay_order_id);

CREATE TABLE IF NOT EXISTS payment_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES payment_orders(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    razorpay_payment_id TEXT NOT NULL UNIQUE,
    razorpay_signature TEXT,
    amount NUMERIC(10, 2) NOT NULL,
    currency TEXT NOT NULL DEFAULT 'INR',
    method TEXT,
    status TEXT NOT NULL CHECK (status IN ('captured', 'failed', 'refunded')),
    error_code TEXT,
    error_description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transactions_event ON payment_transactions(event_id);

-- 14. Payout Requests & Settlements (Client withdrawals after event completion)
CREATE TABLE IF NOT EXISTS payout_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount NUMERIC(10, 2) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'processing', 'paid', 'rejected')) DEFAULT 'pending',
    bank_account_holder TEXT,
    bank_account_number_masked TEXT,
    bank_ifsc TEXT,
    admin_notes TEXT,
    processed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_payout_requests_event ON payout_requests(event_id);
CREATE INDEX IF NOT EXISTS idx_payout_requests_client ON payout_requests(client_id);

-- 15. Immutable Platform & Event Audit Logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    actor_id TEXT NOT NULL,
    actor_email TEXT,
    actor_role TEXT,
    action TEXT NOT NULL, -- e.g. 'auth.login', 'event.config_update', 'guest.block', 'scan.override', 'payout.request', 'payout.approve'
    resource_type TEXT NOT NULL,
    resource_id TEXT,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_event ON audit_logs(event_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- ====================================================================
-- SEED DEFAULT MODULES & STRUCTURE FOR EXISTING EVENTS
-- ====================================================================
DO $$
DECLARE
    r RECORD;
    v_gate_id UUID;
    v_area_gen_id UUID;
    v_area_vip_id UUID;
    v_pass_ga_id UUID;
    v_pass_vip_id UUID;
    v_food_std_id UUID;
    v_food_vip_id UUID;
BEGIN
    FOR r IN SELECT id FROM events LOOP
        -- Default enabled modules
        INSERT INTO event_modules (event_id, module_key, is_enabled) VALUES
            (r.id, 'rsvp', TRUE),
            (r.id, 'guest_management', TRUE),
            (r.id, 'qr_entry', TRUE),
            (r.id, 'gates', TRUE),
            (r.id, 'areas', TRUE),
            (r.id, 'food', TRUE),
            (r.id, 'passes', TRUE),
            (r.id, 'analytics', TRUE)
        ON CONFLICT (event_id, module_key) DO NOTHING;

        -- Default Gates
        INSERT INTO event_gates (event_id, name, gate_type, code) VALUES
            (r.id, 'Main Gate Entrance', 'bidirectional', 'GATE-MAIN'),
            (r.id, 'VIP Exclusive Gate', 'entry', 'GATE-VIP')
        ON CONFLICT DO NOTHING;

        -- Default Areas
        INSERT INTO event_areas (event_id, name, area_type, capacity) VALUES
            (r.id, 'General Hall', 'general', 300),
            (r.id, 'VIP Executive Lounge', 'vip', 50)
        ON CONFLICT DO NOTHING;

        -- Default Pass Types
        INSERT INTO event_pass_types (event_id, name, code, price, quota, badge_color) VALUES
            (r.id, 'General Admission', 'GA', 0.00, 300, 'sky'),
            (r.id, 'VIP All-Access Pass', 'VIP', 0.00, 50, 'violet')
        ON CONFLICT DO NOTHING;

        -- Default Food Categories
        INSERT INTO event_food_categories (event_id, name, dietary_info, total_quota) VALUES
            (r.id, 'General Lunch & Refreshment', 'Veg / Standard', 300),
            (r.id, 'VIP Executive Banquet', 'Multi-Cuisine Buffet', 50)
        ON CONFLICT DO NOTHING;
    END LOOP;
END $$;
