import { db } from "./dbProvider";
import { AuditLog } from "@/types/database";
import { isLiveSupabaseConfigured, getSupabaseClient } from "./supabaseAdapter";

export interface LogActionParams {
  eventId?: string | null;
  actorId: string;
  actorEmail?: string | null;
  actorRole?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  oldValues?: Record<string, any> | null;
  newValues?: Record<string, any> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export class AuditService {
  public async log(params: LogActionParams): Promise<AuditLog> {
    const logEntry: AuditLog = {
      id: `AUDIT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      event_id: params.eventId || null,
      actor_id: params.actorId,
      actor_email: params.actorEmail || null,
      actor_role: params.actorRole || null,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId || null,
      old_values: params.oldValues || null,
      new_values: params.newValues || null,
      ip_address: params.ipAddress || null,
      user_agent: params.userAgent || null,
      created_at: new Date().toISOString(),
    };

    // 1. In-memory append
    db.auditLogs = db.auditLogs || [];
    db.auditLogs.unshift(logEntry);

    // 2. Sync to Supabase if configured
    if (isLiveSupabaseConfigured()) {
      try {
        const supabase = getSupabaseClient();
        await supabase.from("audit_logs").insert([
          {
            event_id: logEntry.event_id,
            actor_id: logEntry.actor_id,
            actor_email: logEntry.actor_email,
            actor_role: logEntry.actor_role,
            action: logEntry.action,
            resource_type: logEntry.resource_type,
            resource_id: logEntry.resource_id,
            old_values: logEntry.old_values,
            new_values: logEntry.new_values,
            ip_address: logEntry.ip_address,
            user_agent: logEntry.user_agent,
          },
        ]);
      } catch (err) {
        console.warn("Failed to persist audit log to Supabase:", err);
      }
    }

    return logEntry;
  }

  public async getLogs(eventId?: string, limit = 50): Promise<AuditLog[]> {
    db.auditLogs = db.auditLogs || [];
    let list = db.auditLogs;
    if (eventId) {
      list = list.filter((l) => l.event_id === eventId || !l.event_id);
    }
    return list.slice(0, limit);
  }
}

export const auditService = new AuditService();
