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
      window.dispatchEvent(new Event("auth_session_changed"));
    } catch {
      // storage fallback
    }
    setSession(null);
    setDropdownOpen(false);
    router.push("/login?signed_out=true");
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
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/90 bg-white/95 backdrop-blur-md transition-all">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-6 sm:gap-8">
          <Link href="/events" className="flex items-center gap-2.5 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 text-white shadow-md shadow-sky-500/20 group-hover:scale-105 transition-all">
              <CalendarCheck className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold tracking-tight text-slate-900 text-base flex items-center gap-1">
                RSVP<span className="text-sky-600">Pro</span>
              </span>
              <span className="text-[10px] text-slate-400 font-semibold tracking-wide -mt-1">
                Event Operations Engine
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1.5 text-xs font-semibold">
            <Link
              href="/events"
              className={`px-3 py-1.5 rounded-xl transition-all ${
                pathname.startsWith("/events")
                  ? "bg-slate-100 text-slate-900 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Events Dashboard
            </Link>

            <Link
              href="/manager"
              className={`px-3 py-1.5 rounded-xl transition-all ${
                pathname === "/manager"
                  ? "bg-sky-50 text-sky-900 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Operations Command
            </Link>

            <Link
              href="/employee/scanner"
              className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
                pathname === "/employee/scanner"
                  ? "bg-sky-50 text-sky-900 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              <Scan className="w-3.5 h-3.5 text-sky-600" />
              <span>Field Scanner</span>
            </Link>

            <Link
              href="/e/craft-and-code-summit-2026"
              target="_blank"
              className="px-3 py-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-1"
            >
              <span>Public RSVP</span>
              <span className="text-[9px] font-bold bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded uppercase">
                demo
              </span>
            </Link>
          </nav>
        </div>

        {/* Right side CTAs & User Profile */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Create Event Button: Hidden on /events to avoid duplicate button */}
          {!isEventsListPage && (
            <Link
              href="/events/new"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-sky-500 transition-all active:scale-[0.98]"
            >
              <Plus className="h-3.5 w-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Create Event</span>
              <span className="sm:hidden">New</span>
            </Link>
          )}

          {/* User Auth State */}
          {session ? (
            /* Logged-In User Profile Pill with Popover */
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 transition-all shadow-2xs cursor-pointer group"
              >
                <div className="w-7 h-7 rounded-xl bg-sky-600 text-white font-black text-xs flex items-center justify-center shadow-2xs group-hover:bg-sky-700 transition">
                  {userInitials || "U"}
                </div>
                <div className="flex flex-col text-left leading-tight hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 line-clamp-1">{session.user}</span>
                  <span className="text-[10px] text-slate-400 capitalize">{session.role || "Organizer"}</span>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition ml-0.5" />
              </button>

              {/* Popover Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-slate-200/90 p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150 z-50">
                  {/* Account Header */}
                  <div className="px-3 py-2.5 bg-slate-50 rounded-xl mb-1 border border-slate-100">
                    <p className="text-xs font-bold text-slate-900 truncate">{session.user}</p>
                    <p className="text-[11px] text-slate-500 truncate font-mono">{session.email}</p>
                    <div className="mt-1.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-100 text-sky-800 uppercase tracking-wider">
                      <ShieldCheck className="w-3 h-3" />
                      <span>{session.role || "Super Admin"}</span>
                    </div>
                  </div>

                  {/* Navigation Links */}
                  <div className="space-y-0.5 py-1 text-xs font-semibold text-slate-700">
                    <Link
                      href="/events"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <LayoutGrid className="w-4 h-4 text-slate-500" />
                      <span>Host Events Dashboard</span>
                    </Link>

                    <Link
                      href="/events/new"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <Plus className="w-4 h-4 text-sky-600" />
                      <span>Create New Event</span>
                    </Link>

                    <Link
                      href="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <Shield className="w-4 h-4 text-slate-500" />
                      <span>Platform Admin Console</span>
                    </Link>

                    <Link
                      href="/manager"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <Layers className="w-4 h-4 text-slate-500" />
                      <span>Operations Manager</span>
                    </Link>

                    <Link
                      href="/employee/scanner"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-slate-100 transition"
                    >
                      <Scan className="w-4 h-4 text-emerald-600" />
                      <span>Field Scanner Terminal</span>
                    </Link>
                  </div>

                  {/* Divider */}
                  <div className="h-px bg-slate-100 my-1" />

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
          ) : (
            /* Logged-Out State: Sleek Sign In Button */
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                title="Sign in to your account"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Sign In</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
