import { db } from "./dbProvider";
import {
  AccessDecisionResult,
  Guest,
  ScanLog,
  ScanType,
  EventFoodCategory,
} from "@/types/database";
import { auditService } from "./auditService";

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

    // Rule Check 0: Cross-Event Token Tampering Check
    if (rawCode.startsWith("RSVP:")) {
      const parts = rawCode.split(":");
      const boundEventId = parts[1];
      if (boundEventId && boundEventId !== input.eventId && boundEventId.toLowerCase() !== input.eventId.toLowerCase()) {
        return deny(
          `SECURITY TAMPER ALERT: QR token signature is bound to another event (${boundEventId}). Entry rejected.`
        );
      }
    }

    // Rule Check 0.5: Rapid Replay & Double-Scan Debounce (10-second window)
    const recentDuplicateScan = db.scanLogs.find(
      (l) =>
        l.event_id === input.eventId &&
        l.scanned_code.toLowerCase() === rawCode.toLowerCase() &&
        Math.abs(new Date(now).getTime() - new Date(l.scanned_at).getTime()) < 10000
    );
    if (recentDuplicateScan) {
      const elapsedSec = Math.max(1, Math.round((new Date(now).getTime() - new Date(recentDuplicateScan.scanned_at).getTime()) / 1000));
      return deny(
        `DUPLICATE SCAN BLOCKED: Ticket was scanned just ${elapsedSec}s ago. Please wait 10 seconds before re-scanning.`,
        guest
      );
    }

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

    // Rule Check 2.5: Anti-Passback Protection (Entry when already inside)
    if (input.scanType === "entry" && guest.is_inside) {
      return deny(
        "ANTI-PASSBACK VIOLATION: Attendee is already recorded as INSIDE the venue. Entry denied. If the attendee stepped outside, an EXIT scan must be recorded first.",
        guest
      );
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

  public async getScanLogs(
    eventId: string,
    options?: { limit?: number; result?: string; checkpointId?: string }
  ): Promise<{
    logs: (ScanLog & {
      guest_name?: string;
      guest_email?: string;
      tier_name?: string;
      seating_assignment?: string;
    })[];
    total: number;
  }> {
    db.scanLogs = db.scanLogs || [];
    let list = db.scanLogs.filter(
      (l) => l.event_id === eventId || l.event_id.toLowerCase() === eventId.toLowerCase()
    );

    if (options?.result && options.result !== "all") {
      list = list.filter((l) => l.result.toLowerCase() === options.result?.toLowerCase());
    }

    if (options?.checkpointId && options.checkpointId !== "all") {
      list = list.filter(
        (l) =>
          l.gate_id === options.checkpointId ||
          l.area_id === options.checkpointId ||
          l.food_category_id === options.checkpointId
      );
    }

    const populated = list.map((l) => {
      const guest = l.guest_id ? db.guests.find((g) => g.id === l.guest_id) : undefined;
      return {
        ...l,
        guest_name: guest ? `${guest.first_name} ${guest.last_name}`.trim() : "Unknown Attendee",
        guest_email: guest?.email,
        tier_name: guest?.tier_name || "General Admission",
        seating_assignment: guest?.seating_assignment || undefined,
      };
    });

    const limit = options?.limit || 100;
    return {
      logs: populated.slice(0, limit),
      total: populated.length,
    };
  }

  public async getHeadcountStats(eventId: string): Promise<{
    totalGuests: number;
    checkedInCount: number;
    currentlyInside: number;
    currentlyOutside: number;
    totalScans: number;
    allowedScans: number;
    deniedScans: number;
    mealsRedeemed: number;
  }> {
    db.guests = db.guests || [];
    db.scanLogs = db.scanLogs || [];

    const eventGuests = db.guests.filter((g) => g.event_id === eventId);
    const eventScans = db.scanLogs.filter((l) => l.event_id === eventId);

    const checkedInCount = eventGuests.filter((g) => (g.checked_in_count || 0) > 0).length;
    const currentlyInside = eventGuests.filter((g) => g.is_inside).length;
    const currentlyOutside = eventGuests.length - currentlyInside;

    const allowedScans = eventScans.filter((s) => s.result === "ALLOWED").length;
    const deniedScans = eventScans.filter((s) => s.result === "DENIED").length;
    const mealsRedeemed = eventScans.filter((s) => s.scan_type === "food_redemption" && s.result === "ALLOWED").length;

    return {
      totalGuests: eventGuests.length,
      checkedInCount,
      currentlyInside,
      currentlyOutside,
      totalScans: eventScans.length,
      allowedScans,
      deniedScans,
      mealsRedeemed,
    };
  }
}

export const accessRuleEngine = new AccessRuleEngine();
