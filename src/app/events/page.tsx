import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  Calendar,
  MapPin,
  Users,
  QrCode,
  ArrowRight,
  ExternalLink,
  Plus,
  Clock,
  CheckCircle,
} from "lucide-react";
import { eventService } from "@/lib/services/eventService";
import { formatDate, formatTime } from "@/lib/utils";

export default async function EventsPage() {
  const events = await eventService.getEvents();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Host Dashboard
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your live events, RSVPs, custom questions, and check-in stations.
            </p>
          </div>

          <Link
            href="/events/new"
            className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-sky-500 transition-colors self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create New Event</span>
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center shadow-xs">
            <Calendar className="mx-auto h-12 w-12 text-slate-300 mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No events yet</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
              Get started by creating your first event to invite guests and collect responses.
            </p>
            <Link
              href="/events/new"
              className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
            >
              <Plus className="h-4 w-4" />
              <span>Create Event</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map(async (event) => {
              const stats = await eventService.getEventStats(event.id);

              return (
                <div
                  key={event.id}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs hover:shadow-md transition-all"
                >
                  {/* Event Cover Banner */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    {event.cover_image_url ? (
                      <img
                        src={event.cover_image_url}
                        alt={event.title}
                        className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-tr from-slate-800 to-sky-900 flex items-center justify-center">
                        <Calendar className="h-10 w-10 text-white/50" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className="rounded-full bg-white/90 backdrop-blur-xs px-2.5 py-1 text-[11px] font-semibold text-slate-800 shadow-xs">
                        {event.is_published ? "Published" : "Draft"}
                      </span>
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="flex-1 p-5 flex flex-col justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-1">
                        {event.title}
                      </h2>

                      <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span>
                            {formatDate(event.start_date, event.timezone)} at{" "}
                            {formatTime(event.start_date, event.timezone)}
                          </span>
                        </div>
                        {event.location_name && (
                          <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                            <span className="truncate">{event.location_name}</span>
                          </div>
                        )}
                      </div>

                      {/* Headcount pill stats */}
                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Attending</span>
                          <span className="font-bold text-emerald-700">{stats.totalAttendeesCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Checked In</span>
                          <span className="font-bold text-sky-700">{stats.checkedInCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Pending</span>
                          <span className="font-bold text-amber-700">{stats.pending + stats.invited}</span>
                        </div>
                      </div>
                    </div>

                    {/* Action Links */}
                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                      <Link
                        href={`/events/${event.id}/checkin`}
                        className="inline-flex items-center gap-1 font-medium text-sky-600 hover:text-sky-800"
                      >
                        <QrCode className="h-3.5 w-3.5" />
                        <span>Check-In Gate</span>
                      </Link>

                      <div className="flex items-center gap-3">
                        <Link
                          href={`/e/${event.slug}`}
                          target="_blank"
                          title="Open public RSVP page"
                          className="text-slate-400 hover:text-slate-600 flex items-center gap-1"
                        >
                          <span>Public RSVP</span>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>

                        <Link
                          href={`/events/${event.id}`}
                          className="font-semibold text-slate-900 hover:text-sky-600 flex items-center gap-1"
                        >
                          <span>Manage</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
