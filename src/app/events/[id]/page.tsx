"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { StatsCards } from "@/components/StatsCards";
import { GuestTable } from "@/components/GuestTable";
import { QuestionBuilder } from "@/components/QuestionBuilder";
import { EventSettingsTab } from "@/components/EventSettingsTab";
import { CheckinScanner } from "@/components/CheckinScanner";
import { GateStationsTab } from "@/components/GateStationsTab";
import {
  Calendar,
  MapPin,
  Users,
  QrCode,
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
  const [activeTab, setActiveTab] = useState<
    "overview" | "guests" | "questions" | "checkin" | "gate_stations" | "settings"
  >("overview");
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  async function loadEventData() {
    try {
      const [resEvent, resGuests, resQuestions] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/guests`),
        fetch(`/api/events/${eventId}/questions`),
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
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadEventData();
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
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
            <p className="text-xs text-slate-500 font-medium">Loading event dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!event || !stats || !settings) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center max-w-md">
            <p className="font-semibold text-slate-800">Event Not Found</p>
            <p className="text-xs text-slate-500 mt-1">This event may have been removed.</p>
            <Link
              href="/events"
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>All Events</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href={`/events/${event.id}/checkin`}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Open Check-In Station</span>
            </Link>
          </div>
        </div>

        {/* Event Header Banner Card */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {event.title}
              </h1>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                {event.is_published ? "Published" : "Draft"}
              </span>
              {settings.is_rsvp_closed && (
                <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700 border border-rose-200/60">
                  RSVPs Closed
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap pt-1">
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

          {/* Shareable Link Box */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/80 rounded-xl p-1.5 self-start md:self-auto">
            <span className="text-xs font-mono text-slate-600 px-2 truncate max-w-[200px] sm:max-w-[260px]">
              /e/{event.slug}
            </span>
            <button
              onClick={copyPublicLink}
              title="Copy shareable link"
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 border border-slate-200 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all"
            >
              {copiedLink ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy</span>
                </>
              )}
            </button>
            <Link
              href={`/e/${event.slug}`}
              target="_blank"
              title="Open public page in new tab"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-white hover:text-slate-800 transition-colors"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* Dashboard Navigation Tabs */}
        <div className="border-b border-slate-200/90">
          <nav className="flex space-x-2 sm:space-x-4 overflow-x-auto text-sm font-semibold">
            {[
              { id: "overview", label: "Overview & Stats", icon: Users },
              { id: "guests", label: `Guest Roster (${guests.length})`, icon: Users },
              { id: "questions", label: `RSVP Questions (${questions.length})`, icon: HelpCircle },
              { id: "checkin", label: "Scanner Terminal", icon: QrCode },
              { id: "gate_stations", label: "Gate Stations & Staff", icon: ShieldCheck },
              { id: "settings", label: "Event Settings", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`inline-flex items-center gap-2 border-b-2 py-3 px-3 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-sky-600 text-sky-600 font-semibold"
                      : "border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab 1: Overview & Stats */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            <StatsCards stats={stats} />

            {/* Quick Actions & Recent Activity Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Event Summary Card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs lg:col-span-2 space-y-4">
                <h3 className="font-semibold text-slate-900 text-sm">Event Overview</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  {event.description || "No description provided yet."}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-xs text-slate-600 border-t border-slate-100">
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Location</span>
                    <span className="font-semibold text-slate-800">{event.location_name || "Online / TBD"}</span>
                    {event.location_address && <p className="text-slate-500 mt-0.5">{event.location_address}</p>}
                  </div>
                  <div>
                    <span className="text-slate-400 block uppercase font-bold text-[10px]">Check-In Method</span>
                    <span className="font-semibold text-slate-800">
                      QR Camera Scan &amp; Code Verification
                    </span>
                    {settings.checkin_pin && (
                      <p className="text-slate-500 mt-0.5">PIN Protected: ••••</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Check-In Gate Launcher Card */}
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/60 to-white p-6 shadow-xs flex flex-col justify-between">
                <div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 mb-3">
                    <QrCode className="h-5 w-5" />
                  </div>
                  <h3 className="font-semibold text-slate-900 text-base">Check-In Station</h3>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                    Open the dedicated mobile/tablet gate scanner to scan attendee tickets and track live arrivals in real time.
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-emerald-100">
                  <Link
                    href={`/events/${event.id}/checkin`}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500 transition-colors"
                  >
                    <QrCode className="h-4 w-4" />
                    <span>Launch Check-In Gate</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Guests */}
        {activeTab === "guests" && (
          <GuestTable eventId={event.id} guests={guests} onRefresh={loadEventData} />
        )}

        {/* Tab 3: Questions */}
        {activeTab === "questions" && (
          <QuestionBuilder eventId={event.id} questions={questions} onRefresh={loadEventData} />
        )}

        {/* Tab 4: Check-In Scanner Station */}
        {activeTab === "checkin" && (
          <CheckinScanner eventId={event.id} onCheckinSuccess={loadEventData} />
        )}

        {/* Tab 5: Gate Stations & Multi-Staff Logins */}
        {activeTab === "gate_stations" && (
          <GateStationsTab eventId={event.id} event={event} settings={settings} />
        )}

        {/* Tab 6: Settings */}
        {activeTab === "settings" && (
          <EventSettingsTab event={event} settings={settings} onRefresh={loadEventData} />
        )}
      </main>
    </div>
  );
}
