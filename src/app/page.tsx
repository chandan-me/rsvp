import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  CalendarCheck,
  QrCode,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle,
  BarChart3,
  Layers,
} from "lucide-react";
import { eventService } from "@/lib/services/eventService";

export default async function HomePage() {
  const events = await eventService.getEvents();
  const demoEvent = events[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-12 pb-20 sm:pt-16 sm:pb-28">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(45rem_50rem_at_top,theme(colors.sky.100),theme(colors.slate.50))] opacity-70" />

          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3.5 py-1 text-xs font-semibold text-sky-700 border border-sky-200/80 mb-6 shadow-2xs">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Next-Gen Event Operations & RSVP Engine</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 max-w-3xl mx-auto leading-[1.12]">
              Effortless RSVPs. <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-600 to-indigo-600">
                Flawless Guest Check-In.
              </span>
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Designed with the focused simplicity of RSVPify, built on production-grade PostgreSQL architecture. Create events, collect responses, and verify attendees in milliseconds.
            </p>

            {/* Quick Action CTAs */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              {demoEvent ? (
                <Link
                  href={`/events/${demoEvent.id}`}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  <span>Open Host Dashboard</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <Link
                  href="/events/new"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white shadow-md hover:bg-slate-800 transition-all active:scale-[0.98]"
                >
                  <span>Create Your First Event</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              )}

              {demoEvent && (
                <Link
                  href={`/e/${demoEvent.slug}`}
                  target="_blank"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-all"
                >
                  <span>Preview Public RSVP Page</span>
                  <span className="text-xs bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">
                    /e/{demoEvent.slug.slice(0, 16)}...
                  </span>
                </Link>
              )}
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="py-12 border-t border-slate-200/80 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-xl mx-auto mb-12">
              <h2 className="text-xs uppercase font-bold tracking-wider text-sky-600 mb-2">
                Engineered for Reliability
              </h2>
              <p className="text-2xl font-bold tracking-tight text-slate-900">
                Core Workflow Without the Clutter
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="rounded-2xl border border-slate-200/80 p-6 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                <div className="h-10 w-10 rounded-xl bg-sky-100 text-sky-700 flex items-center justify-center mb-4">
                  <Users className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Dynamic RSVP Engine</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Collect party headcounts, dietary restrictions, session breakout choices, and notes with customizable schema fields and server-side validation.
                </p>
              </div>

              {/* Feature 2 */}
              <div className="rounded-2xl border border-slate-200/80 p-6 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                <div className="h-10 w-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center mb-4">
                  <QrCode className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Instant Gate Check-In</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Zero-latency camera QR scanner, duplicate check-in prevention, and manual lookup with audible verification cues.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="rounded-2xl border border-slate-200/80 p-6 bg-slate-50/50 hover:bg-white hover:shadow-md transition-all">
                <div className="h-10 w-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center mb-4">
                  <BarChart3 className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-2">Live Attendance Roster</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Real-time headcount tracking, one-click CSV roster export, search/filter controls, and automated email invitations with logs.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <p>Production RSVP & Event Management SaaS • Supabase PostgreSQL</p>
      </footer>
    </div>
  );
}
