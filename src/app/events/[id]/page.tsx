"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { AdminSidebar, AdminTabId } from "@/components/AdminSidebar";
import { StatsCards } from "@/components/StatsCards";
import { GuestTable } from "@/components/GuestTable";
import { QuestionBuilder } from "@/components/QuestionBuilder";
import { EventSettingsTab } from "@/components/EventSettingsTab";
import { GateHub } from "@/components/GateHub";
import { BroadcastTab } from "@/components/BroadcastTab";
import { ScreeningTab } from "@/components/ScreeningTab";
import { TicketTiersTab } from "@/components/TicketTiersTab";
import { EventConfigTab } from "@/components/EventConfigTab";
import { FinancialsTab } from "@/components/FinancialsTab";
import { AuthGuard } from "@/components/AuthGuard";
import {
  Calendar,
  MapPin,
  Users,
  Settings,
  HelpCircle,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Loader2,
  Clock,
  Sparkles,
  ShieldCheck,
  Printer,
  Mail,
  Radio,
  CheckSquare,
  Tags,
  BadgeCheck,
} from "lucide-react";
import { Event, EventSettings, EventStats, Guest, RsvpQuestion } from "@/types/database";
import { formatDate, formatTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function EventDashboardPage({ params }: PageProps) {
  const { id: eventId } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [tierCount, setTierCount] = useState<number>(0);
  const [enabledModules, setEnabledModules] = useState<string[]>([]);
  const [userRole, setUserRole] = useState<string>("admin");
  const [activeTab, setActiveTab] = useState<AdminTabId>("overview");
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [liveSyncActive, setLiveSyncActive] = useState(false);

  async function loadEventData() {
    try {
      const [resEvent, resGuests, resQuestions, resTiers, resConfig] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/guests`),
        fetch(`/api/events/${eventId}/questions`),
        fetch(`/api/events/${eventId}/tiers`),
        fetch(`/api/events/${eventId}/config`),
      ]);

      if (resEvent.ok) {
        const eventData = await resEvent.json();
        setEvent(eventData.event);
        setStats(eventData.stats);
        setSettings(eventData.settings);
      }

      if (resGuests.ok) {
        const guestData = await resGuests.json();
        setGuests(guestData.guests || []);
      }

      if (resQuestions.ok) {
        const qData = await resQuestions.json();
        setQuestions(qData.questions || []);
      }

      if (resTiers.ok) {
        const tierData = await resTiers.json();
        setTierCount(tierData.tiers?.length || 0);
      }

      if (resConfig.ok) {
        const configData = await resConfig.json();
        const activeKeys = (configData.modules || [])
          .filter((m: any) => m.is_enabled)
          .map((m: any) => m.module_key);
        setEnabledModules(activeKeys);
      }

      const sessionStr = localStorage.getItem("rsvp_auth_session");
      if (!sessionStr) {
        window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
        return;
      }
      try {
        const session = JSON.parse(sessionStr);
        if (session?.role) setUserRole(session.role);
      } catch {
        // ignore
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEventData();

    // 1. Cross-tab BroadcastChannel listener for zero-latency same-device sync
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        bc = new BroadcastChannel(`rsvp_sync_${eventId}`);
        bc.onmessage = (msg) => {
          if (msg.data?.type === "CHECKIN" || msg.data?.type === "STATUS_CHANGE") {
            loadEventData();
          }
        };
        setLiveSyncActive(true);
      }
    } catch (err) {
      console.warn("BroadcastChannel not supported", err);
    }

    // 2. Cross-device poll every 6s for multi-station updates
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/live-sync?since=${Date.now() - 7000}`);
        if (res.ok) {
          const data = await res.json();
          if (data.events && data.events.length > 0) {
            loadEventData();
          }
        }
      } catch {
        // silent catch
      }
    }, 6000);

    return () => {
      if (bc) bc.close();
      clearInterval(interval);
    };
  }, [eventId]);

  function copyPublicLink() {
    if (!event) return;
    const url = `${window.location.origin}/e/${event.slug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <p className="text-xs text-slate-500 font-medium">Loading event dashboard...</p>
        </div>
      </div>
    );
  }

  if (!event || !stats || !settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center max-w-md shadow-xs">
          <p className="font-semibold text-slate-800">Event Not Found</p>
          <p className="text-xs text-slate-500 mt-1">This event may have been removed.</p>
          <Link
            href="/events"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Events</span>
          </Link>
        </div>
      </div>
    );
  }

  const pendingApprovalsCount = guests.filter(
    (g) => g.status === "pending_approval" || g.status === "waitlisted"
  ).length;

  const checkedInCount = stats.checkedInCount || 0;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 flex flex-row">
      {/* 1. Left Admin Sidebar (Matching Reference Image) */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        eventTitle={event.title}
        eventSlug={event.slug}
        guestCount={guests.length}
        pendingCount={pendingApprovalsCount}
        tierCount={tierCount}
        questionCount={questions.length}
        checkedInCount={checkedInCount}
        enabledModules={enabledModules}
        userRole={userRole}
      />

      {/* 2. Main Admin Canvas */}
      <main className="flex-1 min-w-0 flex flex-col h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <header className="bg-white border-b border-slate-200/80 px-6 py-4 sticky top-0 z-20 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <Link
                  href="/events"
                  className="text-slate-400 hover:text-slate-700 transition-colors p-1 -ml-1 rounded"
                  title="All Events"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Link>
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
                  {event.title}
                </h1>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-semibold text-slate-700">
                  {event.is_published ? "Published" : "Draft"}
                </span>
                {liveSyncActive && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-semibold">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <span>Live Sync</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  {formatDate(event.start_date, event.timezone)} at {formatTime(event.start_date, event.timezone)}
                </span>
                {event.location_name && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-slate-400" />
                    {event.location_name}
                  </span>
                )}
              </div>
            </div>

            {/* Header Right Actions */}
            <div className="flex items-center gap-2 self-start sm:self-auto">
              <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl p-1 text-xs">
                <span className="font-mono text-[11px] text-slate-600 px-2 truncate max-w-[140px] sm:max-w-[200px]">
                  /e/{event.slug}
                </span>
                <button
                  onClick={copyPublicLink}
                  title="Copy registration link"
                  className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  {copiedLink ? (
                    <span className="text-emerald-700 flex items-center gap-1">
                      <Check className="h-3 w-3" />
                      <span>Copied</span>
                    </span>
                  ) : (
                    <span>Copy</span>
                  )}
                </button>
                <Link
                  href={`/e/${event.slug}`}
                  target="_blank"
                  title="Open live page in new tab"
                  className="p-1 text-slate-500 hover:text-slate-800"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6">
          {/* Tab 1: Dashboard Overview */}
          {activeTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <StatsCards stats={stats} />

              {/* Event Summary Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2 space-y-4">
                  <h3 className="font-bold text-slate-900 text-sm">Event Overview & Details</h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {event.description || "No description provided yet."}
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 text-xs text-slate-600 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block uppercase font-bold text-[10px]">Venue Location</span>
                      <span className="font-semibold text-slate-800">{event.location_name || "Online / TBD"}</span>
                      {event.location_address && <p className="text-slate-500 mt-0.5">{event.location_address}</p>}
                    </div>
                    <div>
                      <span className="text-slate-400 block uppercase font-bold text-[10px]">Security Policy</span>
                      <span className="font-semibold text-slate-800">
                        {settings.checkin_pin ? "PIN-Protected Gate Authentication" : "Open Gate Station Access"}
                      </span>
                      <p className="text-slate-500 mt-0.5">Sliding window rate limit active</p>
                    </div>
                  </div>
                </div>

                {/* Gate Hub Quick Access Card */}
                <div className="rounded-2xl border border-sky-200 bg-[#f8fafc] p-6 shadow-xs flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-100 text-sky-800 font-bold border border-sky-300 shadow-2xs">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm">Gate & Check-In Hub</h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Multi-station operations: USB barcode wedge scanning, dietary counters, and operator passcodes.
                    </p>
                  </div>

                  <div className="pt-4 mt-4 border-t border-sky-100">
                    <button
                      type="button"
                      onClick={() => setActiveTab("gate_hub")}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="h-4 w-4" />
                      <span>Open Gate Hub</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab: Modules & Topography Configuration */}
          {activeTab === "config" && (
            <div className="animate-in fade-in duration-150">
              <EventConfigTab eventId={event.id} event={event} onRefresh={loadEventData} />
            </div>
          )}

          {/* Tab 2: Guest Roster */}
          {activeTab === "guests" && (
            <div className="animate-in fade-in duration-150">
              <GuestTable eventId={event.id} guests={guests} onRefresh={loadEventData} />
            </div>
          )}

          {/* Tab 3: Tasks & Screening */}
          {activeTab === "screening" && (
            <div className="animate-in fade-in duration-150">
              <ScreeningTab
                eventId={event.id}
                event={event}
                guests={guests}
                onRefresh={loadEventData}
              />
            </div>
          )}

          {/* Tab 4: Ticket Tiers */}
          {activeTab === "tiers" && (
            <div className="animate-in fade-in duration-150">
              <TicketTiersTab eventId={event.id} event={event} />
            </div>
          )}

          {/* Tab 5: RSVP Questions */}
          {activeTab === "questions" && (
            <div className="animate-in fade-in duration-150">
              <QuestionBuilder eventId={event.id} questions={questions} onRefresh={loadEventData} />
            </div>
          )}

          {/* Tab 6: Unified Gate & Check-In Hub (Consolidated in ONE place) */}
          {activeTab === "gate_hub" && (
            <div className="animate-in fade-in duration-150">
              <GateHub
                eventId={event.id}
                event={event}
                settings={settings}
                checkedInCount={checkedInCount}
              />
            </div>
          )}

          {/* Tab: Financial Ledger & Settlements */}
          {activeTab === "financials" && (
            <div className="animate-in fade-in duration-150">
              <FinancialsTab eventId={event.id} userRole={userRole} />
            </div>
          )}

          {/* Tab 7: Email Broadcasts */}
          {activeTab === "broadcast" && (
            <div className="animate-in fade-in duration-150">
              <BroadcastTab eventId={event.id} totalGuests={guests.length} />
            </div>
          )}

          {/* Tab 8: Name Badges Studio */}
          {activeTab === "badges" && (
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900">Name Badge Studio</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Generate and print high-resolution conference badges, clip-ons, and Avery 8-up labels.
                  </p>
                </div>
                <Link
                  href={`/events/${event.id}/badges`}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs"
                >
                  <Printer className="h-4 w-4" />
                  <span>Open Fullscreen Studio</span>
                </Link>
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-8 text-center">
                <Printer className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">Print Badges for {guests.length} Registered Attendees</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Includes attendee company names, colored ticket tier pills, and crisp gate check-in codes.
                </p>
                <Link
                  href={`/events/${event.id}/badges`}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold shadow-xs"
                >
                  <span>Launch Badge Studio</span>
                </Link>
              </div>
            </div>
          )}

          {/* Tab 9: Event Settings */}
          {activeTab === "settings" && (
            <div className="animate-in fade-in duration-150">
              <EventSettingsTab event={event} settings={settings} onRefresh={loadEventData} />
            </div>
          )}
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
