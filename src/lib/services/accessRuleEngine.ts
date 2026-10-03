import { db } from "./dbProvider";
import {
  AccessDecisionResult,
  Guest,
  ScanLog,
  ScanType,
  ScanResult,
  EventPassType,
  EventFoodCategory,
  EventGate,
  EventArea,
} from "@/types/database";
import { auditService } from "./auditService";
import { isLiveSupabaseConfigured, getSupabaseClient } from "./supabaseAdapter";

export interface VerifyAccessInput {
  eventId: string;
  codeOrToken: string;
  checkpointType: "gate" | "area" | "section" | "food";
  checkpointId?: string;
  checkpointName?: string;
  scanType: ScanType;
  employeeId?: string;
  deviceInfo?: string;
}

export class AccessRuleEngine {
  public async verifyAndProcess(input: VerifyAccessInput): Promise<AccessDecisionResult> {
    const rawCode = (input.codeOrToken || "").trim();
    const cleanCode = rawCode.startsWith("RSVP:") ? rawCode.split(":")[2] || rawCode : rawCode;
    const now = new Date().toISOString();

    // 1. Locate Guest & Ticket
    db.guests = db.guests || [];
    db.tickets = db.tickets || [];
    db.scanLogs = db.scanLogs || [];

    const guest = db.guests.find(
      (g) =>
        (g.qr_token && g.qr_token.toLowerCase() === cleanCode.toLowerCase()) ||
        (g.id && g.id.toLowerCase() === cleanCode.toLowerCase()) ||
        (g.email && g.email.toLowerCase() === cleanCode.toLowerCase())
    );

    // Helper to log and return denial
    const deny = async (reason: string, targetGuest?: Guest): Promise<AccessDecisionResult> => {
      const scanLog: ScanLog = {
        id: `SCAN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        event_id: input.eventId,
        guest_id: targetGuest?.id || null,
        employee_id: input.employeeId || null,
        gate_id: input.checkpointType === "gate" ? input.checkpointId : null,
        area_id: input.checkpointType === "area" ? input.checkpointId : null,
        food_category_id: input.checkpointType === "food" ? input.checkpointId : null,
        scan_type: input.scanType,
        result: "DENIED",
        denial_reason: reason,
        scanned_code: rawCode,
        device_info: input.deviceInfo || null,
        scanned_at: now,
      };
      db.scanLogs.unshift(scanLog);

      await auditService.log({
        eventId: input.eventId,
        actorId: input.employeeId || "terminal",
        actorRole: "employee",
        action: "scan.denied",
        resourceType: "scan_log",
        resourceId: scanLog.id,
        newValues: { reason, code: rawCode, checkpoint: input.checkpointName },
      });

      return {
        allowed: false,
        result: "DENIED",
        reason,
        scan_type: input.scanType,
        guest: targetGuest,
        checkpoint_name: input.checkpointName || input.checkpointType,
        timestamp: now,
      };
    };

    // Rule Check 1: Guest Existence
    if (!guest) {
      return deny("Invalid Ticket or QR Token. No attendee found matching this code.");
    }

    // Rule Check 2: Event Scoping (Event A code must NEVER work for Event B)
    const isEventMatch =
      guest.event_id === input.eventId ||
      guest.event_id.toLowerCase() === input.eventId.toLowerCase();

    if (!isEventMatch) {
      return deny("WRONG EVENT: This ticket is issued for a completely different event.", guest);
    }

    // Rule Check 3: Blocked Status
    if (guest.is_blocked || guest.status === "blocked") {
      return deny(
        `ACCESS DENIED: Attendee is blocked by event organizers. ${guest.blocked_reason ? `Reason: ${guest.blocked_reason}` : ""}`,
        guest
      );
    }

    // Rule Check 4: RSVP Status
    if (guest.status === "declined" || guest.status === "cancelled") {
      return deny("ACCESS DENIED: Attendee registration is marked as declined or cancelled.", guest);
    }
    if (guest.status === "pending_approval" || guest.status === "waitlisted") {
      return deny("ACCESS DENIED: Registration is pending host screening and has not been approved.", guest);
    }

    // Rule Check 5: Resolve Pass Type
    db.eventPassTypes = db.eventPassTypes || [];
    const passType =
      db.eventPassTypes.find((p) => p.id === guest.pass_type_id) ||
      db.eventPassTypes.find((p) => p.event_id === input.eventId) || {
        id: "DEFAULT-PASS",
        event_id: input.eventId,
        name: guest.tier_name || "General Admission",
        price: 0,
        badge_color: "sky",
        is_active: true,
      };

    // Rule Check 6: Checkpoint Access Rules
    db.eventAccessRules = db.eventAccessRules || [];
    const rules = db.eventAccessRules.filter(
      (r) =>
        (r.event_id === input.eventId || r.event_id === guest.event_id) &&
        r.pass_type_id === passType.id
    );

    if (input.checkpointType === "gate" && input.checkpointId && rules.length > 0) {
      const gateRule = rules.find((r) => r.gate_id === input.checkpointId);
      if (gateRule && !gateRule.is_allowed) {
        return deny(`ACCESS DENIED: ${passType.name} is not authorized for entry through this gate.`, guest);
      }
    }

    if (input.checkpointType === "area" && input.checkpointId && rules.length > 0) {
      const areaRule = rules.find((r) => r.area_id === input.checkpointId);
      if (areaRule && !areaRule.is_allowed) {
        return deny(`ACCESS DENIED: ${passType.name} does not have access permissions for this exclusive area.`, guest);
      }
    }

    // Rule Check 7: Food Redemption
    let foodCategory: EventFoodCategory | undefined;
    if (input.checkpointType === "food" || input.scanType === "food_redemption") {
      db.eventFoodCategories = db.eventFoodCategories || [];
      db.guestFoodEntitlements = db.guestFoodEntitlements || [];

      foodCategory =
        db.eventFoodCategories.find((f) => f.id === input.checkpointId) ||
        db.eventFoodCategories.find((f) => f.event_id === input.eventId) ||
        db.eventFoodCategories[0];

      let entitlement = db.guestFoodEntitlements.find(
        (e) => e.guest_id === guest.id && (foodCategory ? e.food_category_id === foodCategory.id : true)
      );

      if (!entitlement) {
        // Create standard entitlement on the fly
        entitlement = {
          id: `ENT-${Date.now().toString(36)}`,
          event_id: input.eventId,
          guest_id: guest.id,
          food_category_id: foodCategory?.id || "FOOD-DEFAULT",
          total_allowed: passType.name.toLowerCase().includes("vip") ? 2 : 1,
          redeemed_count: 0,
        };
        db.guestFoodEntitlements.push(entitlement);
      }

      if (entitlement.redeemed_count >= entitlement.total_allowed) {
        return deny(
          `MEAL VOUCHER EXHAUSTED: Attendee has already redeemed all ${entitlement.total_allowed} meal allocations.`,
          guest
        );
      }

      // Decrement entitlement
      entitlement.redeemed_count += 1;
      if (foodCategory) {
        foodCategory.redeemed_count = (foodCategory.redeemed_count || 0) + 1;
      }
    }

    // Rule Check 8: Exit vs Entry State Tracking
    if (input.scanType === "exit") {
      guest.is_inside = false;
      guest.checked_out_count = (guest.checked_out_count || 0) + 1;
    } else if (input.scanType === "entry" || input.scanType === "re_entry") {
      guest.is_inside = true;
      guest.checked_in_count = (guest.checked_in_count || 0) + 1;

      // Also append checkin record
      db.checkins = db.checkins || [];
      const ticket = db.tickets.find((t) => t.guest_id === guest.id) || {
        id: `${guest.id}-TK`,
        event_id: input.eventId,
        guest_id: guest.id,
        ticket_code: guest.qr_token,
        qr_code_data: `RSVP:${input.eventId}:${guest.qr_token}`,
        status: "used" as const,
        issued_at: now,
        created_at: now,
      };

      db.checkins.push({
        id: `CHK-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
        event_id: input.eventId,
        ticket_id: ticket.id,
        guest_id: guest.id,
        checked_in_by: input.employeeId || "terminal",
        checkin_time: now,
        checkin_method: "qr_scan",
        checkpoint: input.checkpointName || "Main Entrance Gate",
        gate_user_id: input.employeeId || "GATE-STAFF",
        created_at: now,
      });
    }

