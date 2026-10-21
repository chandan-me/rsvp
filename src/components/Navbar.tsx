"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getVerifiedSession } from "@/lib/authClient";
import {
  CalendarCheck,
  Plus,
  Sparkles,
  LogOut,
  ChevronDown,
  ShieldCheck,
  User,
  Scan,
  LayoutGrid,
  Shield,
  Layers,
  ExternalLink,
  Ticket,
  Menu,
  X,
} from "lucide-react";

interface AuthSession {
  user: string;
  email: string;
  role: string;
  token?: string;
}

export function Navbar() {
  const pathname = usePathname();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Sync auth session from deduplicated verified session
  async function readSession() {
    try {
      const data = await getVerifiedSession();
      if (data.authenticated && data.user) {
        setSession({
          user: data.user.name,
          email: data.user.email,
          role: data.user.role,
        });
        return;
      }
      setSession(null);
    } catch {
      setSession(null);
    }
  }

  useEffect(() => {
    readSession();

    // Listen to session changes across login/logout and tabs
    const handleAuthChange = () => readSession();
    window.addEventListener("auth_session_changed", handleAuthChange);

    return () => {
      window.removeEventListener("auth_session_changed", handleAuthChange);
    };
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("rsvp_auth_session");
      sessionStorage.clear();
      window.dispatchEvent(new Event("auth_session_changed"));
    } catch {
      // storage fallback
    }
    setSession(null);
    setDropdownOpen(false);
    window.location.replace("/login?signed_out=true");
  }

  // Determine user initials for avatar
  const userName = session?.user || "Admin";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Avoid duplicate "+ Create Event" button if user is already on the events dashboard page
  const isEventsListPage = pathname === "/events";

  return (
    <header className="sticky top-0 z-40 w-full border-b border-[#e7e1f8] bg-white/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5e2ced] via-[#6e54e0] to-[#7c3aed] text-white shadow-md shadow-purple-500/20 group-hover:scale-105 transition-all">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-[#191236] text-xl flex items-center gap-1">
                RSVP<span className="h-2 w-2 rounded-full bg-[#5e2ced]"></span>
              </span>
              <span className="text-[10px] text-[#6e6a86] font-semibold tracking-wide -mt-0.5">
                Event Management &amp; Check-In
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
            {session ? (
              <>
                <Link
                  href="/events"
                  className={`px-3 py-1.5 rounded-full transition-all ${
                    pathname.startsWith("/events")
                      ? "bg-[#f3effc] text-[#5e2ced] font-bold"
                      : "text-[#5b6072] hover:text-[#191236] hover:bg-[#f6f3fe]"
                  }`}
                >
                  Events Dashboard
                </Link>

                <Link
                  href="/manager"
                  className={`px-3 py-1.5 rounded-full transition-all ${
                    pathname === "/manager"
                      ? "bg-[#f3effc] text-[#5e2ced] font-bold"
                      : "text-[#5b6072] hover:text-[#191236] hover:bg-[#f6f3fe]"
                  }`}
                >
                  Operations Command
                </Link>

                <Link
                  href="/employee/scanner"
                  className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                    pathname === "/employee/scanner"
                      ? "bg-[#f3effc] text-[#5e2ced] font-bold"
                      : "text-[#5b6072] hover:text-[#191236] hover:bg-[#f6f3fe]"
                  }`}
                >
                  <Scan className="w-3.5 h-3.5 text-[#5e2ced]" />
                  <span>Field Scanner</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#features"
                  className="px-3 py-1.5 rounded-full text-[#5b6072] hover:text-[#191236] hover:bg-[#f6f3fe] transition-colors"
                >
                  Features
                </Link>
                <Link
                  href="/showcase"
                  className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1 ${
                    pathname === "/showcase"
                      ? "bg-[#f3effc] text-[#5e2ced] font-bold"
                      : "text-[#5b6072] hover:text-[#191236] hover:bg-[#f6f3fe]"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#5e2ced]" />
                  <span>Showcase</span>
                </Link>
                <Link
                  href="/#solutions"
                  className="px-3 py-1.5 rounded-full text-[#5b6072] hover:text-[#191236] hover:bg-[#f6f3fe] transition-colors"
                >
                  Solutions
                </Link>
              </>
            )}

            <Link
              href="/lookup"
              className={`px-3 py-1.5 rounded-full transition-all flex items-center gap-1.5 ${
                pathname === "/lookup"
                  ? "bg-[#f3effc] text-[#5e2ced] font-bold"
                  : "text-[#5b6072] hover:text-[#191236] hover:bg-[#f6f3fe]"
              }`}
            >
              <Ticket className="w-3.5 h-3.5 text-[#5e2ced]" />
              <span>Find My Pass</span>
            </Link>

            <Link
              href="/e/google-build-hackathon-2026"
              target="_blank"
              className="px-3 py-1.5 rounded-full text-[#5b6072] hover:text-[#191236] hover:bg-[#f6f3fe] transition-colors flex items-center gap-1"
            >
              <span>Live Demo RSVP</span>
              <span className="text-[9px] font-bold bg-[#f3effc] text-[#5e2ced] px-1.5 py-0.5 rounded-full uppercase border border-[#e7e1f8]">
                demo
              </span>
            </Link>
          </nav>
        </div>

        {/* Right side CTAs & User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {session ? (
            <>
              {/* Create Event Button: Hidden on /events to avoid duplicate button */}
              {!isEventsListPage && (
                <Link
                  href="/events/new"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#5e2ced]/25 transition-all active:scale-[0.98]"
                >
                  <Plus className="h-3.5 w-3.5 stroke-[3]" />
                  <span className="hidden sm:inline">Create Event</span>
                  <span className="sm:hidden">New</span>
                </Link>
              )}

              {/* Logged-In User Profile Pill with Popover */}
              <div className="relative" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full border border-[#e7e1f8] bg-white hover:bg-[#f6f3fe] transition-all shadow-2xs cursor-pointer group"
                >
                  <div className="w-7 h-7 rounded-full bg-[#5e2ced] text-white font-black text-xs flex items-center justify-center shadow-2xs group-hover:bg-[#5225d3] transition">
                    {userInitials || "U"}
                  </div>
                  <div className="flex flex-col text-left leading-tight hidden sm:block">
                    <span className="text-xs font-bold text-[#191236] line-clamp-1">{session.user}</span>
                    <span className="text-[10px] text-[#6e6a86] capitalize">{session.role || "Organizer"}</span>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6e6a86] group-hover:text-[#191236] transition ml-0.5" />
                </button>

                {/* Popover Menu */}
                {dropdownOpen && (
                  <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-[#e7e1f8] p-2 shadow-xl shadow-purple-500/10 animate-in fade-in zoom-in-95 duration-150 z-50">
                    {/* Account Header */}
                    <div className="px-3 py-2.5 bg-[#fbfaff] rounded-xl mb-1 border border-[#e7e1f8]">
                      <p className="text-xs font-bold text-[#191236] truncate">{session.user}</p>
                      <p className="text-[11px] text-[#6e6a86] truncate font-mono">{session.email}</p>
                      <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#f3effc] text-[#5e2ced] uppercase tracking-wider border border-[#e7e1f8]">
                        <ShieldCheck className="w-3 h-3" />
                        <span>{session.role || "Super Admin"}</span>
                      </div>
                    </div>

                    {/* Navigation Links */}
                    <div className="space-y-0.5 py-1 text-xs font-semibold text-[#191236]">
                      <Link
                        href="/events"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#f6f3fe] transition"
                      >
                        <LayoutGrid className="w-4 h-4 text-[#5e2ced]" />
                        <span>Host Events Dashboard</span>
                      </Link>

                      <Link
                        href="/events/new"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#f6f3fe] transition"
                      >
                        <Plus className="w-4 h-4 text-[#5e2ced]" />
                        <span>Create New Event</span>
                      </Link>

                      <Link
                        href="/admin"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#f6f3fe] transition"
                      >
                        <Shield className="w-4 h-4 text-[#6e6a86]" />
                        <span>Platform Admin Console</span>
                      </Link>

                      <Link
                        href="/manager"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#f6f3fe] transition"
                      >
                        <Layers className="w-4 h-4 text-[#6e6a86]" />
                        <span>Operations Manager</span>
                      </Link>

                      <Link
                        href="/employee/scanner"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#f6f3fe] transition"
                      >
                        <Scan className="w-4 h-4 text-[#10b981]" />
                        <span>Field Scanner Terminal</span>
                      </Link>

                      <Link
                        href="/lookup"
                        onClick={() => setDropdownOpen(false)}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-[#f6f3fe] transition"
                      >
                        <Ticket className="w-4 h-4 text-[#5e2ced]" />
                        <span>Find My Pass</span>
                      </Link>
                    </div>

                    {/* Divider */}
                    <div className="h-px bg-[#e7e1f8] my-1" />

                    {/* Sign Out Button */}
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Logged-Out State: Sleek Sign In & Get Started Free Buttons */
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e1f8] bg-white hover:bg-[#f6f3fe] px-3.5 sm:px-4 py-2 text-xs font-bold text-[#191236] transition-colors shadow-2xs cursor-pointer"
                title="Sign in to your account"
              >
                <User className="w-3.5 h-3.5 text-[#5e2ced]" />
                <span>Sign In</span>
              </Link>

              <Link
                href="/signup"
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#5e2ced]/20 transition-all active:scale-[0.98]"
              >
                <span>Get Started Free</span>
              </Link>
            </div>
          )}

          {/* Mobile Hamburger Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle mobile menu"
            className="md:hidden p-2 rounded-xl border border-[#e7e1f8] bg-white hover:bg-[#f6f3fe] text-[#191236] transition-colors cursor-pointer shadow-2xs"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Slide-Down Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#e7e1f8] bg-white/98 backdrop-blur-xl px-4 py-4 space-y-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-1">
            {session ? (
              <>
                <div className="px-3 py-2 bg-[#fbfaff] rounded-xl mb-2 border border-[#e7e1f8]">
                  <p className="text-xs font-bold text-[#191236] truncate">{session.user}</p>
                  <p className="text-[11px] text-[#6e6a86] truncate font-mono">{session.email}</p>
                  <span className="mt-1 inline-block px-2 py-0.5 rounded-full text-[9px] font-bold bg-[#f3effc] text-[#5e2ced] uppercase">
                    {session.role || "Host Organizer"}
                  </span>
                </div>

                <Link
                  href="/events"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#191236] hover:bg-[#f6f3fe]"
                >
                  <LayoutGrid className="w-4 h-4 text-[#5e2ced]" />
                  <span>Events Dashboard</span>
                </Link>

                <Link
                  href="/manager"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#191236] hover:bg-[#f6f3fe]"
                >
                  <Layers className="w-4 h-4 text-[#5e2ced]" />
                  <span>Operations Command</span>
                </Link>

                <Link
                  href="/employee/scanner"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#191236] hover:bg-[#f6f3fe]"
                >
                  <Scan className="w-4 h-4 text-emerald-600" />
                  <span>Field QR Scanner</span>
                </Link>

                <Link
                  href="/events/new"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#5e2ced] bg-[#f3effc]"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Event</span>
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/#features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-xs font-bold text-[#5b6072] hover:bg-[#f6f3fe]"
                >
                  Features
                </Link>
                <Link
                  href="/showcase"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-xs font-bold text-[#5e2ced] hover:bg-[#f6f3fe]"
                >
                  Interactive Showcase
                </Link>
                <Link
                  href="/#solutions"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-xs font-bold text-[#5b6072] hover:bg-[#f6f3fe]"
                >
                  Solutions
                </Link>
                <Link
                  href="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-3 py-2 rounded-xl text-xs font-bold text-[#5e2ced] bg-[#f3effc]"
                >
                  Get Started Free
                </Link>
              </>
            )}

            <div className="h-px bg-[#e7e1f8] my-2" />

            <Link
              href="/lookup"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-[#191236] hover:bg-[#f6f3fe]"
            >
              <Ticket className="w-4 h-4 text-[#5e2ced]" />
              <span>Find My Pass (Attendee Lookup)</span>
            </Link>

            <Link
              href="/e/google-build-hackathon-2026"
              target="_blank"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-[#5b6072] hover:bg-[#f6f3fe]"
            >
              <span>Live Demo Event RSVP</span>
              <ExternalLink className="w-3.5 h-3.5 text-[#a485fd]" />
            </Link>

            {session && (
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 text-left mt-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
