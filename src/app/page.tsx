"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { getVerifiedSession } from "@/lib/authClient";
import {
  CalendarCheck,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Layers,
  Lock,
  Check,
  Zap,
  ExternalLink,
  Star,
  Building2,
  Calendar,
  MapPin,
  Laptop,
  Plus,
  Scan,
  LayoutGrid,
  Activity,
  Eye,
  UtensilsCrossed,
} from "lucide-react";
import { Event } from "@/types/database";
import { formatDate, formatTime } from "@/lib/utils";

interface AuthSession {
  user: string;
  email: string;
  role: string;
}

export default function HomePage() {
  // Authentication State
  const [session, setSession] = useState<AuthSession | null>(null);
  const [previewPublicView, setPreviewPublicView] = useState(false);

  // Dynamic Events State
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  // Solutions category tab state (for public visitors)
  const [solutionCategory, setSolutionCategory] = useState<"corporate" | "nonprofit" | "tech" | "private">("corporate");

  // Check auth session from deduplicated client cache
  useEffect(() => {
    async function readSession() {
      try {
        const data = await getVerifiedSession();
        if (data.authenticated && data.user) {
          setSession({
            user: data.user.name,
            email: data.user.email,
            role: data.user.role,
          });
          return;
        }
        setSession(null);
      } catch {
        setSession(null);
      }
    }
    readSession();
    window.addEventListener("auth_session_changed", readSession);
    return () => {
      window.removeEventListener("auth_session_changed", readSession);
    };
  }, []);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (e) {
        console.warn("Events fetch warning:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  // Calculate aggregated stats for authenticated organizers
  const totalEventsCount = events.length;
  const demoEvent = events[0];

  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#191236] flex flex-col selection:bg-[#5e2ced] selection:text-white">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        {/* ============================================================== */}
        {/* CASE 1: AUTHENTICATED USER (AFTER LOGIN COMMAND CENTER)         */}
        {/* ============================================================== */}
        {session && !previewPublicView ? (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 animate-in fade-in duration-200">
            {/* Host Welcome & Status Header */}
            <div className="rounded-3xl bg-white border border-[#e7e1f8] p-6 sm:p-8 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-br from-[#5e2ced]/10 via-[#7c3aed]/5 to-transparent rounded-full blur-3xl pointer-events-none" />

              <div className="space-y-2 relative z-10">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3effc] text-[#5e2ced] text-xs font-bold border border-[#e7e1f8]">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Host Operations Active</span>
                  </span>
                  <span className="text-xs font-mono text-slate-500 font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 uppercase">
                    Role: {session.role}
                  </span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-extrabold text-[#191236] tracking-tight">
                  Welcome back, {session.user}!
                </h1>
                <p className="text-xs sm:text-sm text-[#5b6072] max-w-xl">
                  Manage attendee registrations, monitor turnstile gate traffic, configure ticket tiers, and print name badges.
                </p>
              </div>

              {/* Top Quick Actions */}
              <div className="flex items-center gap-3 relative z-10 flex-wrap">
                <Link
                  href="/events/new"
                  className="inline-flex items-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] text-white px-5 py-2.5 text-xs font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Event</span>
                </Link>

                <Link
                  href="/events"
                  className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 text-xs font-semibold shadow-2xs transition-all"
                >
                  <LayoutGrid className="w-4 h-4 text-[#5e2ced]" />
                  <span>Events Dashboard</span>
                </Link>

                <button
                  type="button"
                  onClick={() => setPreviewPublicView(true)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#f3effc] hover:bg-[#ece7fb] text-[#5e2ced] px-3.5 py-2.5 text-xs font-bold transition-all cursor-pointer"
                  title="Switch to public visitor view"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Visitor View</span>
                </button>
              </div>
            </div>

            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="rounded-3xl bg-white border border-[#e7e1f8] p-5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Active Events</span>
                  <CalendarCheck className="w-4 h-4 text-[#5e2ced]" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#191236]">
                  {loading ? "..." : totalEventsCount}
                </div>
                <p className="text-[11px] text-emerald-600 font-medium">Ready for RSVPs &amp; Gate Check-In</p>
              </div>

              <div className="rounded-3xl bg-white border border-[#e7e1f8] p-5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Turnstile Speed</span>
                  <Zap className="w-4 h-4 text-amber-500" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#191236]">
                  12ms
                </div>
                <p className="text-[11px] text-slate-500 font-medium">High-speed QR vector verification</p>
              </div>

              <div className="rounded-3xl bg-white border border-[#e7e1f8] p-5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Scanner Mode</span>
                  <Scan className="w-4 h-4 text-sky-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#191236]">
                  Offline / Online
                </div>
                <p className="text-[11px] text-sky-600 font-medium">Auto-syncs via IndexedDB</p>
              </div>

              <div className="rounded-3xl bg-white border border-[#e7e1f8] p-5 shadow-2xs space-y-1">
                <div className="flex items-center justify-between text-slate-400">
                  <span className="text-[11px] font-bold uppercase tracking-wider">Security RBAC</span>
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl sm:text-3xl font-black text-[#191236]">
                  100% Hardened
                </div>
                <p className="text-[11px] text-emerald-600 font-medium">Zero IDOR • Scrypt &amp; MFA</p>
              </div>
            </div>

            {/* Quick Navigation Launchpad */}
            <div className="rounded-3xl bg-white border border-[#e7e1f8] p-6 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-[#191236] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#5e2ced]" />
                <span>Host Operations Launchpad</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Link
                  href="/events"
                  className="p-4 rounded-2xl bg-[#fbfaff] border border-[#e7e1f8] hover:border-[#5e2ced]/40 hover:bg-[#f6f3fe] transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5e2ced] flex items-center justify-center font-bold">
                      <LayoutGrid className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#191236] group-hover:text-[#5e2ced] transition-colors">
                      Events Dashboard
                    </h4>
                    <p className="text-[11px] text-[#5b6072] leading-relaxed">
                      View all your hosted events, attendee rosters, and capacity meters.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#5e2ced] flex items-center gap-1">
                    <span>Open Events</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>

                <Link
                  href="/manager"
                  className="p-4 rounded-2xl bg-[#fbfaff] border border-[#e7e1f8] hover:border-[#5e2ced]/40 hover:bg-[#f6f3fe] transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="w-9 h-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#191236] group-hover:text-[#5e2ced] transition-colors">
                      Operations Command
                    </h4>
                    <p className="text-[11px] text-[#5b6072] leading-relaxed">
                      Real-time gate check-in feed, dietary quotas, and multi-station audit logs.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-sky-600 flex items-center gap-1">
                    <span>Open Command</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>

                <Link
                  href="/employee/scanner"
                  className="p-4 rounded-2xl bg-[#fbfaff] border border-[#e7e1f8] hover:border-[#5e2ced]/40 hover:bg-[#f6f3fe] transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                      <Scan className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#191236] group-hover:text-[#5e2ced] transition-colors">
                      Field Gate Scanner
                    </h4>
                    <p className="text-[11px] text-[#5b6072] leading-relaxed">
                      Mobile barcode turnstile scanner with audio chime and haptic feedback.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                    <span>Open Scanner</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>

                <Link
                  href="/admin"
                  className="p-4 rounded-2xl bg-[#fbfaff] border border-[#e7e1f8] hover:border-[#5e2ced]/40 hover:bg-[#f6f3fe] transition-all group flex flex-col justify-between space-y-3"
                >
                  <div className="space-y-1.5">
                    <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5e2ced] flex items-center justify-center font-bold">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <h4 className="text-xs font-bold text-[#191236] group-hover:text-[#5e2ced] transition-colors">
                      Platform Admin &amp; Audit
                    </h4>
                    <p className="text-[11px] text-[#5b6072] leading-relaxed">
                      Financial settlements, immutable security logs, and role permissions.
                    </p>
                  </div>
                  <span className="text-[11px] font-bold text-[#5e2ced] flex items-center gap-1">
                    <span>Admin Console</span>
                    <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                  </span>
                </Link>
              </div>
            </div>

            {/* My Active Hosted Events */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-[#191236]">My Hosted Events</h3>
                  <p className="text-xs text-[#5b6072]">Active events configured under your organizer account.</p>
                </div>

                <Link
                  href="/events/new"
                  className="text-xs font-bold text-[#5e2ced] hover:text-[#5225d3] flex items-center gap-1"
                >
                  <span>+ New Event</span>
                </Link>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-3xl bg-white border border-[#e7e1f8] p-6 space-y-4 animate-pulse">
                      <div className="h-5 w-24 bg-[#e7e1f8] rounded-full" />
                      <div className="h-6 w-3/4 bg-[#e7e1f8] rounded-lg" />
                      <div className="h-4 w-1/2 bg-[#f3effc] rounded" />
                    </div>
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="rounded-3xl bg-white border border-[#e7e1f8] p-12 text-center space-y-3">
                  <CalendarCheck className="w-10 h-10 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800">No events created yet</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Launch your first conference, banquet, or summit in 60 seconds with full RSVP &amp; gate check-in support.
                  </p>
                  <Link
                    href="/events/new"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2ced] text-white px-5 py-2 text-xs font-bold"
                  >
                    <span>Launch First Event</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="rounded-3xl bg-white border border-[#e7e1f8] p-6 shadow-sm hover:shadow-lg hover:border-[#5e2ced]/40 transition-all flex flex-col justify-between space-y-5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#f3effc] text-[#5e2ced] px-2.5 py-0.5 rounded-full border border-[#e7e1f8]">
                            {evt.is_published ? "Published & Live" : "Draft"}
                          </span>
                          <span className="text-[11px] font-mono text-slate-400">
                            /e/{evt.slug}
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-[#191236] leading-snug line-clamp-1">
                          {evt.title}
                        </h4>

                        <p className="text-xs text-[#5b6072] line-clamp-2 leading-relaxed">
                          {evt.description || "No event description configured yet."}
                        </p>

                        <div className="space-y-1.5 text-xs text-slate-600 pt-2 border-t border-[#f3effc]">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-3.5 h-3.5 text-[#5e2ced]" />
                            <span>{formatDate(evt.start_date)} at {formatTime(evt.start_date)}</span>
                          </div>
                          {evt.location_name && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3.5 h-3.5 text-slate-400" />
                              <span className="truncate">{evt.location_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 1-Click Action Buttons for Host */}
                      <div className="pt-3 border-t border-[#f3effc] flex items-center justify-between gap-2">
                        <Link
                          href={`/events/${evt.id}`}
                          className="flex-1 text-center py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-2xs"
                        >
                          Manage Event
                        </Link>

                        <Link
                          href={`/events/${evt.id}/checkin`}
                          className="py-2 px-3 rounded-xl bg-[#f3effc] hover:bg-[#ece7fb] text-[#5e2ced] text-xs font-bold transition border border-[#e7e1f8]"
                          title="Open Gate Hub"
                        >
                          Gate Hub
                        </Link>

                        <Link
                          href={`/e/${evt.slug}`}
                          target="_blank"
                          className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
                          title="View Live Registration Page"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Dedicated Showcase Link Callout for Organizers */}
            <div className="rounded-2xl border border-[#e7e1f8] bg-[#fbfaff] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-50 text-[#5e2ced] flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-[#191236]">Looking for the Product Showcase &amp; Playground?</h4>
                  <p className="text-[11px] text-[#5b6072]">
                    The interactive pass simulator, turnstile tester, and seating planner are available on the dedicated Showcase page.
                  </p>
                </div>
              </div>

              <Link
                href="/showcase"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white hover:bg-slate-50 text-[#5e2ced] border border-[#e7e1f8] text-xs font-bold transition shadow-2xs"
              >
                <span>Open Showcase Playground</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : (
          /* ============================================================== */
          /* CASE 2: PUBLIC VISITOR (BEFORE LOGIN LANDING PAGE)              */
          /* ============================================================== */
          <div>
            {/* If organizer toggled visitor view, show banner to switch back */}
            {session && previewPublicView && (
              <div className="bg-[#5e2ced] text-white px-4 py-2 text-xs font-bold text-center flex items-center justify-center gap-3">
                <span>Previewing Public Visitor Landing Page (You are signed in as {session.user})</span>
                <button
                  type="button"
                  onClick={() => setPreviewPublicView(false)}
                  className="bg-white text-[#5e2ced] px-3 py-1 rounded-full text-[11px] hover:bg-slate-100 transition cursor-pointer"
                >
                  Return to Host Command Center
                </button>
              </div>
            )}

            {/* Subtle Top Gradient Mesh */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] bg-gradient-to-b from-[#f3effc]/80 via-[#f6f3fe]/40 to-transparent blur-[100px] -z-10 pointer-events-none" />

            {/* 1. HERO SECTION */}
            <section className="relative pt-8 pb-14 sm:pt-14 sm:pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              {/* Top Trust Pill */}
              <div className="flex justify-center mb-6">
                <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#e7e1f8] px-4 py-1.5 text-xs font-semibold text-[#5e2ced] shadow-sm shadow-purple-500/5 hover:border-[#5e2ced]/40 transition-all">
                  <span className="flex h-2 w-2 rounded-full bg-[#5e2ced] animate-pulse" />
                  <span>The #1 Event Management &amp; Online RSVP Platform</span>
                  <span className="text-[#6e6a86] hidden sm:inline">• Trusted by Fortune 500s</span>
                </div>
              </div>

              {/* Main Headline */}
              <div className="text-center max-w-4xl mx-auto space-y-5">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-[#191236]">
                  From invite to insights.{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5e2ced] via-[#775ae0] to-[#a485fd] block sm:inline">
                    Enterprise event software anyone can run.
                  </span>
                </h1>

                {/* Subtitle */}
                <p className="text-base sm:text-xl text-[#5b6072] max-w-2xl mx-auto leading-relaxed font-normal">
                  Replace the patchwork of tools. Plan, invite, register, sell tickets, manage custom dietary preferences, and check guests in from one unified event operations platform.
                </p>

                {/* Visitor Action CTAs */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
                  <Link
                    href="/signup"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-8 py-4 text-base font-bold text-white shadow-lg shadow-purple-600/25 transition-all active:scale-[0.98] group cursor-pointer"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href="/showcase"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#f6f3fe] border border-[#e7e1f8] px-7 py-4 text-sm font-bold text-[#191236] transition-all shadow-sm shadow-purple-500/5 cursor-pointer"
                  >
                    <Sparkles className="h-4 w-4 text-[#5e2ced]" />
                    <span>Interactive Product Showcase</span>
                  </Link>

                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-6 py-4 text-sm font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    <Lock className="h-4 w-4 text-slate-500" />
                    <span>Host Sign In</span>
                  </Link>
                </div>

                {/* Micro Trust Indicators */}
                <div className="pt-3 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-[#5b6072]">
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[#5e2ced] stroke-[3]" />
                    <span>Free to get started</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[#5e2ced] stroke-[3]" />
                    <span>Level-H Vector QR passes</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[#5e2ced] stroke-[3]" />
                    <span>12ms Offline scanner</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Check className="h-4 w-4 text-[#5e2ced] stroke-[3]" />
                    <span>Zero IDOR / RBAC Security</span>
                  </span>
                </div>
              </div>

              {/* 2. DEDICATED SHOWCASE CALLOUT BANNER (Replaces heavy embedded showcase) */}
              <div className="mt-12 max-w-4xl mx-auto">
                <div className="rounded-3xl bg-gradient-to-r from-white via-[#fbfaff] to-[#f3effc]/60 border border-[#e7e1f8] p-6 sm:p-8 shadow-xl shadow-purple-900/5 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-2 max-w-xl">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3effc] text-[#5e2ced] text-xs font-bold border border-[#e7e1f8]">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Dedicated Interactive Playground</span>
                    </div>

                    <h3 className="text-xl sm:text-2xl font-black text-[#191236]">
                      Want to test our registration engine &amp; turnstile scanner live?
                    </h3>

                    <p className="text-xs sm:text-sm text-[#5b6072] leading-relaxed">
                      Visit our dedicated Showcase page to simulate custom dietary forms, customize digital badges with security emblems, and test live 12ms gate scans.
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold text-slate-600">
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#e7e1f8]">1. Custom RSVP Forms</span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#e7e1f8]">2. Vector Pass Simulator</span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#e7e1f8]">3. 12ms Gate Scanner</span>
                      <span className="px-2.5 py-1 rounded-lg bg-white border border-[#e7e1f8]">4. Seating Layouts</span>
                    </div>
                  </div>

                  <Link
                    href="/showcase"
                    className="inline-flex items-center justify-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] text-white px-7 py-3.5 text-xs font-bold shadow-md shadow-purple-500/20 transition-all self-start md:self-center shrink-0 cursor-pointer"
                  >
                    <span>Launch Showcase →</span>
                  </Link>
                </div>
              </div>
            </section>

            {/* 4. SOCIAL PROOF LOGO WALL */}
            <section className="border-y border-[#e7e1f8] bg-white py-10">
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
                <p className="text-xs font-extrabold uppercase tracking-widest text-[#6e6a86]">
                  Trusted by industry leaders, Fortune 500 companies &amp; world-class institutions
                </p>
                <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
                  <span className="text-lg font-black tracking-tighter text-[#191236]">Google</span>
                  <span className="text-lg font-serif font-black tracking-tight text-[#191236]">HARVARD</span>
                  <span className="text-lg font-black tracking-wider text-[#191236]">STRIPE</span>
                  <span className="text-lg font-mono font-bold tracking-tight text-[#191236]">Techstars</span>
                  <span className="text-lg font-sans font-extrabold tracking-tight text-[#191236]">STANFORD</span>
                  <span className="text-lg font-black tracking-widest text-[#191236]">TEDx</span>
                </div>
              </div>
            </section>

            {/* 5. SOLUTIONS MATRIX */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" id="solutions">
              <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
                <span className="text-xs font-bold uppercase tracking-wider text-[#5e2ced] bg-[#f3effc] px-3 py-1 rounded-full border border-[#e7e1f8]">
                  Built for Every Event Scale
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#191236]">
                  Solutions tailored to your exact event format.
                </h2>
                <p className="text-sm text-[#5b6072]">
                  From multi-track corporate conferences to intimate charity dinners, RSVP delivers battle-tested operations.
                </p>

                {/* Category Pills */}
                <div className="flex flex-wrap items-center justify-center gap-2 pt-4">
                  {[
                    { id: "corporate", label: "Corporate Summits", icon: Building2 },
                    { id: "tech", label: "Tech Hackathons", icon: Laptop },
                    { id: "nonprofit", label: "Non-Profit Galas", icon: Star },
                    { id: "private", label: "VIP Banquets", icon: UtensilsCrossed },
                  ].map((cat) => {
                    const Icon = cat.icon;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setSolutionCategory(cat.id as any)}
                        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold transition-all cursor-pointer ${
                          solutionCategory === cat.id
                            ? "bg-[#5e2ced] text-white shadow-sm"
                            : "bg-white text-[#5b6072] border border-[#e7e1f8] hover:bg-[#f6f3fe]"
                        }`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                        <span>{cat.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Solution Active Display Card */}
              <div className="rounded-3xl bg-white border border-[#e7e1f8] p-8 shadow-sm">
                {solutionCategory === "corporate" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-purple-50 text-[#5e2ced] flex items-center justify-center font-bold">1</div>
                      <h4 className="text-sm font-bold text-[#191236]">Multi-Track Session RSVP</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Let delegates choose individual keynotes, breakout workshops, and executive networking sessions.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-purple-50 text-[#5e2ced] flex items-center justify-center font-bold">2</div>
                      <h4 className="text-sm font-bold text-[#191236]">Avery Badge Label Printing</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Print high-resolution conference badges with delegate company, position, and dietary tags.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-purple-50 text-[#5e2ced] flex items-center justify-center font-bold">3</div>
                      <h4 className="text-sm font-bold text-[#191236]">Enterprise RBAC Isolation</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Restricted gatekeeper logins ensure station staff never view revenue ledgers or sensitive company data.</p>
                    </div>
                  </div>
                )}

                {solutionCategory === "tech" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">1</div>
                      <h4 className="text-sm font-bold text-[#191236]">Hackathon Team RSVP</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Collect GitHub profiles, dietary needs, t-shirt sizes, and emergency contact details in one clean flow.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">2</div>
                      <h4 className="text-sm font-bold text-[#191236]">12ms Turnstile Validation</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Check in hundreds of developers in minutes with camera wedge scanners, even during venue Wi-Fi drops.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">3</div>
                      <h4 className="text-sm font-bold text-[#191236]">Automated Waitlist Promotion</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Enforce strict capacity limits; approved attendees receive instant passes when waitlisted spots open up.</p>
                    </div>
                  </div>
                )}

                {solutionCategory === "nonprofit" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">1</div>
                      <h4 className="text-sm font-bold text-[#191236]">Gala Table Sponsorships</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Sell entire corporate sponsor tables or individual donor seats with automated tax invoices.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">2</div>
                      <h4 className="text-sm font-bold text-[#191236]">0% Platform Surcharge</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Keep 100% of donor proceeds on free registration events without surprise per-ticket charges.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">3</div>
                      <h4 className="text-sm font-bold text-[#191236]">VIP Table Seating Charts</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Assign donors and dignitaries to specific banquet tables; seating details display directly on their digital pass.</p>
                    </div>
                  </div>
                )}

                {solutionCategory === "private" && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">1</div>
                      <h4 className="text-sm font-bold text-[#191236]">Invite-Only Gate Screening</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Require organizer approval for every RSVP before ticket passes and venue coordinates are released.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">2</div>
                      <h4 className="text-sm font-bold text-[#191236]">Anti-Duplicate Passes</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">HMAC signed QR tokens prevent screenshot reuse, guest transfer fraud, and duplicate entries.</p>
                    </div>
                    <div className="space-y-2">
                      <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">3</div>
                      <h4 className="text-sm font-bold text-[#191236]">Dietary &amp; Allergy Ledger</h4>
                      <p className="text-xs text-[#5b6072] leading-relaxed">Catering staff receive live real-time tallies of vegetarian, vegan, and gluten-free plates required.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* 6. LIVE PUBLIC EVENTS DIRECTORY */}
            <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto border-t border-[#e7e1f8]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#5e2ced] bg-[#f3effc] px-3 py-1 rounded-full border border-[#e7e1f8]">
                    Public Events
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#191236] mt-2">
                    Explore Live Events in RSVP Pro
                  </h3>
                  <p className="text-xs sm:text-sm text-[#5b6072]">
                    Register for public conferences, summits, and hackathons hosted on our platform.
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="rounded-3xl bg-white/70 border border-[#e7e1f8] p-6 space-y-4 animate-pulse">
                      <div className="h-5 w-24 bg-[#e7e1f8] rounded-full" />
                      <div className="h-6 w-3/4 bg-[#e7e1f8] rounded-lg" />
                      <div className="h-4 w-1/2 bg-[#f3effc] rounded" />
                    </div>
                  ))}
                </div>
              ) : events.length === 0 ? (
                <div className="rounded-3xl border border-[#e7e1f8] bg-white p-12 text-center space-y-4">
                  <CalendarCheck className="h-10 w-10 text-[#5e2ced] mx-auto" />
                  <h4 className="text-base font-bold text-[#191236]">No public events configured yet</h4>
                  <p className="text-xs text-[#5b6072] max-w-md mx-auto">
                    Ready to host your first conference, banquet, or summit? Create an event in 60 seconds with full RSVP &amp; gate check-in support.
                  </p>
                  <Link
                    href="/signup"
                    className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2ced] text-white px-5 py-2.5 text-xs font-bold"
                  >
                    <span>Sign Up to Host an Event</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {events.map((evt) => (
                    <div
                      key={evt.id}
                      className="rounded-3xl bg-white border border-[#e7e1f8] p-6 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 hover:border-[#5e2ced]/40 transition-all flex flex-col justify-between space-y-5 group"
                    >
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-[#f3effc] text-[#5e2ced] px-2.5 py-0.5 rounded-full border border-[#e7e1f8]">
                            Open for RSVPs
                          </span>
                          <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                            Live Event
                          </span>
                        </div>

                        <h4 className="text-base font-extrabold text-[#191236] group-hover:text-[#5e2ced] transition-colors leading-snug">
                          {evt.title}
                        </h4>

                        <p className="text-xs text-[#5b6072] line-clamp-2 leading-relaxed">
                          {evt.description || "Join us for this premier event. Reserve your spot online."}
                        </p>

                        <div className="space-y-1.5 text-xs text-[#5b6072] pt-2 border-t border-[#f3effc]">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-3.5 w-3.5 text-[#5e2ced]" />
                            <span>{formatDate(evt.start_date)} at {formatTime(evt.start_date)}</span>
                          </div>
                          {evt.location_name && (
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3.5 w-3.5 text-[#6e6a86]" />
                              <span className="truncate">{evt.location_name}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-[#f3effc] flex items-center justify-between">
                        <span className="text-[11px] font-mono text-[#6e6a86]">
                          Free Entry
                        </span>

                        <Link
                          href={`/e/${evt.slug}`}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] text-white px-4 py-2 text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          <span>Register / RSVP</span>
                          <ArrowRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 7. CALL TO ACTION BANNER */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="rounded-3xl bg-gradient-to-br from-[#191236] via-[#241a4a] to-[#191236] p-10 sm:p-16 text-center text-white relative overflow-hidden shadow-2xl space-y-6">
                <div className="absolute top-0 right-0 w-96 h-96 bg-[#5e2ced]/20 rounded-full blur-3xl pointer-events-none" />

                <span className="text-xs font-bold uppercase tracking-wider text-purple-300 bg-white/10 px-4 py-1.5 rounded-full inline-block border border-white/10">
                  Ready to elevate your next event?
                </span>

                <h2 className="text-3xl sm:text-5xl font-black tracking-tight max-w-2xl mx-auto leading-tight">
                  Start hosting with RSVP Pro in under 60 seconds.
                </h2>

                <p className="text-sm sm:text-base text-purple-200/80 max-w-xl mx-auto">
                  Launch custom branded registration forms, sell tickets, manage dietary requirements, and check in 1,000+ guests without lines.
                </p>

                <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                  <Link
                    href="/signup"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-8 py-4 text-sm font-bold text-white shadow-xl shadow-purple-600/30 transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>

                  <Link
                    href="/showcase"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white/10 hover:bg-white/15 border border-white/20 px-8 py-4 text-sm font-bold text-white transition-all cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-purple-300" />
                    <span>View Interactive Showcase</span>
                  </Link>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* FOOTER */}
      <footer className="border-t border-[#e7e1f8] bg-white py-12 text-xs text-[#5b6072]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#5e2ced] text-white">
              <CalendarCheck className="h-4 w-4" />
            </div>
            <span className="font-extrabold text-[#191236] text-base">RSVP Pro</span>
            <span className="text-[10px] text-slate-400">© 2026 RSVP Operations Inc. All rights reserved.</span>
          </div>

          <div className="flex flex-wrap items-center gap-6 font-semibold">
            <Link href="/showcase" className="hover:text-[#5e2ced] transition-colors">
              Showcase Playground
            </Link>
            <Link href="/login" className="hover:text-[#5e2ced] transition-colors">
              Host Sign In
            </Link>
            <Link href="/signup" className="hover:text-[#5e2ced] transition-colors">
              Create Account
            </Link>
            <Link href="/login?mode=station" className="hover:text-[#5e2ced] transition-colors">
              Gate Staff Station
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
