"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  Compass,
  LayoutGrid,
  Plus,
  Shield,
  Layers,
  Scan,
  Ticket,
  Printer,
  ShieldCheck,
  ExternalLink,
  Sparkles,
  ArrowLeft,
  X,
  Search,
  ChevronRight,
  Home,
} from "lucide-react";

export function QuickCommandBar() {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Read active event ID from pathname if user is currently inside an event
  const eventMatch = pathname.match(/\/events\/([^/]+)/);
  const currentEventId = eventMatch ? eventMatch[1] : "ev_gbh_2026";

  // Keyboard shortcut listener: Cmd+K / Ctrl+K or Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [isOpen]);

  interface CommandItem {
    title: string;
    subtitle: string;
    href: string;
    icon: any;
    badge?: string;
  }

  interface CommandCategory {
    category: string;
    items: CommandItem[];
  }

  // Navigation Items
  const navItems: CommandCategory[] = [
    {
      category: "Organizer & Host Hub",
      items: [
        {
          title: "Events Dashboard",
          subtitle: "All hosted events & live statistics",
          href: "/events",
          icon: LayoutGrid,
          badge: "Host",
        },
        {
          title: "Create New Event",
          subtitle: "Setup tickets, dates & venue details",
          href: "/events/new",
          icon: Plus,
          badge: "New",
        },
        {
          title: "Operations Command",
          subtitle: "Live security, admissions & guest flow",
          href: "/manager",
          icon: Layers,
          badge: "Manager",
        },
        {
          title: "Field Scanner Terminal",
          subtitle: "Ultra-fast QR gate verification",
          href: `/employee/scanner?event=${currentEventId}`,
          icon: Scan,
          badge: "Staff Ops",
        },
        {
          title: "Platform Admin Console",
          subtitle: "Payout approvals & audit logging",
          href: "/admin",
          icon: Shield,
          badge: "Superadmin",
        },
      ],
    },
    {
      category: "Active Event Tools",
      items: [
        {
          title: "Overview & Guest Roster",
          subtitle: `Event workspace for ${currentEventId}`,
          href: `/events/${currentEventId}`,
          icon: LayoutGrid,
        },
        {
          title: "Name Badges Studio",
          subtitle: "Printable conference badges & lanyards",
          href: `/events/${currentEventId}/badges`,
          icon: Printer,
        },
        {
          title: "Gate Station Check-In",
          subtitle: "Station kiosk mode with passcode lock",
          href: `/events/${currentEventId}/checkin`,
          icon: ShieldCheck,
        },
        {
          title: "Public Guest RSVP",
          subtitle: "Attendee registration & pass issuance",
          href: "/e/google-build-hackathon-2026",
          icon: ExternalLink,
        },
      ],
    },
    {
      category: "Attendee & Quick Links",
      items: [
        {
          title: "Find My Pass / Ticket Lookup",
          subtitle: "Download wallet passes & receipts",
          href: "/lookup",
          icon: Ticket,
        },
        {
          title: "Interactive Showcase",
          subtitle: "Inspect all modules & UI components",
          href: "/showcase",
          icon: Sparkles,
        },
        {
          title: "Home / Welcome Portal",
          subtitle: "Main RSVP landing page",
          href: "/",
          icon: Home,
        },
      ],
    },
  ];

  const filteredGroups = navItems
    .map((group) => {
      const filtered = group.items.filter((item) => {
        const query = search.toLowerCase().trim();
        if (!query) return true;
        return (
          item.title.toLowerCase().includes(query) ||
          item.subtitle.toLowerCase().includes(query)
        );
      });
      return { ...group, items: filtered };
    })
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Floating Speed-Dial Button */}
      <div className="fixed bottom-5 right-5 z-40 print:hidden">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center gap-2 rounded-full bg-gradient-to-r from-[#5e2ced] via-[#6e54e0] to-[#7c3aed] text-white px-4 py-2.5 shadow-lg shadow-purple-600/30 hover:shadow-xl hover:shadow-purple-600/40 hover:scale-105 active:scale-95 transition-all cursor-pointer border border-white/20"
          title="Open Quick Switcher (Ctrl+K or ⌘K)"
        >
          <Compass className="h-4 w-4 animate-spin-slow group-hover:rotate-45 transition-transform" />
          <span className="text-xs font-extrabold tracking-wide">Quick Switcher</span>
          <span className="hidden sm:inline-flex items-center text-[10px] bg-white/20 font-mono px-1.5 py-0.5 rounded-md border border-white/30 text-white font-bold ml-1">
            ⌘K
          </span>
        </button>
      </div>

      {/* Modal Backdrop & Command Palette */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-14 sm:pt-20 px-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl rounded-3xl bg-white border border-[#e7e1f8] shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input Bar */}
            <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-100 bg-[#fbfaff]">
              <Search className="h-4 w-4 text-slate-400 shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Jump to any page, scanner, tool, or badge studio..."
                className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 p-1"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-200/60 text-slate-400 hover:text-slate-700 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Quick Actions Row */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-white text-xs text-slate-500">
              <span className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider">
                Instant Navigation
              </span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.back();
                }}
                className="inline-flex items-center gap-1 font-bold text-[#5e2ced] hover:text-[#5225d3] transition cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Return to Previous Page</span>
              </button>
            </div>

            {/* Items List */}
            <div className="overflow-y-auto p-3 space-y-4 flex-1">
              {filteredGroups.length === 0 ? (
                <div className="text-center py-10">
                  <Compass className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-500">No destinations found for "{search}"</p>
                </div>
              ) : (
                filteredGroups.map((group, gIdx) => (
                  <div key={gIdx} className="space-y-1">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-3 py-1">
                      {group.category}
                    </p>
                    <div className="space-y-1">
                      {group.items.map((item, idx) => {
                        const Icon = item.icon;
                        const isCurrent = pathname === item.href;
                        return (
                          <Link
                            key={idx}
                            href={item.href}
                            onClick={() => setIsOpen(false)}
                            className={`flex items-center justify-between p-2.5 rounded-2xl transition-all group ${
                              isCurrent
                                ? "bg-[#f3effc] text-[#5e2ced] font-bold border border-[#e7e1f8]"
                                : "hover:bg-[#f6f3fe] text-slate-700"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                                  isCurrent
                                    ? "bg-[#5e2ced] text-white"
                                    : "bg-slate-100 text-[#5e2ced] group-hover:bg-[#5e2ced] group-hover:text-white"
                                }`}
                              >
                                <Icon className="w-4 h-4" />
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-xs font-bold text-slate-900 group-hover:text-[#5e2ced] transition-colors truncate">
                                    {item.title}
                                  </span>
                                  {item.badge && (
                                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                                      {item.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-500 truncate">{item.subtitle}</p>
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-[#5e2ced] transition-colors shrink-0" />
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Bottom Footer Ribbon */}
            <div className="px-4 py-2.5 bg-[#fbfaff] border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 font-medium">
                Tip: Use <kbd className="px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded font-mono text-[10px]">Esc</kbd> to close
              </span>
              <span className="text-[10px] font-bold text-[#5e2ced]">RSVP Unified Navigation</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
