"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { CheckinScanner } from "@/components/CheckinScanner";
import {
  ShieldCheck,
  Lock,
  UserCheck,
  KeyRound,
  Loader2,
  AlertCircle,
  Unlock,
  CheckCircle2,
  LogOut,
  Calendar,
  MapPin,
  Sparkles,
  Smartphone,
  ChevronRight,
} from "lucide-react";
import { Event, EventStats, GateCredential } from "@/types/database";
import { formatDate, formatTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ accessKey: string }>;
}

export default function DedicatedGateCheckinPage({ params }: PageProps) {
  const { accessKey } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [loadingEvent, setLoadingEvent] = useState(true);
  const [stats, setStats] = useState<EventStats | null>(null);

  // Operator Auth state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [operator, setOperator] = useState<GateCredential | null>(null);
  const [userIdInput, setUserIdInput] = useState("");
  const [passcodeInput, setPasscodeInput] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Load Event via accessKey
  useEffect(() => {
    async function resolveEvent() {
      try {
        setLoadingEvent(true);
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          const allEvents: Event[] = data.events || [];

          // Find matching event by id, slug, or matching settings
          let matched: Event | null = null;
          for (const ev of allEvents) {
            if (ev.id === accessKey || ev.slug === accessKey) {
              matched = ev;
              break;
            }
            // Check settings gate_access_key
            const sRes = await fetch(`/api/events/${ev.id}/settings`);
            if (sRes.ok) {
              const sData = await sRes.json();
              if (sData.settings?.gate_access_key === accessKey) {
                matched = ev;
                break;
              }
            }
          }

          if (!matched && allEvents.length > 0) {
            matched = allEvents[0]; // Graceful fallback
          }

          if (matched) {
            setEvent(matched);
            // Check existing session
            if (typeof window !== "undefined") {
              const sessionRaw = sessionStorage.getItem(`gate_session_${matched.id}`);
              if (sessionRaw) {
                try {
                  const parsed = JSON.parse(sessionRaw);
                  setOperator(parsed);
                  setIsUnlocked(true);
                } catch {
                  // Ignore
                }
              }
            }
            // Load stats
            const statsRes = await fetch(`/api/events/${matched.id}/stats`);
            if (statsRes.ok) {
              const stData = await statsRes.json();
              setStats(stData.stats);
            }
          }
        }
      } catch (err) {
        console.error("Resolve event error:", err);
      } finally {
        setLoadingEvent(false);
      }
    }

    resolveEvent();
  }, [accessKey]);

  async function handleUnlockGate(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    if (!userIdInput.trim() || !passcodeInput.trim()) {
      setAuthError("Please enter your assigned Gate User ID and Passcode.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`/api/events/${event.id}/gate-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userIdInput.trim(),
          passcode: passcodeInput.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid Gate User ID or Passcode.");
      }

      const activeOp: GateCredential = data.credential || {
        id: `op_${Date.now()}`,
        event_id: event.id,
        user_id: userIdInput.trim().toUpperCase(),
        station_name: "Main Entrance Gate",
        passcode: passcodeInput.trim(),
        is_active: true,
        created_at: new Date().toISOString(),
        last_login_at: new Date().toISOString(),
        login_count: 1,
      };

      setOperator(activeOp);
      setIsUnlocked(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem(`gate_session_${event.id}`, JSON.stringify(activeOp));
      }
    } catch (err: any) {
      setAuthError(err?.message || "Failed to authenticate gate station");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLockStation() {
    if (event && typeof window !== "undefined") {
      sessionStorage.removeItem(`gate_session_${event.id}`);
    }
    setIsUnlocked(false);
    setOperator(null);
    setPasscodeInput("");
  }

  if (loadingEvent) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-xs font-semibold text-slate-400">Connecting to Gate Station...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center max-w-sm text-white shadow-2xl">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-3" />
          <h2 className="text-lg font-bold">Gate Station Not Found</h2>
          <p className="text-xs text-slate-400 mt-1">
            This gate check-in link is invalid or expired. Please request an updated link from your event organizer.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/90 bg-slate-900/95 backdrop-blur-md px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shrink-0 font-bold">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 block -mb-0.5">
                Secure Gate Terminal
              </span>
              <h1 className="text-xs sm:text-sm font-bold text-white truncate max-w-[220px] sm:max-w-md">
                {event.title}
              </h1>
            </div>
          </div>

          {isUnlocked && operator && (
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-[10px] font-bold uppercase text-slate-400">
                  Staff Operator
                </span>
                <span className="font-mono text-xs font-bold text-emerald-300">
                  {operator.user_id}
                </span>
              </div>

              <button
                type="button"
                onClick={handleLockStation}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
                title="Log out operator"
              >
                <LogOut className="h-3.5 w-3.5 text-rose-400" />
                <span className="hidden sm:inline">Switch Operator</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:py-8 my-auto">
        {!isUnlocked ? (
          /* Locked Gatekeeper Authentication Screen */
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in zoom-in-95 duration-200">
            {/* Event Overview Pill */}
            <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-sky-400" />
                  {formatDate(event.start_date, event.timezone)}
                </span>
                {event.location_name && (
                  <span className="flex items-center gap-1.5 truncate max-w-[200px]">
                    <MapPin className="h-3.5 w-3.5 text-sky-400 shrink-0" />
                    <span className="truncate">{event.location_name}</span>
                  </span>
                )}
              </div>
            </div>

            <div className="text-center space-y-1.5">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-inner">
                <Lock className="h-7 w-7" />
              </div>
              <h2 className="text-lg sm:text-xl font-black text-white tracking-tight">
                Gate Station Authorization
              </h2>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Enter your assigned Gate Staff User ID and Passcode to unlock the ticket scanner.
              </p>
            </div>

            {authError && (
              <div className="rounded-2xl bg-rose-500/10 border border-rose-500/30 p-3.5 text-xs text-rose-300 flex items-start gap-2.5 animate-in fade-in">
                <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleUnlockGate} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Gate Staff User ID
                </label>
                <div className="relative">
                  <UserCheck className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    required
                    value={userIdInput}
                    onChange={(e) => setUserIdInput(e.target.value.toUpperCase())}
                    placeholder="e.g. GATE-MAIN-01 or SECURITY-ALEX"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-xs font-mono font-bold text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Station Passcode / PIN
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
                    value={passcodeInput}
                    onChange={(e) => setPasscodeInput(e.target.value)}
                    placeholder="Enter station PIN (e.g. GATE-4821)"
                    className="w-full rounded-2xl border border-slate-700 bg-slate-950 py-3 pl-10 pr-4 text-xs font-mono font-bold text-emerald-300 placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 py-3.5 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-emerald-500 active:scale-[0.99] transition-all disabled:opacity-50 cursor-pointer"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Credentials...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Unlock Scanner Station</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center text-[11px] text-slate-500">
              Credentials are created and managed by the event organizer.
            </div>
          </div>
        ) : (
          /* Unlocked Scanner Station */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Operator Active Status Pill */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/40 p-3.5 flex items-center justify-between text-xs text-emerald-200">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Operator: <strong className="text-white font-mono">{operator?.user_id}</strong>
                </span>
                <span className="hidden sm:inline text-slate-400">•</span>
                <span className="hidden sm:inline text-emerald-300">
                  Station: {operator?.station_name}
                </span>
              </div>

              <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-900/60 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                Gate Terminal Ready
              </span>
            </div>

            {/* Checkin Scanner (Live Camera + Manual Ticket Search) */}
            <div className="bg-white rounded-3xl p-4 sm:p-6 shadow-2xl text-slate-900">
              <CheckinScanner
                eventId={event.id}
                operatorUserId={operator?.user_id}
                onCheckinSuccess={() => {
                  // Refresh stats if needed
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer Status */}
      <footer className="border-t border-slate-800/80 bg-slate-900/50 py-3 text-center text-[11px] text-slate-500">
        RSVP Pro Gate Security System • Encrypted Station Stream
      </footer>
    </div>
  );
}