    // Success scan log entry
    const successLog: ScanLog = {
      id: `SCAN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      event_id: input.eventId,
      guest_id: guest.id,
      employee_id: input.employeeId || null,
      gate_id: input.checkpointType === "gate" ? input.checkpointId : null,
      area_id: input.checkpointType === "area" ? input.checkpointId : null,
      food_category_id: input.checkpointType === "food" ? input.checkpointId : null,
      scan_type: input.scanType,
      result: "ALLOWED",
      denial_reason: null,
      scanned_code: rawCode,
      device_info: input.deviceInfo || null,
      scanned_at: now,
    };
    db.scanLogs.unshift(successLog);

    let allowReason = "ACCESS GRANTED";
    if (input.scanType === "exit") {
      allowReason = "CHECK-OUT SUCCESSFUL. Thank you for attending!";
    } else if (input.scanType === "food_redemption" || input.checkpointType === "food") {
      allowReason = `MEAL VOUCHER VERIFIED & REDEEMED (${foodCategory?.name || "Standard Meal"})`;
    } else {
      allowReason = `ACCESS GRANTED (${passType.name} • ${input.checkpointName || "Checkpoint"})`;
    }

    return {
      allowed: true,
      result: "ALLOWED",
      reason: allowReason,
      scan_type: input.scanType,
      guest,
      pass: passType,
      food: foodCategory,
      checkpoint_name: input.checkpointName || input.checkpointType,
      timestamp: now,
    };
  }
}

export const accessRuleEngine = new AccessRuleEngine();
