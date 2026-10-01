"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import { CheckinScanner } from "@/components/CheckinScanner";
import {
  ArrowLeft,
  Calendar,
  ShieldCheck,
  Users,
  Clock,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Event, EventStats } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CheckinStationPage({ params }: PageProps) {
  const { id: eventId } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<EventStats | null>(null);
  const [recentCheckins, setRecentCheckins] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  async function loadData() {
    try {
      setIsRefreshing(true);
      const [res, resGuests] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/guests?checkedIn=true`),
      ]);

      if (res.ok) {
        const data = await res.json();
        setEvent(data.event);
        setStats(data.stats);
      }

      if (resGuests.ok) {
        const gData = await resGuests.json();
        setRecentCheckins(gData.guests || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [eventId]);


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3.5 sm:px-6">
        <div className="mx-auto max-w-7xl flex items-center justify-between">
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
                <span>{event?.title || "Check-In Gate"}</span>
                <span className="text-[10px] uppercase font-bold tracking-wider bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-md border border-emerald-500/30">
                  Live Gate
                </span>
              </h1>
            </div>
          </div>

          {stats && (
            <div className="flex items-center gap-4 text-xs">
              <div className="text-right">
                <span className="text-slate-400 text-[10px] uppercase block font-semibold">
                  Live Attendance
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  {stats.checkedInCount} / {stats.totalAttendeesCount || stats.attending} ({stats.checkinPercentage}%)
                </span>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Main Scanner Body */}
      <main className="flex-1 mx-auto max-w-5xl w-full p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: The Camera & Scanner */}
        <div className="lg:col-span-2 space-y-4">
          <CheckinScanner eventId={eventId} onCheckinSuccess={loadData} />
        </div>

        {/* Right Column: Recent Activity Feed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <span className="text-xs uppercase font-bold tracking-wider text-slate-400">
                Recent Arrivals
              </span>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                {recentCheckins.length} verified
              </span>
            </div>

            <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
              {recentCheckins.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500">
                  <Clock className="mx-auto h-8 w-8 text-slate-700 mb-2" />
                  <p>Awaiting first check-in...</p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Scan tickets to populate arrival feed.
                  </p>
                </div>
              ) : (
                recentCheckins.map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center justify-between rounded-xl bg-slate-800/50 border border-slate-800 p-2.5 text-xs hover:border-slate-700 transition-colors"
                  >
                    <div>
                      <span className="font-semibold text-white block">
                        {guest.first_name} {guest.last_name}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate block max-w-[170px]">
                        {guest.email}
                      </span>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[11px] text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>
                          {guest.checkinTime
                            ? new Date(guest.checkinTime).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "Checked In"}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {guest.ticketCode || "Verified"}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 text-center">
            RSVP Pro Gate Station • High-speed QR Engine
          </div>
        </div>
      </main>
    </div>
  );
}
