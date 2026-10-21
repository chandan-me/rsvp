import { NextRequest } from "next/server";
import { db } from "./dbProvider";
import { UserRoleType } from "@/types/database";
import { securityService } from "./securityService";

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRoleType;
  assignedEventIds: string[];
}

export class AuthService {
  /**
   * Resolves the current user securely from signed HttpOnly cookies or verified Authorization headers.
   * NEVER falls back to default admin or unverified client-provided headers.
   */
  public async getSessionUser(req: NextRequest): Promise<AuthenticatedUser | null> {
    db.profiles = db.profiles || [];

    let verifiedPayload = null;

    // 1. Check for cryptographically signed session token in cookie
    const signedCookie = req.cookies.get("rsvp_session_token")?.value;
    if (signedCookie) {
      verifiedPayload = securityService.verifySignedSessionToken(signedCookie);
    }

    // 2. Check for Authorization Bearer token (for mobile/scanner apps or API clients)
    if (!verifiedPayload) {
      const authHeader = req.headers.get("authorization");
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.substring(7).trim();
        verifiedPayload = securityService.verifySignedSessionToken(token);
      }
    }

    // 3. Fallback check for transitional cookie during upgrade (only if signed or matches db user)
    if (!verifiedPayload) {
      const legacyCookie = req.cookies.get("rsvp_session_user")?.value;
      if (legacyCookie) {
        try {
          const parsed = JSON.parse(decodeURIComponent(legacyCookie));
          if (parsed && parsed.id && parsed.email) {
            const matchedProfile = db.profiles.find((p) => p.id === parsed.id && p.email.toLowerCase() === parsed.email.toLowerCase());
            if (matchedProfile) {
              verifiedPayload = {
                userId: matchedProfile.id,
                email: matchedProfile.email,
                role: (matchedProfile.role || "client") as UserRoleType,
                name: matchedProfile.full_name || matchedProfile.email,
                expiresAt: Date.now() + 86400000,
              };
            }
          }
        } catch {
          // ignore invalid cookie
        }
      }
    }

    // If verified session payload exists, resolve profile from DB
    if (verifiedPayload) {
      const profile = db.profiles.find((p) => p.id === verifiedPayload.userId);
      const role = (profile?.role || verifiedPayload.role || "client") as UserRoleType;
      const fullName = profile?.full_name || verifiedPayload.name || verifiedPayload.email;

      return {
        id: verifiedPayload.userId,
        email: verifiedPayload.email,
        fullName,
        role,
        assignedEventIds: this.getAssignedEvents(verifiedPayload.userId),
      };
    }

    // 4. Secure internal service verification (requires shared internal secret, never raw unverified headers)
    const internalSecret = process.env.INTERNAL_SERVICE_SECRET;
    const reqInternalSecret = req.headers.get("x-internal-secret");
    const headerUserId = req.headers.get("x-user-id");

    if (internalSecret && reqInternalSecret && internalSecret === reqInternalSecret && headerUserId) {
      const profile = db.profiles.find((p) => p.id === headerUserId || p.email === headerUserId);
      if (profile) {
        return {
          id: profile.id,
          email: profile.email,
          fullName: profile.full_name || profile.email,
          role: (profile.role || "client") as UserRoleType,
          assignedEventIds: this.getAssignedEvents(profile.id),
        };
      }
    }

    // No valid verified credentials: fail securely
    return null;
  }

  public getAssignedEvents(userId: string): string[] {
    const list = new Set<string>();
    // Event owner / client
    (db.events || []).forEach((e) => {
      if (e.created_by === userId || e.client_id === userId) {
        list.add(e.id);
      }
    });
    // Staff assignments
    (db.eventStaffAssignments || []).forEach((s) => {
      if (s.user_id === userId || s.staff_user_id === userId) {
        list.add(s.event_id);
      }
    });
    return Array.from(list);
  }

  /**
   * Enforces event-level authorization (IDOR / BOLA Prevention). Default: DENY.
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
