"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { CheckinScanner } from "@/components/CheckinScanner";
import {
  ArrowLeft,
  ShieldCheck,
  Lock,
  Mail,
  KeyRound,
  Loader2,
  AlertCircle,
  Unlock,
  CheckCircle2,
  LogOut,
} from "lucide-react";
import { Event, EventStats } from "@/types/database";

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
  const [gateEmail, setGateEmail] = useState("");
  const [gatePassword, setGatePassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Check existing session unlock
  useEffect(() => {
    if (typeof window !== "undefined") {
      const unlocked = sessionStorage.getItem(`gate_auth_${eventId}`);
      if (unlocked === "true") {
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
    if (!gateEmail.trim() || !gatePassword.trim()) {
      setAuthError("Please enter both authorized email and secret gate token.");
      return;
    }

    setAuthLoading(true);
    setAuthError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/gate-auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: gateEmail.trim(),
          pin: gatePassword.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Invalid gate credentials.");
      }

      // Save in session
      sessionStorage.setItem(`gate_auth_${eventId}`, "true");
      setIsUnlocked(true);
    } catch (err: any) {
      setAuthError(err?.message || "Failed to authenticate gate station");
    } finally {
      setAuthLoading(false);
    }
  }

  function handleLockGate() {
    sessionStorage.removeItem(`gate_auth_${eventId}`);
    setIsUnlocked(false);
    setGatePassword("");
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
      </div>
    );
  }

  // 1. GATE ACCESS LOCKED SCREEN
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center px-4 py-8 sm:px-6">
        <div className="mx-auto w-full max-w-md">
          {/* Header Link */}
          <div className="mb-6 flex items-center justify-between">
            <Link
              href={`/events/${eventId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Dashboard</span>
            </Link>

            <span className="text-[10px] uppercase font-bold tracking-wider bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-md border border-rose-500/20 flex items-center gap-1">
              <Lock className="h-3 w-3" />
              <span>Gate Locked</span>
            </span>
          </div>

          {/* Authentication Card */}
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 text-white shadow-lg shadow-sky-500/20">
                <ShieldCheck className="h-7 w-7" />
              </div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                Gate Station Authentication
              </h2>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {event?.title || "Event Gate"} • Enter authorized email and secret gate token to unlock check-in station.
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
                  Staff / Host Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={gateEmail}
                    onChange={(e) => setGateEmail(e.target.value)}
                    placeholder="e.g. admin@craftconf.io"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                  Secret Gate Password / Token
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={gatePassword}
                    onChange={(e) => setGatePassword(e.target.value)}
                    placeholder="Enter password (e.g. GATE-4821)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800/90 py-2.5 pl-10 pr-3 text-sm text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono tracking-wider font-semibold transition-all"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Generated by event host in Event Settings.
                </p>
              </div>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-sky-600/20 hover:from-sky-500 hover:to-indigo-500 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {authLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Verifying Token...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="h-4 w-4" />
                    <span>Unlock Check-In Station</span>
                  </>
                )}
              </button>
            </form>

            <div className="text-center pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400">
                Are you the event host? Check or change password in{" "}
                <Link href={`/events/${eventId}`} className="text-sky-400 hover:underline font-semibold">
                  Event Settings
                </Link>
                .
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. UNLOCKED CHECK-IN STATION: ONLY CAMERA SCANNER & SEARCH OPTION
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Sleek Minimal Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 sm:px-6 sticky top-0 z-30">
        <div className="mx-auto max-w-3xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors bg-slate-800/80 px-2.5 py-1.5 rounded-lg border border-slate-700/60"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Dashboard</span>
            </Link>

            <div>
              <h1 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                <span className="truncate max-w-[160px] sm:max-w-xs">{event?.title || "Check-In Gate"}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  Live Gate
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {stats && (
              <div className="text-right hidden sm:block">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                  Attendance
                </span>
                <span className="text-xs font-bold text-emerald-400">
                  {stats.checkedInCount} / {stats.totalAttendeesCount || stats.attending} ({stats.checkinPercentage}%)
                </span>
              </div>
            )}

            {/* Lock / Log Out Button */}
            <button
              type="button"
              onClick={handleLockGate}
              title="Lock gatekeeper station"
              className="inline-flex items-center gap-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-300 px-2.5 py-1.5 text-xs font-semibold border border-slate-700 transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Lock Gate</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Gate Body: ONLY Camera Scanner & Search Option */}
      <main className="flex-1 mx-auto max-w-2xl w-full px-4 py-5 sm:py-8 space-y-4">
        {/* Real-time Camera Scanner & Search Input */}
        <CheckinScanner eventId={eventId} onCheckinSuccess={loadData} />
      </main>
    </div>
  );
}
