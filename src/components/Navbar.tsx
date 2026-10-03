"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
  ArrowRight,
  ExternalLink,
} from "lucide-react";

interface AuthSession {
  user: string;
  email: string;
  role: string;
  token?: string;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();

  const [session, setSession] = useState<AuthSession | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Sync auth session from localStorage
  function readSession() {
    try {
      const raw = localStorage.getItem("rsvp_auth_session");
      if (raw) {
        const parsed = JSON.parse(raw);
        setSession(parsed);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }
  }

  useEffect(() => {
    readSession();

    // Listen to session changes across login/logout and tabs
    const handleAuthChange = () => readSession();
    window.addEventListener("auth_session_changed", handleAuthChange);
    window.addEventListener("storage", handleAuthChange);

    return () => {
      window.removeEventListener("auth_session_changed", handleAuthChange);
      window.removeEventListener("storage", handleAuthChange);
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

  function handleSignOut() {
    try {
      localStorage.removeItem("rsvp_auth_session");
      sessionStorage.clear();
      document.cookie = "rsvp_auth_session=; path=/; max-age=0; SameSite=Lax";
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
                  href="/#solutions"
                  className="px-3 py-1.5 rounded-full text-[#5b6072] hover:text-[#191236] hover:bg-[#f6f3fe] transition-colors"
                >
                  Solutions
                </Link>
              </>
            )}

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
                className="inline-flex items-center gap-1.5 rounded-full border border-[#e7e1f8] bg-white hover:bg-[#f6f3fe] px-4 py-2 text-xs font-bold text-[#191236] transition-colors shadow-2xs cursor-pointer"
                title="Sign in to your account"
              >
                <User className="w-3.5 h-3.5 text-[#5e2ced]" />
                <span>Sign In</span>
              </Link>

              <Link
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-4 py-2 text-xs font-bold text-white shadow-sm shadow-[#5e2ced]/20 transition-all active:scale-[0.98]"
              >
                <span>Get Started Free</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
