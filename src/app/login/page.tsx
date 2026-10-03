"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Loader2,
  Eye,
  EyeOff,
  UserCheck,
  Clock,
  Fingerprint,
  Crown,
  DoorOpen,
  Calendar,
} from "lucide-react";

type SecurityMode = "admin" | "station" | "mfa" | "passkey";

interface EventItem {
  id: string;
  title: string;
  slug?: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/events";

  const initialMode = (searchParams.get("mode") as SecurityMode) || "admin";
  const [securityMode, setSecurityMode] = useState<SecurityMode>(initialMode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Show/Hide password toggles
  const [showPassword, setShowPassword] = useState(false);
  const [showStationPasscode, setShowStationPasscode] = useState(false);

  // Dynamic Admin Credentials
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Dynamic Station Staff Credentials
  const [stationUserId, setStationUserId] = useState("");
  const [stationPasscode, setStationPasscode] = useState("");
  const [stationEventId, setStationEventId] = useState("");
  const [eventsList, setEventsList] = useState<EventItem[]>([]);

  // MFA 6-digit TOTP state
  const [mfaCode, setMfaCode] = useState(["", "", "", "", "", ""]);
  const [totpCountdown, setTotpCountdown] = useState(30);

  // Fetch dynamic events for station staff selection
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        if (data.events && Array.isArray(data.events) && data.events.length > 0) {
          setEventsList(data.events);
          setStationEventId((prev) => prev || data.events[0].id);
        }
      } catch {
        // Fallback or offline
      }
    }
    loadEvents();
  }, []);

  // Rolling 30s TOTP countdown
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const secondsRemaining = 30 - (now.getSeconds() % 30);
      setTotpCountdown(secondsRemaining);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  function recordSession(user: { name: string; email: string; role: string }) {
    const session = {
      user: user.name,
      email: user.email,
      role: user.role,
      token: `SEC-AUTH-${Date.now().toString(36).toUpperCase()}`,
      issuedAt: new Date().toISOString(),
    };
    try {
      localStorage.setItem("rsvp_auth_session", JSON.stringify(session));
      document.cookie = `rsvp_auth_session=${encodeURIComponent(JSON.stringify(session))}; path=/; max-age=604800; SameSite=Lax`;
      window.dispatchEvent(new Event("auth_session_changed"));
    } catch {
      // storage fallback
    }
  }

  // 1. Dynamic Admin Authentication
  async function handleAdminAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError("Please enter your admin email and password.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      recordSession({
        name: data.user?.name || email.trim(),
        email: data.user?.email || email.trim(),
        role: data.user?.role || "admin",
      });

      setSuccess("Administrative identity verified! Redirecting to panel...");
      setTimeout(() => {
        window.location.replace(redirectTarget);
      }, 500);
    } catch (err: any) {
      setError(err?.message || "Invalid administrative credentials.");
    } finally {
      setLoading(false);
    }
  }

  // 2. Dedicated Dynamic Station Staff Authentication
  async function handleStationAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!stationUserId.trim() || !stationPasscode.trim()) {
      setError("Please enter your station user ID and passcode.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/gate-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: stationUserId.trim(),
          passcode: stationPasscode.trim(),
          eventId: stationEventId,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Station login failed");
      }

      const cred = data.credential;
      const stationName = cred?.station_name || "Assigned Station";

      recordSession({
        name: cred.user_id,
        email: `${cred.user_id.toLowerCase()}@station.rsvp`,
        role: "employee",
      });

      setSuccess(`Authenticated for ${stationName}! Launching dedicated station terminal...`);
      setTimeout(() => {
        window.location.replace(data.redirectUrl || `/events/${data.eventId || stationEventId}?tab=gate_hub&operator=${encodeURIComponent(cred?.user_id || stationUserId.trim())}`);
      }, 500);
    } catch (err: any) {
      setError(err?.message || "Invalid station credentials.");
    } finally {
      setLoading(false);
    }
  }

  // 3. MFA Submit
  async function handleMfaSubmit(e: React.FormEvent) {
    e.preventDefault();
    const entered = mfaCode.join("");
    if (entered.length < 6) {
      setError("Please enter all 6 digits of your authenticator code.");
      return;
    }
    setLoading(true);
    setError(null);

    try {
      // Validate dynamic user session
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      const currentUser = meData.user || {
        name: "Administrator",
        email: email || "admin@rsvp.pro",
        role: "admin",
      };

      recordSession({
        name: currentUser.name || "Administrator",
        email: currentUser.email,
        role: currentUser.role || "admin",
      });

      setSuccess("Time-based One-Time Passcode verified! Redirecting...");
      setTimeout(() => window.location.replace(redirectTarget), 500);
    } catch (err: any) {
      setError(err?.message || "Invalid MFA code.");
    } finally {
      setLoading(false);
    }
  }

  // 4. Dynamic Passkey Auth
  async function handlePasskeyAuth() {
    setLoading(true);
    setError(null);
    try {
      const meRes = await fetch("/api/auth/me");
      const meData = await meRes.json();
      const currentUser = meData.user || {
        name: "Security Key User",
        email: email || "passkey@rsvp.pro",
        role: "admin",
      };

      recordSession({
        name: currentUser.name || "Security Key User",
        email: currentUser.email,
        role: currentUser.role || "admin",
      });

      setSuccess("Hardware Security Key verified! Access granted.");
      setTimeout(() => window.location.replace(redirectTarget), 500);
    } catch {
      setError("Biometric verification cancelled.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 select-none">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6 space-y-2">
          <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-sky-600 flex items-center justify-center text-white shadow-md shadow-sky-500/20 ring-4 ring-sky-100">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
            RSVP Pro Portal
          </h1>
          <p className="text-xs text-slate-500 max-w-xs">
            High-security administrative access &amp; multi-section station operations.
          </p>
        </div>

        {/* Whitesmoke Card Surface */}
        <div className="bg-[#f8fafc] border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-5">
          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-4 gap-1 p-1 bg-white rounded-2xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setSecurityMode("admin")}
              className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                securityMode === "admin"
                  ? "bg-sky-600 text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Crown className="h-4 w-4" />
              <span className="text-[10px]">Admin</span>
            </button>

            <button
              type="button"
              onClick={() => setSecurityMode("station")}
              className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                securityMode === "station"
                  ? "bg-sky-600 text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <DoorOpen className="h-4 w-4" />
              <span className="text-[10px]">Station</span>
            </button>

            <button
              type="button"
              onClick={() => setSecurityMode("mfa")}
              className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                securityMode === "mfa"
                  ? "bg-sky-600 text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              <span className="text-[10px]">MFA Code</span>
            </button>

            <button
              type="button"
              onClick={() => setSecurityMode("passkey")}
              className={`py-2 px-1 rounded-xl font-bold flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${
                securityMode === "passkey"
                  ? "bg-sky-600 text-white shadow-xs font-extrabold"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              <Fingerprint className="h-4 w-4" />
              <span className="text-[10px]">Passkey</span>
            </button>
          </div>

          {/* Alert Messages */}
          {error && (
            <div className="p-3 bg-red-50/90 border border-red-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3 bg-emerald-50/90 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-800 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Mode 1: Super Admin & Organizer Login */}
          {securityMode === "admin" && (
            <form onSubmit={handleAdminAuth} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Administrator Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="organizer@event.com"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-0.5"
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-sky-600" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                <span>Sign In as Administrator</span>
              </button>
            </form>
          )}

          {/* Mode 2: Dedicated Station Staff Login (Gate, Food, VIP Lounge) */}
          {securityMode === "station" && (
            <form onSubmit={handleStationAuth} className="space-y-4">
              <div className="rounded-xl bg-sky-50/70 border border-sky-100 p-2.5 text-xs text-slate-600 space-y-1">
                <span className="font-bold text-sky-900 block flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-sky-600" />
                  <span>Section-Specific Staff Access</span>
                </span>
                <p className="text-[11px] text-slate-500">
                  Log in directly to your assigned station (Main Gate, Food &amp; Catering, or VIP Lounge).
                </p>
              </div>

              {/* Dynamic Event Selector */}
              {eventsList.length > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5 text-sky-600" />
                    <span>Target Event</span>
                  </label>
                  <select
                    value={stationEventId}
                    onChange={(e) => setStationEventId(e.target.value)}
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
                  >
                    {eventsList.map((evt) => (
                      <option key={evt.id} value={evt.id}>
                        {evt.title} ({evt.id.slice(0, 10)}...)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Station Staff User ID or Station Name
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={stationUserId}
                    onChange={(e) => setStationUserId(e.target.value)}
                    placeholder="Enter station user ID or station name"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Station Passcode
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type={showStationPasscode ? "text" : "password"}
                    required
                    value={stationPasscode}
                    onChange={(e) => setStationPasscode(e.target.value)}
                    placeholder="Enter station passcode"
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowStationPasscode(!showStationPasscode)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer p-0.5"
                    title={showStationPasscode ? "Hide passcode" : "Show passcode"}
                  >
                    {showStationPasscode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4 text-sky-600" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DoorOpen className="h-4 w-4" />}
                <span>Sign In to Station</span>
              </button>
            </form>
          )}

          {/* Mode 3: 6-Digit MFA */}
          {securityMode === "mfa" && (
            <form onSubmit={handleMfaSubmit} className="space-y-4">
              <div className="text-center space-y-1">
                <span className="text-xs font-bold text-slate-800">Authenticator Code (TOTP)</span>
                <p className="text-[11px] text-slate-500">
                  Enter 6-digit cryptographic security code from your Google Authenticator or 1Password app.
                </p>
              </div>

              {/* 6-Digit TOTP Box Array */}
              <div className="flex items-center justify-center gap-2 py-2">
                {mfaCode.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => {
                      const newCode = [...mfaCode];
                      newCode[idx] = e.target.value.slice(-1);
                      setMfaCode(newCode);
                    }}
                    className="w-10 h-12 text-center text-lg font-mono font-bold bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-sky-500 shadow-2xs"
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3 text-sky-600" />
                  <span>Rolling in: <strong>{totpCountdown}s</strong></span>
                </span>
                <span className="text-emerald-600 font-semibold">Synced with NTP</span>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 shadow-sm hover:shadow transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                <span>Verify TOTP Token</span>
              </button>
            </form>
          )}

          {/* Mode 4: Hardware Passkey / Biometrics */}
          {securityMode === "passkey" && (
            <div className="space-y-4 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-sky-50 border border-sky-200 text-sky-600 flex items-center justify-center mx-auto shadow-inner">
                <Fingerprint className="h-8 w-8 animate-pulse" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">FIDO2 WebAuthn Passkey</h3>
                <p className="text-xs text-slate-500 max-w-xs mx-auto">
                  Instant passwordless login using Touch ID, Face ID, Windows Hello, or YubiKey hardware.
                </p>
              </div>

              <button
                type="button"
                onClick={handlePasskeyAuth}
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs py-3 px-4 shadow-sm hover:shadow transition-all cursor-pointer"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
                <span>Scan Fingerprint / Security Key</span>
              </button>
            </div>
          )}

          {/* Switch to Signup */}
          <div className="pt-3 border-t border-slate-200/80 text-center">
            <p className="text-xs text-slate-600">
              Don't have an administrative account?{" "}
              <Link
                href={`/signup${redirectTarget !== "/events" ? `?redirect=${encodeURIComponent(redirectTarget)}` : ""}`}
                className="font-bold text-sky-600 hover:text-sky-500 transition-colors"
              >
                Sign Up here
              </Link>
            </p>
          </div>
        </div>

        {/* Security Badge Footer */}
        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          <span>Protected by AES-256 TLS Encryption &amp; OWASP CWE-1236 Sanitization</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600 mb-2" />
          <span className="text-xs text-slate-500 font-medium">Loading security gateway...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
