import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import { AuthGuard } from "@/components/AuthGuard";
import {
  Calendar,
  MapPin,
  QrCode,
  ArrowRight,
  ExternalLink,
  Plus,
  Printer,
  Scan,
} from "lucide-react";
import { eventService } from "@/lib/services/eventService";
import { securityService } from "@/lib/services/securityService";
import { formatDate, formatTime } from "@/lib/utils";

export default async function EventsPage() {
  // Server-side auth check: verify cryptographically signed session token
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get("rsvp_session_token")?.value || cookieStore.get("rsvp_auth_session")?.value;
  if (!sessionToken || !securityService.verifySignedSessionToken(sessionToken)) {
    redirect("/login?redirect=/events");
  }

  const rawEvents = await eventService.getEvents();
  const events = await Promise.all(
    rawEvents.map(async (event) => {
      const stats = await eventService.getEventStats(event.id, event);
      return { ...event, stats };
    })
  );

  return (
    <AuthGuard>
      <div className="min-h-screen bg-[#fbfaff] flex flex-col selection:bg-[#5e2ced] selection:text-white">
        <Navbar />

        <main className="flex-1 mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#191236]">
                Host Events Dashboard
              </h1>
              <p className="text-sm text-[#5b6072] mt-1">
                Manage your live events, attendee rosters, custom questionnaires, and gate check-in stations.
              </p>
            </div>

            <Link
              href="/events/new"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-[#5e2ced]/20 transition-all active:scale-[0.98] self-start sm:self-auto cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create New Event</span>
            </Link>
          </div>

          {events.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[#e7e1f8] bg-white p-12 text-center shadow-xs">
              <Calendar className="mx-auto h-12 w-12 text-[#a485fd] mb-3" />
              <h3 className="text-base font-bold text-[#191236]">No events yet</h3>
              <p className="text-xs text-[#5b6072] mt-1 max-w-sm mx-auto">
                Get started by creating your first event to invite guests and collect responses.
              </p>
              <Link
                href="/events/new"
                className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-5 py-2.5 text-xs font-bold text-white shadow-sm shadow-[#5e2ced]/20"
              >
                <Plus className="h-4 w-4" />
                <span>Create Event</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((event) => {
                const stats = event.stats;

                return (
                  <div
                    key={event.id}
                    className="group relative flex flex-col overflow-hidden rounded-3xl border border-[#e7e1f8] bg-white shadow-xs hover:shadow-xl hover:shadow-purple-500/5 hover:border-[#5e2ced]/40 transition-all"
                  >
                    {/* Event Cover Banner */}
                    <div className="relative h-44 w-full bg-[#f3effc] overflow-hidden">
                      {event.cover_image_url ? (
                        <img
                          src={event.cover_image_url}
                          alt={event.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="h-full w-full bg-gradient-to-tr from-[#5e2ced] to-[#7c3aed] flex items-center justify-center">
                          <Calendar className="h-10 w-10 text-white/50" />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className="rounded-full bg-white/95 backdrop-blur-xs px-2.5 py-1 text-[11px] font-bold text-[#5e2ced] shadow-xs border border-[#e7e1f8]">
                          {event.is_published ? "Published" : "Draft"}
                        </span>
                      </div>
                    </div>

                    {/* Body Content */}
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <h2 className="text-base font-bold text-[#191236] group-hover:text-[#5e2ced] transition-colors line-clamp-1">
                          {event.title}
                        </h2>

                        <div className="mt-3 space-y-1.5 text-xs text-[#5b6072]">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-[#5e2ced] shrink-0" />
                            <span>
                              {formatDate(event.start_date, event.timezone)} at{" "}
                              {formatTime(event.start_date, event.timezone)}
                            </span>
                          </div>
                          {event.location_name && (
                            <div className="flex items-center gap-1.5 truncate">
                              <MapPin className="h-3.5 w-3.5 text-[#5e2ced] shrink-0" />
                              <span className="truncate">{event.location_name}</span>
                            </div>
                          )}
                        </div>

                        {/* Headcount pill stats */}
                        <div className="mt-4 grid grid-cols-3 gap-2 rounded-2xl bg-[#fbfaff] border border-[#e7e1f8] p-2.5 text-center text-xs">
                          <div>
                            <span className="text-[10px] text-[#6e6a86] uppercase font-bold block">Attending</span>
                            <span className="font-extrabold text-[#5e2ced]">{stats.totalAttendeesCount}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#6e6a86] uppercase font-bold block">Checked In</span>
                            <span className="font-extrabold text-emerald-600">{stats.checkedInCount}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-[#6e6a86] uppercase font-bold block">Pending</span>
                            <span className="font-extrabold text-amber-600">{stats.pending + stats.invited}</span>
                          </div>
                        </div>
                      </div>

                      {/* Action Links */}
                      <div className="mt-5 pt-4 border-t border-[#e7e1f8] space-y-3">
                        {/* Quick Tool Navigation Chips */}
                        <div className="flex items-center gap-1.5 flex-wrap text-[11px] font-bold">
                          <Link
                            href={`/events/${event.id}/badges`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#fbfaff] hover:bg-[#f3effc] text-slate-700 hover:text-[#5e2ced] border border-[#e7e1f8] transition"
                            title="Name Badge Print Studio"
                          >
                            <Printer className="h-3 w-3 text-[#5e2ced]" />
                            <span>Badges</span>
                          </Link>

                          <Link
                            href={`/events/${event.id}/checkin`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#fbfaff] hover:bg-[#f3effc] text-slate-700 hover:text-[#5e2ced] border border-[#e7e1f8] transition"
                            title="Check-In Gate Hub"
                          >
                            <QrCode className="h-3 w-3 text-[#5e2ced]" />
                            <span>Gate Hub</span>
                          </Link>

                          <Link
                            href={`/employee/scanner?event=${event.id}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#fbfaff] hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-[#e7e1f8] transition"
                            title="Field Terminal Scanner"
                          >
                            <Scan className="h-3 w-3 text-emerald-600" />
                            <span>Scanner</span>
                          </Link>

                          <Link
                            href={`/e/${event.slug}`}
                            target="_blank"
                            title="Open public RSVP page"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-slate-500 hover:text-[#5e2ced] transition ml-auto text-[11px]"
                          >
                            <span>RSVP</span>
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </div>

                        {/* Primary Manage Button */}
                        <Link
                          href={`/events/${event.id}`}
                          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#5e2ced] hover:bg-[#5225d3] text-white py-2 text-xs font-bold shadow-xs shadow-[#5e2ced]/20 transition-all cursor-pointer"
                        >
                          <span>Manage Roster &amp; Settings</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  );
}
