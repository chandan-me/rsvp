"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { CheckinScanner } from "@/components/CheckinScanner";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  UserCheck,
  KeyRound,
  Loader2,
  AlertCircle,
  Unlock,
  CheckCircle2,
  LogOut,
  Sparkles,
  Calendar,
  MapPin,
  Clock,
  Laptop,
  Smartphone,
  Tablet,
} from "lucide-react";
import { Event, EventStats, GateCredential } from "@/types/database";
import { formatDate, formatTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CheckinStationPage({ params }: PageProps) {
  const { id: eventId } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Gate Security Lock State
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [checkingAuth, setCheckingAuth] = useState<boolean>(true);
  const [gateUserId, setGateUserId] = useState("");
  const [gatePassword, setGatePassword] = useState("");
  const [operator, setOperator] = useState<GateCredential | null>(null);
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check existing session unlock
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sessionRaw = sessionStorage.getItem(`gate_session_${eventId}`);
      if (sessionRaw) {
        try {
          const parsed = JSON.parse(sessionRaw);
          setOperator(parsed);
          setIsUnlocked(true);
        } catch {
          if (sessionStorage.getItem(`gate_auth_${eventId}`) === "true") {
            setIsUnlocked(true);
          }
        }
      } else if (sessionStorage.getItem(`gate_auth_${eventId}`) === "true") {
        setIsUnlocked(true);
      }
      setCheckingAuth(false);
    }
  }, [eventId]);

  async function loadData() {
    try {
      setIsRefreshing(true);
      const res = await fetch(`/api/events/${eventId}`);
      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        setStats(data.stats);
      }
    } catch (err) {
      console.error("Failed to load gate data:", err);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [eventId]);

  async function handleUnlockGate(e: React.FormEvent) {
    e.preventDefault();
    if (!gateUserId.trim() || !gatePassword.trim()) {
      setAuthError("Please enter both your Gate Staff User ID and Passcode PIN.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/gate-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: gateUserId.trim(),
          passcode: gatePassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid gate credentials.");
      }

      const activeOp: GateCredential = data.credential || {
        id: `op_${Date.now()}`,
        event_id: eventId,
        user_id: gateUserId.trim().toUpperCase(),
        station_name: "Main Entrance Gate",
        passcode: gatePassword.trim(),
        is_active: true,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        login_count: 1,
      };

      setOperator(activeOp);
      setIsUnlocked(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`gate_session_${eventId}`, JSON.stringify(activeOp));
        sessionStorage.setItem(`gate_auth_${eventId}`, "true");
      }
    } catch (err: any) {
      setAuthError(err?.message || "Failed to authenticate gate station");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLockGate() {
    sessionStorage.removeItem(`gate_auth_${eventId}`);
    sessionStorage.removeItem(`gate_session_${eventId}`);
    setIsUnlocked(false);
    setOperator(null);
    setGatePassword("");
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
        <span className="text-xs font-semibold">Verifying Gate Station Session...</span>
      </div>
    );
  }

  // 1. GATE ACCESS LOCKED SCREEN (Tablet & Mobile Optimized)
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          {/* Header Link */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href={`/events/${eventId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>

            <span className="text-[10px] uppercase font-bold tracking-wider bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-md border border-rose-500/20 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Station Locked</span>
            </span>
          </div>

          {/* Authentication Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Gate Station Authentication
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {event?.title || "Event Gate"} • Enter your assigned Gate Staff User ID and Passcode to unlock the check-in station.
              </p>
            </div>

            {authError && (
              <div className="rounded-xl bg-rose-950/50 border border-rose-800/80 p-3 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed">{authError}</p>
              </div>
            )}

            <form onSubmit={handleUnlockGate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Gate Staff User ID
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={gateUserId}
                    onChange={(e) => setGateUserId(e.target.value.toUpperCase())}
                    placeholder="e.g. GATE-MAIN-01 or SECURITY-ALEX"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Station Passcode / Secret PIN
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={gatePassword}
                    onChange={(e) => setGatePassword(e.target.value)}
                    placeholder="Enter station passcode (e.g. GATE-4821)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 pl-10 pr-3 text-xs font-mono font-bold text-emerald-300 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 tracking-wider transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Created and assigned by event organizer in Gate Stations tab.
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 py-3 text-sm font-semibold text-white shadow-lg hover:bg-sky-500 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Unlock Check-In Scanner</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-[11px] text-slate-500">
              Only authorized staff credentials can operate check-in stations.
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNLOCKED FULL STATION (Responsive Tablet & Mobile)
  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-between">
      {/* Top Station Navigation Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/90 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700/80"
              title="Return to Dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                  Gate Station Active
                </span>
              </div>
              <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {event?.title || "Check-In Station"}
              </h1>
            </div>
          </div>

          {/* Right Action: Operator Profile & Lock Station */}
          <div className="flex items-center gap-2 sm:gap-3">
            {operator && (
              <div className="hidden md:flex flex-col text-right">
                <span className="text-[10px] text-slate-400 font-bold uppercase">Staff User ID</span>
                <span className="text-xs font-mono font-bold text-emerald-400">{operator.user_id}</span>
              </div>
            )}

            <button
              onClick={handleLockGate}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Lock station and log out"
            >
              <LogOut className="h-3.5 w-3.5 text-rose-400" />
              <span className="hidden sm:inline">Lock Station</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Scanner Section */}
      <main className="mx-auto w-full max-w-2xl px-4 py-5 sm:py-6 my-auto">
        <div className="rounded-3xl border border-slate-800 bg-slate-950 p-4 sm:p-6 shadow-2xl space-y-4">
          {/* Operator Badge */}
          {operator && (
            <div className="flex items-center justify-between text-xs bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-slate-300">
              <span className="font-mono font-bold text-emerald-400">
                Operator: {operator.user_id}
              </span>
              <span className="text-[11px] text-slate-400">
                Default Station: {operator.station_name}
              </span>
            </div>
          )}

          {/* Checkin Scanner (Live Camera + Manual Lookup) */}
          <CheckinScanner
            eventId={eventId}
            operatorUserId={operator?.user_id}
            onCheckinSuccess={() => {
              loadData();
            }}
          />
        </div>
      </main>

      {/* Footer System Status */}
      <footer className="border-t border-slate-800 bg-slate-950/60 py-3 text-center text-[11px] text-slate-500">
        RSVP Pro Gate Station • Multi-Staff Operator Stream Active
      </footer>
    </div>
  );
}
