"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarCheck, Plus, Sparkles, Database, Camera, QrCode } from "lucide-react";

export function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/events" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm group-hover:bg-sky-600 transition-colors">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold tracking-tight text-slate-900 text-base flex items-center gap-1.5">
                RSVP<span className="text-sky-600">Pro</span>
              </span>
              <span className="text-[10px] text-slate-500 font-medium -mt-1">Event Management</span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 text-sm font-medium">
            <Link
              href="/events"
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                pathname.startsWith("/events")
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Events
            </Link>
            <Link
              href="/e/craft-and-code-summit-2026"
              target="_blank"
              className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <span>Public RSVP Page</span>
              <span className="text-[10px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded font-mono">demo</span>
            </Link>
          </nav>
        </div>

        {/* Right side CTAs */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/checkin"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Open Live Check-In Gate"
          >
            <Camera className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Gate</span>
            <span>Check-In</span>
          </Link>

          <Link
            href="/events/new"
            className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-sky-500 transition-all active:scale-[0.98]"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Create</span>
            <span>Event</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
