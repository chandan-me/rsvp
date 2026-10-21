-- ====================================================================
-- Production Security Hardening: Row Level Security (RLS) Policies
-- Migration: 20261005000000_enable_rls_security_hardening.sql
-- Protects configurable modules, gates, areas, rules, scan logs, and financial tables
-- ====================================================================

-- 1. Enable Row Level Security on all Event Operations & Engine Tables
ALTER TABLE IF EXISTS event_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_gates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_pass_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_food_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_access_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_staff_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS guest_food_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payment_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS audit_logs ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies if any
DROP POLICY IF EXISTS "Public can view active pass types for published events" ON event_pass_types;
DROP POLICY IF EXISTS "Event owners have full access to pass types" ON event_pass_types;
DROP POLICY IF EXISTS "Staff can view pass types for assigned events" ON event_pass_types;

DROP POLICY IF EXISTS "Event owners have full access to event modules" ON event_modules;
DROP POLICY IF EXISTS "Staff can view event modules for assigned events" ON event_modules;

DROP POLICY IF EXISTS "Event owners have full access to event gates" ON event_gates;
DROP POLICY IF EXISTS "Staff can view event gates for assigned events" ON event_gates;

DROP POLICY IF EXISTS "Event owners have full access to event areas" ON event_areas;
DROP POLICY IF EXISTS "Staff can view event areas for assigned events" ON event_areas;

DROP POLICY IF EXISTS "Event owners have full access to scan logs" ON scan_logs;
DROP POLICY IF EXISTS "Staff can insert scan logs" ON scan_logs;
DROP POLICY IF EXISTS "Staff can view scan logs for assigned events" ON scan_logs;

DROP POLICY IF EXISTS "Event owners can view their payment orders" ON payment_orders;
DROP POLICY IF EXISTS "Event owners can view their payment transactions" ON payment_transactions;
DROP POLICY IF EXISTS "Event owners can view and create payout requests" ON payout_requests;

DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;
DROP POLICY IF EXISTS "Service role can insert audit logs" ON audit_logs;

-- 3. PASS TYPES POLICIES
CREATE POLICY "Public can view active pass types for published events"
    ON event_pass_types FOR SELECT
    USING (
        event_id IN (SELECT id FROM events WHERE is_published = TRUE)
    );

CREATE POLICY "Event owners have full access to pass types"
    ON event_pass_types FOR ALL
    USING (
        event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    )
    WITH CHECK (
        event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    );

-- 4. MODULES & INFRASTRUCTURE POLICIES
CREATE POLICY "Event owners have full access to event modules"
    ON event_modules FOR ALL
    USING (
        event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    );

CREATE POLICY "Staff can view event modules for assigned events"
    ON event_modules FOR SELECT
    USING (
        event_id IN (SELECT event_id FROM event_staff_assignments WHERE user_id = auth.uid())
    );

CREATE POLICY "Event owners have full access to event gates"
    ON event_gates FOR ALL
    USING (
        event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    );

CREATE POLICY "Staff can view event gates for assigned events"
    ON event_gates FOR SELECT
    USING (
        event_id IN (SELECT event_id FROM event_staff_assignments WHERE user_id = auth.uid())
    );

CREATE POLICY "Event owners have full access to event areas"
    ON event_areas FOR ALL
    USING (
        event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    );

CREATE POLICY "Staff can view event areas for assigned events"
    ON event_areas FOR SELECT
    USING (
        event_id IN (SELECT event_id FROM event_staff_assignments WHERE user_id = auth.uid())
    );

-- 5. SCAN LOGS POLICIES (Audit trail)
CREATE POLICY "Event owners have full access to scan logs"
    ON scan_logs FOR SELECT
    USING (
        event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    );

CREATE POLICY "Staff can insert scan logs"
    ON scan_logs FOR INSERT
    WITH CHECK (
        event_id IN (SELECT event_id FROM event_staff_assignments WHERE user_id = auth.uid())
        OR event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    );

CREATE POLICY "Staff can view scan logs for assigned events"
    ON scan_logs FOR SELECT
    USING (
        event_id IN (SELECT event_id FROM event_staff_assignments WHERE user_id = auth.uid())
    );

-- 6. FINANCIAL PRIVACY POLICIES (Manager & Employee access strictly denied)
CREATE POLICY "Event owners can view their payment orders"
    ON payment_orders FOR SELECT
    USING (
        event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    );

CREATE POLICY "Event owners can view their payment transactions"
    ON payment_transactions FOR SELECT
    USING (
        order_id IN (
            SELECT id FROM payment_orders WHERE event_id IN (
                SELECT id FROM events WHERE created_by = auth.uid()
            )
        )
    );

CREATE POLICY "Event owners can view and create payout requests"
    ON payout_requests FOR ALL
    USING (
        client_id = auth.uid()
        OR event_id IN (SELECT id FROM events WHERE created_by = auth.uid())
    );

-- 7. AUDIT LOGS POLICIES
CREATE POLICY "Admins can view audit logs"
    ON audit_logs FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
        )
    );

CREATE POLICY "Service role can insert audit logs"
    ON audit_logs FOR INSERT
    WITH CHECK (true);
