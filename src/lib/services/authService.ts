import { NextRequest } from "next/server";
import { db } from "./dbProvider";
import { Profile, UserRoleType } from "@/types/database";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRoleType;
  assignedEventIds: string[];
}

export class AuthService {
  /**
   * Resolves the current user from headers, cookies, or authorization tokens.
   */
  public async getSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
    // 1. Check custom user-id header (for API calls or tests)
    const headerUserId = req.headers.get("x-user-id");
    const headerRole = req.headers.get("x-user-role") as UserRoleType | null;

    db.profiles = db.profiles || [];

    if (headerUserId) {
      const profile = db.profiles.find((p) => p.id === headerUserId || p.email === headerUserId);
      if (profile) {
        return {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name || profile.email,
          role: (headerRole || profile.role || "client") as UserRoleType,
          assignedEventIds: this.getAssignedEvents(profile.id),
        };
      }
    }

    // 2. Check for cookie / session token
    const cookieUser = req.cookies.get("rsvp_session_user")?.value;
    if (cookieUser) {
      try {
        const parsed = JSON.parse(decodeURIComponent(cookieUser));
        return {
          id: parsed.id,
          email: parsed.email,
          fullName: parsed.full_name || parsed.email,
          role: (parsed.role || "client") as UserRoleType,
          assignedEventIds: this.getAssignedEvents(parsed.id),
        };
      } catch {
        // invalid cookie
      }
    }

    // 3. Fallback to registered profile or dynamic local admin
    const defaultAdmin = db.profiles[0];
    if (defaultAdmin) {
      return {
        id: defaultAdmin.id,
        email: defaultAdmin.email,
        fullName: defaultAdmin.full_name || "Platform Admin",
        role: (defaultAdmin.role || "admin") as UserRoleType,
        assignedEventIds: (db.events || []).map((e) => e.id),
      };
    }

    return {
      id: "DYNAMIC-ADMIN",
      email: "admin@platform.local",
      fullName: "Dynamic Admin",
      role: "admin" as UserRoleType,
      assignedEventIds: (db.events || []).map((e) => e.id),
    };
  }

  private getAssignedEvents(userId: string): string[] {
    const list = new Set<string>();
    // Event owner / client
    db.events.forEach((e) => {
      if (e.created_by === userId || e.client_id === userId) {
        list.add(e.id);
      }
    });
    // Staff assignments
    db.eventStaffAssignments.forEach((s) => {
      if (s.user_id === userId || s.staff_user_id === userId) {
        list.add(s.event_id);
      }
    });
    return Array.from(list);
  }

  /**
   * Enforces event-level authorization. Default: DENY.
   */
  public async authorizeEvent(
    user: AuthenticatedUser | null,
    eventId: string,
    minimumRole?: UserRoleType
  ): Promise<{ authorized: boolean; error?: string; status: number }> {
    if (!user) {
      return { authorized: false, error: "Authentication required. Please log in.", status: 401 };
    }

    // ADMIN has global access across all events
    if (user.role === "admin") {
      return { authorized: true, status: 200 };
    }

    // Role level check
    if (minimumRole) {
      const hierarchy: Record<UserRoleType, number> = {
        admin: 4,
        manager: 3,
        client: 2,
        employee: 1,
      };
      if (hierarchy[user.role] < hierarchy[minimumRole]) {
        return {
          authorized: false,
          error: `Access Denied: Requires minimum role of ${minimumRole}.`,
          status: 403,
        };
      }
    }

    // Event isolation check (Anti-IDOR)
    const normEventId = eventId;
    const isDirectMatch =
      user.assignedEventIds.includes(normEventId) ||
      user.assignedEventIds.some((id) => id.toLowerCase() === normEventId.toLowerCase());

    if (!isDirectMatch) {
      return {
        authorized: false,
        error: "ACCESS DENIED: You do not have permission to view or manage this event.",
        status: 403,
      };
    }

    return { authorized: true, status: 200 };
  }

  /**
   * Financial isolation guard: Managers and Employees must NEVER receive financial data.
   */
  public assertFinancialAccess(user: AuthenticatedUser | null): { allowed: boolean; error?: string } {
    if (!user) {
      return { allowed: false, error: "Authentication required" };
    }
    if (user.role === "manager" || user.role === "employee") {
      return {
        allowed: false,
        error: "FORBIDDEN: Operations managers and field employees are strictly prohibited from viewing financial data.",
      };
    }
    return { allowed: true };
  }
}

export const authService = new AuthService();
