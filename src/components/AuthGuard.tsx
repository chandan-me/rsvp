"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import { getVerifiedSession } from "@/lib/authClient";

interface AuthSessionUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: string[]; // e.g. ["admin", "manager", "client", "employee"]
}

export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [session, setSession] = useState<AuthSessionUser | null>(null);
  const [isChecking, setIsChecking] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  async function verifyAuth() {
    try {
      const data = await getVerifiedSession();

      if (!data.authenticated || !data.user) {
        setIsAuthorized(false);
        setIsChecking(false);
        window.location.replace(`/login?redirect=${encodeURIComponent(pathname || "/events")}`);
        return;
      }

      // If roles are specified, check server-verified role
      if (allowedRoles && allowedRoles.length > 0) {
        const userRole = data.user.role?.toLowerCase() || "guest";
        const hasRole = allowedRoles.some((r) => r.toLowerCase() === userRole || userRole === "admin");
        if (!hasRole) {
          setIsAuthorized(false);
          setIsChecking(false);
          return;
        }
      }

      setSession(data.user);
      setIsAuthorized(true);
      setIsChecking(false);
    } catch {
      setIsAuthorized(false);
      setIsChecking(false);
      window.location.replace(`/login?redirect=${encodeURIComponent(pathname || "/events")}`);
    }
  }

  useEffect(() => {
    verifyAuth();

    const handleAuthChange = () => {
      verifyAuth();
    };

    window.addEventListener("pageshow", handleAuthChange);
    window.addEventListener("auth_session_changed", handleAuthChange);

    return () => {
      window.removeEventListener("pageshow", handleAuthChange);
      window.removeEventListener("auth_session_changed", handleAuthChange);
    };
  }, [pathname]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-[#fbfaff] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-[#f3effc] border border-[#e7e1f8] flex items-center justify-center text-[#5e2ced] shadow-sm">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <h2 className="text-sm font-bold text-[#191236]">Verifying Security Credentials</h2>
          <p className="text-xs text-[#5b6072] max-w-xs">
            Authenticating your session with server-side security checks...
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-[#fbfaff] flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#e7e1f8] p-8 text-center space-y-4 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-[#191236]">Authentication Required</h2>
          <p className="text-xs text-[#5b6072] leading-relaxed">
            You must be signed in with an authorized account to access this section of the platform.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                window.location.replace(`/login?redirect=${encodeURIComponent(pathname || "/events")}`);
              }}
              className="w-full py-2.5 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] text-white text-xs font-bold transition shadow-md shadow-purple-500/20 cursor-pointer"
            >
              Sign In to Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
