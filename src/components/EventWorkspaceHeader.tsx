"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  LayoutGrid,
  Printer,
  ShieldCheck,
  Scan,
  Activity,
  ExternalLink,
  Copy,
  Check,
  Calendar,
  MapPin,
  ChevronRight,
} from "lucide-react";
import { formatDate, formatTime } from "@/lib/utils";

export type WorkspaceTabId = "overview" | "badges" | "checkin" | "scanner" | "manager";

interface EventWorkspaceHeaderProps {
  eventId: string;
  eventTitle: string;
  eventSlug: string;
  isPublished?: boolean;
  startDate?: string;
  timezone?: string;
  locationName?: string;
  activeWorkspaceTab: WorkspaceTabId;
  totalGuests?: number;
  checkedInCount?: number;
}

export function EventWorkspaceHeader({
  eventId,
  eventTitle,
  eventSlug,
  isPublished = true,
  startDate,
  timezone,
  locationName,
  activeWorkspaceTab,
  totalGuests,
  checkedInCount,
}: EventWorkspaceHeaderProps) {
  const router = useRouter();
  const [copiedLink, setCopiedLink] = useState(false);

  function copyPublicLink() {
    const url = `${window.location.origin}/e/${eventSlug}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  const tabs: {
    id: WorkspaceTabId;
    label: string;
    href: string;
    icon: any;
    badge?: number;
  }[] = [
    {
      id: "overview",
      label: "Overview & Roster",
      href: `/events/${eventId}`,
      icon: LayoutGrid,
      badge: totalGuests,
    },
    {
      id: "badges",
      label: "Name Badges Studio",
      href: `/events/${eventId}/badges`,
      icon: Printer,
    },
    {
      id: "checkin",
      label: "Gate Station Hub",
      href: `/events/${eventId}/checkin`,
      icon: ShieldCheck,
      badge: checkedInCount,
    },
    {
      id: "scanner",
      label: "Field QR Scanner",
      href: `/employee/scanner?event=${eventId}`,
      icon: Scan,
    },
    {
      id: "manager",
      label: "Ops Command",
      href: `/manager?event=${eventId}`,
      icon: Activity,
    },
  ];

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-[#e7e1f8] sticky top-0 z-30 transition-all shadow-xs">
      {/* Top Breadcrumb & Status Ribbon */}
      <div className="border-b border-slate-100 px-4 sm:px-6 py-2 bg-[#fbfaff]">
        <div className="flex items-center justify-between gap-4 text-xs">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1.5 text-slate-500 flex-wrap">
            <Link
              href="/events"
              className="inline-flex items-center gap-1 font-bold text-[#5e2ced] hover:text-[#5225d3] transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>All Events</span>
            </Link>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="font-semibold text-slate-700 truncate max-w-[200px] sm:max-w-xs">
              {eventTitle}
            </span>
            <ChevronRight className="h-3 w-3 text-slate-300" />
            <span className="font-bold text-slate-900 capitalize">
              {activeWorkspaceTab === "overview"
                ? "Dashboard"
                : activeWorkspaceTab === "badges"
                ? "Badge Studio"
                : activeWorkspaceTab === "checkin"
                ? "Gate Hub"
                : activeWorkspaceTab === "scanner"
                ? "Field Terminal"
                : "Ops Command"}
            </span>
          </nav>

          {/* Quick Back / Return button */}
          <button
            type="button"
            onClick={() => router.back()}
            className="text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1 cursor-pointer"
            title="Go to previously viewed page"
          >
            <span>← Previous Page</span>
          </button>
        </div>
      </div>

      {/* Main Event Title & Actions Banner */}
      <div className="px-4 sm:px-6 py-3.5 sm:py-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#191236] truncate">
                {eventTitle}
              </h1>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider ${
                  isPublished
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-slate-100 text-slate-700 border border-slate-200"
                }`}
              >
                {isPublished ? "Live Published" : "Draft"}
              </span>

              {startDate && (
                <span className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-500 font-medium ml-2">
                  <Calendar className="h-3.5 w-3.5 text-[#5e2ced]" />
                  {formatDate(startDate, timezone)} at {formatTime(startDate, timezone)}
                </span>
              )}

              {locationName && (
                <span className="hidden md:inline-flex items-center gap-1 text-xs text-slate-500 font-medium">
                  <MapPin className="h-3.5 w-3.5 text-[#5e2ced]" />
                  <span className="truncate max-w-[200px]">{locationName}</span>
                </span>
              )}
            </div>
          </div>

          {/* Right Action: Public RSVP Link & Copy */}
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <div className="flex items-center gap-1.5 bg-[#fbfaff] border border-[#e7e1f8] rounded-2xl p-1 text-xs shadow-2xs">
              <span className="font-mono text-[11px] text-slate-600 px-2 truncate max-w-[140px] sm:max-w-[200px]">
                /e/{eventSlug}
              </span>
              <button
                type="button"
                onClick={copyPublicLink}
                title="Copy public registration link"
                className="rounded-xl bg-white px-2.5 py-1 text-xs font-bold text-slate-700 border border-[#e7e1f8] shadow-2xs hover:bg-[#f6f3fe] hover:text-[#5e2ced] transition-all cursor-pointer flex items-center gap-1"
              >
                {copiedLink ? (
                  <>
                    <Check className="h-3 w-3 text-emerald-600 stroke-[3]" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3 w-3 text-slate-500" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <Link
                href={`/e/${eventSlug}`}
                target="_blank"
                title="Open public RSVP page in new tab"
                className="p-1.5 rounded-xl text-slate-500 hover:text-[#5e2ced] hover:bg-white transition-all cursor-pointer"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>

        {/* Workspace Pill Navigation Tabs */}
        <div className="mt-3 sm:mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeWorkspaceTab === tab.id;
            return (
              <Link
                key={tab.id}
                href={tab.href}
                className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-[#5e2ced] text-white shadow-xs shadow-[#5e2ced]/20"
                    : "text-slate-600 hover:text-[#191236] hover:bg-[#f3effc]"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-white" : "text-[#5e2ced]"}`} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span
                    className={`ml-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                      isActive ? "bg-white/20 text-white" : "bg-slate-200 text-slate-800"
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
