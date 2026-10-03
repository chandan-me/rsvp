"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Users,
  ShieldCheck,
  DoorOpen,
  MapPin,
  Utensils,
  Clock,
  CheckCircle2,
  XCircle,
  Scan,
  RefreshCw,
  ExternalLink,
  Layers,
  ArrowRight,
} from "lucide-react";
import { Event, EventStats, ScanLog } from "@/types/database";
import { AuthGuard } from "@/components/AuthGuard";

export default function OperationsManagerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [stats, setStats] = useState<EventStats | null>(null);
  const [scanLogs, setScanLogs] = useState<ScanLog[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadEvents() {
    const sessionStr = localStorage.getItem("rsvp_auth_session");
    if (!sessionStr) {
      window.location.replace(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/events");
      if (res.ok) {
        const data = await res.json();
        const evList: Event[] = data.events || [];
        setEvents(evList);
        if (evList.length > 0) {
          setSelectedEventId(evList[0].id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadEventOperations(evId: string) {
    if (!evId) return;
    try {
      const res = await fetch(`/api/events/${evId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats || null);
      }
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadEventOperations(selectedEventId);
    }
  }, [selectedEventId]);

  const selectedEvent = events.find((e) => e.id === selectedEventId);
  const checkinRate =
    stats && stats.totalGuests > 0
      ? Math.round((stats.checkedInCount / stats.totalGuests) * 100)
      : 0;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      {/* Top Operations Header */}
      <header className="bg-slate-50 border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-sm shadow-sky-600/30">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  Operations & Security Command
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 uppercase tracking-wider">
                  Manager Portal
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Live gate ingress, guest movement, and staff verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/employee/scanner"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Scan className="w-3.5 h-3.5" />
              Launch Field Scanner
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        {/* Event Selector Banner */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 uppercase tracking-wider">
              Selected Event
            </label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
            >
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.slug})
                </option>
              ))}
            </select>
          </div>

          {selectedEvent && (
            <div className="flex items-center gap-3">
              <Link
                href={`/events/${selectedEvent.id}`}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-600 hover:text-sky-700 bg-white border border-sky-200 px-3.5 py-2 rounded-xl shadow-2xs"
              >
                <span>View Full Roster & Gates</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Operational Metrics Cards (Strictly Operational - Zero Financials) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Registered Attendees
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-600">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats?.totalGuests || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Confirmed guest roster list</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Inside Venue
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
                <DoorOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{stats?.checkedInCount || 0}</div>
            <p className="text-xs text-slate-500 mt-1">Checked in through gates</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Check-in Ingress Rate
              </span>
              <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{checkinRate}%</div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 mt-2">
              <div
                className="bg-purple-600 h-1.5 rounded-full"
                style={{ width: `${Math.min(100, checkinRate)}%` }}
              />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pending Arrivals
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              {Math.max(0, (stats?.totalGuests || 0) - (stats?.checkedInCount || 0))}
            </div>
            <p className="text-xs text-slate-500 mt-1">Expected guests not yet scanned</p>
          </div>
        </div>

        {/* Quick Station Navigation */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <h2 className="text-base font-bold text-slate-900 mb-4">Operations Fast Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href="/employee/scanner"
              className="p-4 rounded-xl border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 transition group flex flex-col justify-between"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 rounded-lg bg-sky-100 group-hover:bg-sky-600 group-hover:text-white transition flex items-center justify-center text-sky-600">
                  <Scan className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Field Scanner</h3>
                  <p className="text-xs text-slate-500">Mobile gate & food verification</p>
                </div>
              </div>
              <span className="text-xs font-bold text-sky-600 flex items-center gap-1 mt-2">
                Launch Terminal &rarr;
              </span>
            </Link>

            {selectedEvent && (
              <Link
                href={`/events/${selectedEvent.id}`}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group flex flex-col justify-between"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition flex items-center justify-center text-slate-700">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Guest Screening</h3>
                    <p className="text-xs text-slate-500">Approve, waitlist, or block</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-2">
                  Open Roster &rarr;
                </span>
              </Link>
            )}

            {selectedEvent && (
              <Link
                href={`/events/${selectedEvent.id}/badges`}
                className="p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition group flex flex-col justify-between"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 group-hover:bg-slate-900 group-hover:text-white transition flex items-center justify-center text-slate-700">
                    <DoorOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Badge Studio</h3>
                    <p className="text-xs text-slate-500">Print lanyard badges & labels</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mt-2">
                  Open Badges &rarr;
                </span>
              </Link>
            )}
          </div>
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
