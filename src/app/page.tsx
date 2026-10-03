"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  CalendarCheck,
  QrCode,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  BarChart3,
  Layers,
  DoorOpen,
  UtensilsCrossed,
  Crown,
  Lock,
  Smartphone,
  Check,
  Printer,
  DollarSign,
  Zap,
  Globe,
  Radio,
  ChevronRight,
  ExternalLink,
  Clock,
  Ticket,
  Mail,
  FileText,
  Sliders,
  Star,
  Building2,
  GraduationCap,
  Calendar,
  MapPin,
  Shield,
  Laptop,
  UserCheck,
  Plus,
} from "lucide-react";

interface AuthSession {
  user: string;
  email: string;
  role: string;
}

export default function HomePage() {
  // Authentication State
  const [session, setSession] = useState<AuthSession | null>(null);

  // Showcase Tab State
  const [activeTab, setActiveTab] = useState<"rsvp" | "tickets" | "checkin" | "seating">("rsvp");

  // Dynamic Events State
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Digital Pass Simulator State
  const [selectedBadge, setSelectedBadge] = useState<"ticket" | "shield" | "star" | "calendar">("shield");
  const [tierStyle, setTierStyle] = useState<"vip" | "ga" | "speaker">("vip");
  const [isSimulatingScan, setIsSimulatingScan] = useState(false);
  const [scanResult, setScanResult] = useState<string | null>(null);

  // Interactive Form Preview State
  const [dietaryChoice, setDietaryChoice] = useState("Vegetarian / Vegan");
  const [sessionSelected, setSessionSelected] = useState(true);
  const [plusOnes, setPlusOnes] = useState(1);
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Solutions category tab state
  const [solutionCategory, setSolutionCategory] = useState<"corporate" | "nonprofit" | "tech" | "private">("corporate");

  // Check auth session
  useEffect(() => {
    function readSession() {
      try {
        const raw = localStorage.getItem("rsvp_auth_session");
        if (raw) {
          setSession(JSON.parse(raw));
        } else {
          setSession(null);
        }
      } catch {
        setSession(null);
      }
    }
    readSession();
    window.addEventListener("auth_session_changed", readSession);
    window.addEventListener("storage", readSession);
    return () => {
      window.removeEventListener("auth_session_changed", readSession);
      window.removeEventListener("storage", readSession);
    };
  }, []);

  useEffect(() => {
    async function fetchEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          setEvents(data.events || []);
        }
      } catch (e) {
        console.warn("Events fetch warning:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchEvents();
  }, []);

  const demoEvent = events[0];

  function simulateScan() {
    setIsSimulatingScan(true);
    setScanResult(null);
    setTimeout(() => {
      setIsSimulatingScan(false);
      setScanResult("ACCESS GRANTED • Verified by Gate Operator (12ms)");
    }, 900);
  }

  const BADGE_ICONS = {
    ticket: "🎟️",
    shield: "🛡️",
    star: "✨",
    calendar: "📅",
  };

  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#191236] flex flex-col selection:bg-[#5e2ced] selection:text-white">
      <Navbar />

      <main className="flex-1 overflow-hidden">
        {/* Subtle Top Gradient Mesh */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[520px] bg-gradient-to-b from-[#f3effc]/80 via-[#f6f3fe]/40 to-transparent blur-[100px] -z-10 pointer-events-none" />

        {/* 1. HERO SECTION */}
        <section className="relative pt-8 pb-16 sm:pt-14 sm:pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          {/* Top Trust Pill */}
          <div className="flex justify-center mb-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#e7e1f8] px-4 py-1.5 text-xs font-semibold text-[#5e2ced] shadow-sm shadow-purple-500/5 hover:border-[#5e2ced]/40 transition-all">
              <span className="flex h-2 w-2 rounded-full bg-[#5e2ced] animate-pulse" />
              <span>The #1 Event Management &amp; Online RSVP Platform</span>
              <span className="text-[#6e6a86] hidden sm:inline">• Trusted by 30% of Fortune 500s</span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center max-w-4xl mx-auto space-y-5">
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight leading-[1.08] text-[#191236]">
              From invite to insights.{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5e2ced] via-[#775ae0] to-[#a485fd] block sm:inline">
                Enterprise event software anyone can run.
              </span>
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-xl text-[#5b6072] max-w-2xl mx-auto leading-relaxed font-normal">
              Replace the patchwork of tools. Plan, invite, register, sell tickets, manage custom dietary preferences, and check guests in from one unified event operations platform — so you walk into the live event knowing every number is right.
            </p>

            {/* Action Buttons: Differentiated based on whether user is logged in */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-4">
              {session ? (
                /* LOGGED IN USER ACTIONS */
                <>
                  <Link
                    href="/events"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-8 py-4 text-base font-bold text-white shadow-lg shadow-purple-600/25 transition-all active:scale-[0.98] group cursor-pointer"
                  >
                    <CalendarCheck className="h-5 w-5" />
                    <span>Open Host Dashboard</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href="/events/new"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#f6f3fe] border border-[#e7e1f8] px-7 py-4 text-sm font-bold text-[#191236] transition-all shadow-sm shadow-purple-500/5 cursor-pointer"
                  >
                    <Plus className="h-4 w-4 text-[#5e2ced]" />
                    <span>Create New Event</span>
                  </Link>

                  <Link
                    href="/manager"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#f3effc] hover:bg-[#ece7fb] text-[#5e2ced] border border-[#e7e1f8] px-6 py-4 text-sm font-bold transition-all cursor-pointer"
                  >
                    <Layers className="h-4 w-4" />
                    <span>Operations Command</span>
                  </Link>
                </>
              ) : (
                /* UNLOGGED GUEST ACTIONS */
                <>
                  <Link
                    href="/signup"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-8 py-4 text-base font-bold text-white shadow-lg shadow-purple-600/25 transition-all active:scale-[0.98] group cursor-pointer"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                  </Link>

                  <Link
                    href="/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-[#f6f3fe] border border-[#e7e1f8] px-7 py-4 text-sm font-bold text-[#191236] transition-all shadow-sm shadow-purple-500/5 cursor-pointer"
                  >
                    <Lock className="h-4 w-4 text-[#5e2ced]" />
                    <span>Sign In to Host Portal</span>
                  </Link>

                  <Link
                    href="/login?mode=station"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-[#f3effc] hover:bg-[#ece7fb] text-[#5e2ced] border border-[#e7e1f8] px-6 py-4 text-sm font-bold transition-all cursor-pointer"
                  >
                    <DoorOpen className="h-4 w-4" />
                    <span>Station Staff Login</span>
                  </Link>
                </>
              )}
            </div>

            {/* Micro Trust Indicators */}
            <div className="pt-3 flex flex-wrap items-center justify-center gap-6 text-xs font-medium text-[#5b6072]">
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#5e2ced] stroke-[3]" />
                <span>Free to get started</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#5e2ced] stroke-[3]" />
                <span>No credit card required</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#5e2ced] stroke-[3]" />
                <span>Level-H Vector QR passes</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4 text-[#5e2ced] stroke-[3]" />
                <span>Offline IndexedDB scanner</span>
              </span>
            </div>
          </div>

          {/* 2. INTERACTIVE PRODUCT SHOWCASE */}
          <div className="mt-14 max-w-5xl mx-auto" id="features">
            {/* Window Container */}
            <div className="rounded-3xl bg-white border border-[#e7e1f8] shadow-2xl shadow-purple-900/10 overflow-hidden">
              {/* Window Header Bar */}
              <div className="border-b border-[#e7e1f8] bg-[#fbfaff] px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-rose-400" />
                  <div className="h-3 w-3 rounded-full bg-amber-400" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400" />
                  <span className="ml-3 text-xs font-mono text-[#6e6a86] font-semibold">
                    rsvp-operations-v4.production
                  </span>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 p-1 bg-[#f3effc] rounded-full text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setActiveTab("rsvp")}
                    className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                      activeTab === "rsvp"
                        ? "bg-[#5e2ced] text-white shadow-xs"
                        : "text-[#5b6072] hover:text-[#191236]"
                    }`}
                  >
                    1. Online RSVP
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("tickets")}
                    className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                      activeTab === "tickets"
                        ? "bg-[#5e2ced] text-white shadow-xs"
                        : "text-[#5b6072] hover:text-[#191236]"
                    }`}
                  >
                    2. Ticketing &amp; Fees
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("checkin")}
                    className={`px-4 py-1.5 rounded-full transition-all cursor-pointer ${
                      activeTab === "checkin"
                        ? "bg-[#5e2ced] text-white shadow-xs"
                        : "text-[#5b6072] hover:text-[#191236]"
                    }`}
                  >
                    3. Live QR Scanner
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("seating")}
                    className={`px-4 py-1.5 rounded-full transition-all cursor-pointer hidden md:block ${
                      activeTab === "seating"
                        ? "bg-[#5e2ced] text-white shadow-xs"
                        : "text-[#5b6072] hover:text-[#191236]"
                    }`}
                  >
                    4. Seating &amp; Capacity
                  </button>
                </div>
              </div>

              {/* Showcase Body Preview */}
              <div className="p-6 sm:p-10">
                {/* TAB 1: ONLINE RSVP & REGISTRATION */}
                {activeTab === "rsvp" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-6 space-y-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3effc] text-[#5e2ced] text-xs font-bold border border-[#e7e1f8]">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Custom Registration Engine</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-[#191236]">
                        Create branded event websites in minutes.
                      </h3>
                      <p className="text-sm text-[#5b6072] leading-relaxed">
                        RSVP lets you ask custom questions, collect dietary needs, manage conditional plus-ones, and customize confirmation emails with zero code.
                      </p>
                      <ul className="space-y-2 text-xs text-[#5b6072] font-medium pt-2">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Conditional logic &amp; multi-part event schedules</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Custom tags, food allergies &amp; seating preferences</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Automated digital QR ticket pass dispatched upon RSVP</span>
                        </li>
                      </ul>
                      {demoEvent && (
                        <div className="pt-2">
                          <Link
                            href={`/e/${demoEvent.slug}`}
                            target="_blank"
                            className="inline-flex items-center gap-2 text-xs font-bold text-[#5e2ced] hover:text-[#5225d3] group"
                          >
                            <span>Try Live Guest Registration Form</span>
                            <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </Link>
                        </div>
                      )}
                    </div>

                    {/* Interactive Form Simulator */}
                    <div className="lg:col-span-6 rounded-2xl border border-[#e7e1f8] bg-[#fbfaff] p-6 shadow-sm">
                      <div className="flex items-center justify-between pb-4 border-b border-[#e7e1f8]">
                        <div>
                          <span className="text-[10px] font-black uppercase tracking-wider text-[#5e2ced] bg-[#f3effc] px-2 py-0.5 rounded-full">
                            Interactive Demo
                          </span>
                          <h4 className="text-sm font-bold text-[#191236] mt-1">
                            {demoEvent?.title || "Annual Technology & Innovation Summit 2026"}
                          </h4>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          ● Open for RSVPs
                        </span>
                      </div>

                      <div className="mt-4 space-y-3.5 text-xs">
                        <div>
                          <label className="block font-bold text-[#191236] mb-1">Dietary Requirement (Custom Tag)</label>
                          <select
                            value={dietaryChoice}
                            onChange={(e) => setDietaryChoice(e.target.value)}
                            className="w-full rounded-xl border border-[#e7e1f8] bg-white px-3 py-2 text-xs font-medium text-[#191236] focus:outline-none focus:border-[#5e2ced]"
                          >
                            <option>Standard / No Restrictions</option>
                            <option>Vegetarian / Vegan</option>
                            <option>Gluten-Free</option>
                            <option>Halal / Kosher</option>
                          </select>
                        </div>

                        <div>
                          <label className="block font-bold text-[#191236] mb-1">Breakout Sessions</label>
                          <label className="flex items-center gap-2.5 p-2 rounded-xl bg-white border border-[#e7e1f8] cursor-pointer hover:border-[#5e2ced]/50 transition">
                            <input
                              type="checkbox"
                              checked={sessionSelected}
                              onChange={(e) => setSessionSelected(e.target.checked)}
                              className="accent-[#5e2ced] h-4 w-4 rounded"
                            />
                            <span className="font-semibold text-[#191236]">VIP Keynote &amp; Dinner Reception</span>
                          </label>
                        </div>

                        <div>
                          <label className="block font-bold text-[#191236] mb-1">Additional Guests (Plus-Ones)</label>
                          <div className="flex items-center gap-2">
                            {[0, 1, 2].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => setPlusOnes(num)}
                                className={`flex-1 py-1.5 rounded-xl border font-bold text-xs cursor-pointer transition ${
                                  plusOnes === num
                                    ? "bg-[#5e2ced] text-white border-[#5e2ced]"
                                    : "bg-white text-[#5b6072] border-[#e7e1f8] hover:bg-[#f6f3fe]"
                                }`}
                              >
                                {num === 0 ? "Just Me" : `+${num} Guest${num > 1 ? "s" : ""}`}
                              </button>
                            ))}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setFormSubmitted(true);
                            setTimeout(() => setFormSubmitted(false), 2500);
                          }}
                          className="w-full py-2.5 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] text-white font-bold shadow-md shadow-purple-500/20 transition cursor-pointer"
                        >
                          {formSubmitted ? "✓ RSVP Confirmed & QR Pass Dispatched!" : "Complete RSVP (Free)"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 2: TICKETING & FEES */}
                {activeTab === "tickets" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-6 space-y-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3effc] text-[#5e2ced] text-xs font-bold border border-[#e7e1f8]">
                        <Ticket className="w-3.5 h-3.5" />
                        <span>Ticketing &amp; Instant Payments</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-[#191236]">
                        Sell tickets with 0% markup and direct settlements.
                      </h3>
                      <p className="text-sm text-[#5b6072] leading-relaxed">
                        Collect registration fees or ticket sales securely through Razorpay or Stripe. Keep 100% of your ticket price on free events, with seamless net revenue ledgering.
                      </p>
                      <ul className="space-y-2 text-xs text-[#5b6072] font-medium pt-2">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Multi-tiered tickets: Early Bird, General Admission, VIP</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Capacity caps &amp; automated waitlist auto-promotion</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Automated PDF invoices &amp; printable name badges</span>
                        </li>
                      </ul>
                    </div>

                    {/* Interactive Ticket Tier Selector */}
                    <div className="lg:col-span-6 rounded-2xl border border-[#e7e1f8] bg-[#fbfaff] p-6 shadow-sm space-y-3">
                      <div className="flex items-center justify-between pb-3 border-b border-[#e7e1f8]">
                        <span className="text-xs font-bold text-[#191236]">Select Ticket Tier</span>
                        <span className="text-[11px] font-mono text-[#6e6a86]">Secure Checkout</span>
                      </div>

                      <div className="space-y-2.5">
                        <div
                          onClick={() => setTierStyle("ga")}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                            tierStyle === "ga"
                              ? "bg-white border-[#5e2ced] shadow-md shadow-purple-500/10"
                              : "bg-white/60 border-[#e7e1f8] hover:bg-white"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-[#191236]">General Admission Pass</p>
                            <p className="text-[11px] text-[#5b6072]">Full conference access + coffee breaks</p>
                          </div>
                          <span className="text-sm font-extrabold text-[#191236]">₹1,500</span>
                        </div>

                        <div
                          onClick={() => setTierStyle("vip")}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                            tierStyle === "vip"
                              ? "bg-white border-[#5e2ced] shadow-md shadow-purple-500/10"
                              : "bg-white/60 border-[#e7e1f8] hover:bg-white"
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs font-bold text-[#191236]">VIP All-Access Pass</p>
                              <span className="text-[9px] font-black bg-[#f3effc] text-[#5e2ced] px-1.5 py-0.5 rounded-full border border-[#e7e1f8]">
                                POPULAR
                              </span>
                            </div>
                            <p className="text-[11px] text-[#5b6072]">Priority seating + banquet dinner + lounge</p>
                          </div>
                          <span className="text-sm font-extrabold text-[#5e2ced]">₹4,500</span>
                        </div>

                        <div
                          onClick={() => setTierStyle("speaker")}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                            tierStyle === "speaker"
                              ? "bg-white border-[#5e2ced] shadow-md shadow-purple-500/10"
                              : "bg-white/60 border-[#e7e1f8] hover:bg-white"
                          }`}
                        >
                          <div>
                            <p className="text-xs font-bold text-[#191236]">Speaker &amp; VIP Delegate</p>
                            <p className="text-[11px] text-[#5b6072]">Green room + backstage credentials</p>
                          </div>
                          <span className="text-sm font-extrabold text-emerald-600">Reserved</span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#e7e1f8] flex items-center justify-between text-xs font-bold text-[#191236]">
                        <span>Platform Processing Fee (0% for Free):</span>
                        <span className="text-emerald-600">Standard 5%</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: LIVE QR SCANNER & ON-SITE GATE */}
                {activeTab === "checkin" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-6 space-y-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3effc] text-[#5e2ced] text-xs font-bold border border-[#e7e1f8]">
                        <Smartphone className="w-3.5 h-3.5" />
                        <span>Frictionless On-Site Gate Terminal</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-[#191236]">
                        Check in thousands in seconds, online or offline.
                      </h3>
                      <p className="text-sm text-[#5b6072] leading-relaxed">
                        Transform any smartphone, tablet, or laptop into a high-throughput check-in kiosk. With 12ms laser scanning and local IndexedDB cache, venue Wi-Fi drops won&apos;t slow your queues down.
                      </p>
                      <ul className="space-y-2 text-xs text-[#5b6072] font-medium pt-2">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Multi-staff station passcodes (Main Gate, VIP, Banquet)</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Vector Level-H QR code with custom embedded center icon</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Duplicate-scan defense with audible confirmation chimes</span>
                        </li>
                      </ul>
                    </div>

                    {/* Interactive Scanner Simulator */}
                    <div className="lg:col-span-6 rounded-2xl border border-[#e7e1f8] bg-[#fbfaff] p-6 shadow-sm text-center space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#e7e1f8] text-left">
                        <div>
                          <span className="text-[10px] font-mono text-[#6e6a86] uppercase tracking-wider">
                            Pass Simulator
                          </span>
                          <p className="text-xs font-bold text-[#191236]">
                            {tierStyle === "vip" ? "VIP All-Access" : tierStyle === "speaker" ? "Speaker Badge" : "General Delegate"}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#f3effc] text-[#5e2ced] border border-[#e7e1f8]">
                          30% ERROR CORRECTION
                        </span>
                      </div>

                      {/* QR Display */}
                      <div className="relative inline-block bg-white p-4 rounded-2xl shadow-md border border-[#e7e1f8]">
                        {isSimulatingScan && (
                          <div className="absolute inset-x-0 h-1 bg-[#5e2ced] shadow-[0_0_12px_#5e2ced] animate-bounce top-1/2 z-20 pointer-events-none" />
                        )}
                        <div className="w-32 h-32 bg-[#191236] rounded-xl relative flex items-center justify-center p-2">
                          <div className="grid grid-cols-6 gap-1.5 opacity-30">
                            {Array.from({ length: 36 }).map((_, i) => (
                              <div key={i} className="w-1.5 h-1.5 bg-[#a485fd] rounded-xs" />
                            ))}
                          </div>
                          {/* Embedded Center Icon */}
                          <div className="absolute inset-0 m-auto w-9 h-9 rounded-xl bg-white shadow-md border border-[#191236] flex items-center justify-center text-base z-10">
                            <span>{BADGE_ICONS[selectedBadge]}</span>
                          </div>
                        </div>
                      </div>

                      {scanResult && (
                        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 animate-in fade-in">
                          {scanResult}
                        </div>
                      )}

                      <div className="flex items-center justify-center gap-2 pt-1">
                        {(["shield", "ticket", "star", "calendar"] as const).map((b) => (
                          <button
                            key={b}
                            type="button"
                            onClick={() => setSelectedBadge(b)}
                            className={`p-2 rounded-xl border text-sm transition cursor-pointer ${
                              selectedBadge === b
                                ? "bg-[#5e2ced] text-white border-[#5e2ced] shadow-xs"
                                : "bg-white text-[#5b6072] border-[#e7e1f8] hover:bg-[#f6f3fe]"
                            }`}
                          >
                            {BADGE_ICONS[b]}
                          </button>
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={simulateScan}
                        disabled={isSimulatingScan}
                        className="w-full py-2.5 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] text-white text-xs font-bold shadow-md shadow-purple-500/20 transition cursor-pointer flex items-center justify-center gap-2"
                      >
                        <Zap className={`h-4 w-4 ${isSimulatingScan ? "animate-spin" : ""}`} />
                        <span>{isSimulatingScan ? "Verifying Token..." : "Simulate Gate Check-In (12ms)"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 4: SEATING & CAPACITY */}
                {activeTab === "seating" && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-6 space-y-4">
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3effc] text-[#5e2ced] text-xs font-bold border border-[#e7e1f8]">
                        <Users className="w-3.5 h-3.5" />
                        <span>Seating Charts &amp; Capacity Control</span>
                      </div>
                      <h3 className="text-2xl sm:text-3xl font-extrabold text-[#191236]">
                        Visual table planning and live venue occupancy.
                      </h3>
                      <p className="text-sm text-[#5b6072] leading-relaxed">
                        Design custom table layouts, assign VIP guests to reserved booths, and track live occupancy in real time as attendees cross gate checkpoints.
                      </p>
                      <ul className="space-y-2 text-xs text-[#5b6072] font-medium pt-2">
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Real-time occupancy meters across all venue gates</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Assigned seating &amp; VIP banquet arrangements</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                          <span>Automated capacity triggers &amp; waitlist alerts</span>
                        </li>
                      </ul>
                    </div>

                    {/* Interactive Table Layout */}
                    <div className="lg:col-span-6 rounded-2xl border border-[#e7e1f8] bg-[#fbfaff] p-6 shadow-sm space-y-4">
                      <div className="flex items-center justify-between pb-3 border-b border-[#e7e1f8]">
                        <span className="text-xs font-bold text-[#191236]">Grand Ballroom Seating</span>
                        <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                          92% Capacity
                        </span>
                      </div>

                      <div className="grid grid-cols-3 gap-3">
                        {["Table 1 (VIP)", "Table 2 (Speakers)", "Table 3 (Press)", "Table 4 (General)", "Table 5 (General)", "Table 6 (Sponsors)"].map((table, i) => (
                          <div
                            key={table}
                            className={`p-3 rounded-2xl border text-center transition ${
                              i < 2
                                ? "bg-white border-[#5e2ced] shadow-xs"
                                : "bg-white border-[#e7e1f8]"
                            }`}
                          >
                            <p className="text-xs font-bold text-[#191236]">{table}</p>
                            <p className="text-[10px] text-[#6e6a86] font-mono mt-0.5">8 / 8 Seats</p>
                            <div className="mt-2 w-full bg-[#f3effc] h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#5e2ced] h-full rounded-full"
                                style={{ width: i < 3 ? "100%" : "75%" }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 text-center">
                        {session ? (
                          <Link
                            href="/manager"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5e2ced] hover:text-[#5225d3]"
                          >
                            <span>Launch Live Operations Command Board</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        ) : (
                          <Link
                            href="/login"
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5e2ced] hover:text-[#5225d3]"
                          >
                            <span>Sign in to Access Operations Board</span>
                            <ArrowRight className="h-3.5 w-3.5" />
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* 3. SOCIAL PROOF LOGO WALL */}
        <section className="border-y border-[#e7e1f8] bg-white py-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <p className="text-xs font-extrabold uppercase tracking-widest text-[#6e6a86]">
              Trusted by industry leaders, Fortune 500 companies &amp; world-class institutions
            </p>
            <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 opacity-70 grayscale hover:grayscale-0 transition-all duration-300">
              <span className="text-lg font-black tracking-tighter text-[#191236]">Google</span>
              <span className="text-lg font-serif font-black tracking-tight text-[#191236]">HARVARD</span>
              <span className="text-xl font-black italic tracking-widest text-[#191236]">NIKE</span>
              <span className="text-lg font-bold tracking-tight text-[#191236]">Spotify</span>
              <span className="text-lg font-semibold tracking-tight text-[#191236]">Microsoft</span>
              <span className="text-lg font-bold tracking-tighter text-[#191236]">amazon</span>
              <span className="text-lg font-serif tracking-normal text-[#191236]">STANFORD</span>
              <span className="text-lg font-bold tracking-wide text-[#191236]">Marriott</span>
            </div>
          </div>
        </section>

        {/* 4. CORE FOUR PILLARS */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-[#5e2ced] bg-[#f3effc] px-3 py-1 rounded-full border border-[#e7e1f8]">
              The RSVP Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#191236] tracking-tight">
              Features for every stage of event management.
            </h2>
            <p className="text-sm sm:text-base text-[#5b6072]">
              From the first invitation sent to post-event financial reports, RSVP powers every milestone of your event lifecycle.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Card 1 */}
            <div className="rounded-3xl p-6 bg-white border border-[#e7e1f8] hover:border-[#5e2ced]/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-[#f3effc] text-[#5e2ced] border border-[#e7e1f8] flex items-center justify-center group-hover:bg-[#5e2ced] group-hover:text-white transition-all">
                <FileText className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#191236]">Online RSVP &amp; Forms</h3>
              <p className="text-xs sm:text-sm text-[#5b6072] leading-relaxed">
                Build beautiful registration flows with conditional questions, multi-part event schedules, custom tags, and dietary choices.
              </p>
              <div className="pt-2 text-xs font-bold text-[#5e2ced] flex items-center gap-1">
                <span>Custom Form Engine</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 2 */}
            <div className="rounded-3xl p-6 bg-white border border-[#e7e1f8] hover:border-[#5e2ced]/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-[#f3effc] text-[#5e2ced] border border-[#e7e1f8] flex items-center justify-center group-hover:bg-[#5e2ced] group-hover:text-white transition-all">
                <Ticket className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#191236]">Ticketing &amp; Payments</h3>
              <p className="text-xs sm:text-sm text-[#5b6072] leading-relaxed">
                Sell multi-tier tickets with 0% platform markup on free passes. Direct Razorpay and Stripe settlements with automated payouts.
              </p>
              <div className="pt-2 text-xs font-bold text-[#5e2ced] flex items-center gap-1">
                <span>Secure Settlements</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 3 */}
            <div className="rounded-3xl p-6 bg-white border border-[#e7e1f8] hover:border-[#5e2ced]/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-[#f3effc] text-[#5e2ced] border border-[#e7e1f8] flex items-center justify-center group-hover:bg-[#5e2ced] group-hover:text-white transition-all">
                <Smartphone className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#191236]">On-Site Check-In</h3>
              <p className="text-xs sm:text-sm text-[#5b6072] leading-relaxed">
                High-speed 12ms QR camera scanning, dedicated station passcodes, and resilient offline IndexedDB synchronization for zero gate delays.
              </p>
              <div className="pt-2 text-xs font-bold text-[#5e2ced] flex items-center gap-1">
                <span>Gate Operations Terminal</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>

            {/* Card 4 */}
            <div className="rounded-3xl p-6 bg-white border border-[#e7e1f8] hover:border-[#5e2ced]/50 hover:shadow-xl hover:shadow-purple-500/5 transition-all space-y-4 group">
              <div className="h-12 w-12 rounded-2xl bg-[#f3effc] text-[#5e2ced] border border-[#e7e1f8] flex items-center justify-center group-hover:bg-[#5e2ced] group-hover:text-white transition-all">
                <Mail className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-[#191236]">Email &amp; Pass Dispatch</h3>
              <p className="text-xs sm:text-sm text-[#5b6072] leading-relaxed">
                Send designer email invitations, scheduled reminders, and individualized vector QR passes directly to attendee inboxes.
              </p>
              <div className="pt-2 text-xs font-bold text-[#5e2ced] flex items-center gap-1">
                <span>Automated Email Hub</span>
                <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </div>
        </section>

        {/* 5. SPOTLIGHT YOUR BRAND SECTION */}
        <section className="py-16 bg-[#f6f3fe] border-y border-[#e7e1f8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column */}
              <div className="lg:col-span-6 space-y-5">
                <span className="text-xs font-bold uppercase tracking-widest text-[#5e2ced] bg-white px-3 py-1 rounded-full border border-[#e7e1f8]">
                  Custom Branding &amp; Clarity
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#191236] tracking-tight">
                  Spotlight your brand with confidence and clarity.
                </h2>
                <p className="text-sm sm:text-base text-[#5b6072] leading-relaxed">
                  Take full control of ticketing, registration, check-in, and guest communication with RSVP. Tailor every interaction to your brand colors, cover images, typography, and custom domain.
                </p>

                {/* Feature Tags */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {[
                    "Custom Brand Themes",
                    "Embedded Logo QR Passes",
                    "Multi-Part Agendas",
                    "Custom Sub-domains",
                    "Avery 8-Up Badge Printing",
                    "Automated Tax Ledgers",
                  ].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 rounded-full bg-white border border-[#e7e1f8] text-xs font-bold text-[#191236] shadow-2xs"
                    >
                      ✓ {tag}
                    </span>
                  ))}
                </div>

                <div className="pt-3">
                  {session ? (
                    <Link
                      href="/events/new"
                      className="inline-flex items-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                    >
                      <span>Create Your Branded Event</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <Link
                      href="/signup"
                      className="inline-flex items-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] px-6 py-3.5 text-xs font-bold text-white shadow-md shadow-purple-500/20 transition-all cursor-pointer"
                    >
                      <span>Get Started with Custom Branding</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Right Column: Branded Event Card Mockup */}
              <div className="lg:col-span-6">
                <div className="rounded-3xl bg-white p-6 border border-[#e7e1f8] shadow-xl shadow-purple-900/5 space-y-4">
                  {/* Event Cover Banner */}
                  <div className="h-44 rounded-2xl bg-gradient-to-r from-[#5e2ced] via-[#7c3aed] to-[#4f46e5] p-6 flex flex-col justify-between text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-md px-2.5 py-1 rounded-full">
                        Official Event Pass
                      </span>
                      <span className="text-xs font-bold">2026 EDITION</span>
                    </div>
                    <div>
                      <h4 className="text-xl sm:text-2xl font-black">{demoEvent?.title || "Global Technology Summit 2026"}</h4>
                      <p className="text-xs text-purple-100 flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3 w-3" />
                        <span>{demoEvent?.venue || "Grand Concourse Convention Center, San Francisco"}</span>
                      </p>
                    </div>
                  </div>

                  {/* Event Details Bar */}
                  <div className="grid grid-cols-3 gap-3 p-3 rounded-2xl bg-[#fbfaff] border border-[#e7e1f8] text-center text-xs">
                    <div>
                      <p className="text-[10px] text-[#6e6a86] font-semibold">DATE</p>
                      <p className="font-bold text-[#191236]">Dec 15, 2026</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6e6a86] font-semibold">CAPACITY</p>
                      <p className="font-bold text-[#5e2ced]">500 Guests</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-[#6e6a86] font-semibold">GATE ACCESS</p>
                      <p className="font-bold text-emerald-600">Level-H QR</p>
                    </div>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs">
                    <span className="text-[#5b6072]">Need to manage guest access?</span>
                    {session ? (
                      <Link
                        href="/manager"
                        className="font-bold text-[#5e2ced] hover:text-[#5225d3] flex items-center gap-1"
                      >
                        <span>Operations Command</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <Link
                        href="/login"
                        className="font-bold text-[#5e2ced] hover:text-[#5225d3] flex items-center gap-1"
                      >
                        <span>Sign In to Access</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. REAL DYNAMIC EVENTS DIRECTORY */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
            <div className="space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#5e2ced] bg-[#f3effc] px-3 py-1 rounded-full border border-[#e7e1f8]">
                Public Events
              </span>
              <h2 className="text-3xl font-extrabold text-[#191236]">
                Featured Events Powered by RSVP
              </h2>
              <p className="text-sm text-[#5b6072]">
                Explore live events currently open for public guest registration.
              </p>
            </div>

            {session && (
              <Link
                href="/events/new"
                className="inline-flex items-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] text-white px-5 py-2.5 text-xs font-bold shadow-sm shadow-purple-500/20 transition cursor-pointer self-start sm:self-auto"
              >
                <span>+ Create New Event</span>
              </Link>
            )}
          </div>

          {loading ? (
            <div className="text-center py-12 text-sm text-[#6e6a86]">
              Loading active events...
            </div>
          ) : events.length === 0 ? (
            <div className="rounded-3xl border border-[#e7e1f8] bg-white p-12 text-center space-y-4">
              <CalendarCheck className="h-10 w-10 text-[#5e2ced] mx-auto" />
              <h4 className="text-base font-bold text-[#191236]">No events configured yet</h4>
              <p className="text-xs text-[#5b6072] max-w-md mx-auto">
                Ready to host your first conference, banquet, or summit? Create an event in 60 seconds with full RSVP &amp; gate check-in support.
              </p>
              <Link
                href={session ? "/events/new" : "/signup"}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#5e2ced] text-white px-5 py-2.5 text-xs font-bold"
              >
                <span>{session ? "Launch First Event" : "Sign Up to Create Events"}</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => (
                <div
                  key={evt.id}
                  className="rounded-3xl bg-white border border-[#e7e1f8] p-6 shadow-sm hover:shadow-xl hover:shadow-purple-500/5 hover:border-[#5e2ced]/40 transition-all flex flex-col justify-between space-y-5 group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#f3effc] text-[#5e2ced] px-2.5 py-0.5 rounded-full border border-[#e7e1f8]">
                        Open for RSVPs
                      </span>
                      <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                        Live Event
                      </span>
                    </div>

                    <h3 className="text-lg font-bold text-[#191236] group-hover:text-[#5e2ced] transition-colors line-clamp-1">
                      {evt.title}
                    </h3>

                    <p className="text-xs text-[#5b6072] line-clamp-2 leading-relaxed">
                      {evt.description || "Comprehensive event management, guest RSVPs, and gate check-in."}
                    </p>

                    <div className="space-y-1.5 text-xs text-[#5b6072] pt-1">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3.5 w-3.5 text-[#5e2ced]" />
                        <span>{new Date(evt.event_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3.5 w-3.5 text-[#5e2ced]" />
                        <span className="truncate">{evt.venue || "Virtual Venue"}</span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#e7e1f8] flex items-center justify-between gap-2">
                    <Link
                      href={`/e/${evt.slug}`}
                      target="_blank"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#5e2ced] hover:text-[#5225d3]"
                    >
                      <span>Register / RSVP</span>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>

                    {/* Differentiated action: Logged in hosts can manage; logged out visitors are prompted to sign in */}
                    {session ? (
                      <Link
                        href={`/events/${evt.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-[#f3effc] hover:bg-[#ece7fb] px-3.5 py-1.5 text-xs font-bold text-[#5e2ced] transition"
                      >
                        <span>Manage Host</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    ) : (
                      <Link
                        href={`/login?redirect=/events/${evt.id}`}
                        className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200 px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition"
                      >
                        <Lock className="h-3 w-3 text-slate-400" />
                        <span>Sign In to Manage</span>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* 7. SOLUTIONS BY EVENT CATEGORY */}
        <section className="py-16 bg-[#fbfaff] border-t border-[#e7e1f8]" id="solutions">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-10 space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#5e2ced] bg-[#f3effc] px-3 py-1 rounded-full border border-[#e7e1f8]">
                Solutions
              </span>
              <h2 className="text-3xl font-extrabold text-[#191236]">
                Built for every type of event.
              </h2>
            </div>

            {/* Category Buttons */}
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {[
                { id: "corporate", label: "Corporate & Conferences", icon: Building2 },
                { id: "nonprofit", label: "Galas & Non-Profits", icon: Crown },
                { id: "tech", label: "Tech Summits & Hackathons", icon: Laptop },
                { id: "private", label: "VIP Dinners & Receptions", icon: UtensilsCrossed },
              ].map((cat) => {
                const Icon = cat.icon;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSolutionCategory(cat.id as any)}
                    className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                      solutionCategory === cat.id
                        ? "bg-[#5e2ced] text-white shadow-sm shadow-purple-500/20"
                        : "bg-white text-[#5b6072] border border-[#e7e1f8] hover:bg-[#f6f3fe]"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Category Content Box */}
            <div className="rounded-3xl bg-white border border-[#e7e1f8] p-8 max-w-4xl mx-auto shadow-sm">
              {solutionCategory === "corporate" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-[#191236]">Enterprise Conferences &amp; Multi-Track Summits</h3>
                  <p className="text-sm text-[#5b6072] leading-relaxed">
                    Coordinate tens of thousands of corporate attendees across multi-day agendas, breakout workshops, and vendor expos. Assign dedicated field station passcodes to external event security staff for zero-friction entrance flow.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">Multi-Gate Passcodes</span>
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">Automated Attendance Certificates</span>
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">CSV Audit Trail Export</span>
                  </div>
                </div>
              )}

              {solutionCategory === "nonprofit" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-[#191236]">Fundraising Galas &amp; Donor Receptions</h3>
                  <p className="text-sm text-[#5b6072] leading-relaxed">
                    Collect charitable registrations, table sponsorships, and tax-deductible ticket purchases. Ensure high-profile donors receive their VIP credentials with branded Level-H vector QR codes.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">VIP Donor Badges</span>
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">Table Seating Assignments</span>
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">Zero Hidden Markups</span>
                  </div>
                </div>
              )}

              {solutionCategory === "tech" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-[#191236]">Developer Hackathons &amp; Product Launches</h3>
                  <p className="text-sm text-[#5b6072] leading-relaxed">
                    Handle lightning-speed check-ins for hundreds of developers in minutes. Verify GitHub profiles, dietary requirements, and hardware kit allocations with instant 12ms camera scanning.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">12ms Verification Latency</span>
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">Offline IndexedDB Resilience</span>
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">Self-Service Pass Edits</span>
                  </div>
                </div>
              )}

              {solutionCategory === "private" && (
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-[#191236]">Private VIP Dinners &amp; Celebrations</h3>
                  <p className="text-sm text-[#5b6072] leading-relaxed">
                    Curate guest lists with host screening approval workflows, plus-one controls, and tailored culinary preferences. Deliver a bespoke white-glove check-in experience.
                  </p>
                  <div className="flex flex-wrap gap-2 pt-2">
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">Host Screening Approval</span>
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">Dietary &amp; Allergy Logging</span>
                    <span className="text-xs font-semibold bg-[#f3effc] text-[#5e2ced] px-3 py-1 rounded-full">Private Plus-One Passes</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* 8. ENTERPRISE SECURITY & RELIABILITY MATRIX */}
        <section className="py-16 bg-white border-y border-[#e7e1f8]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-12 space-y-2">
              <span className="text-xs font-bold uppercase tracking-widest text-[#5e2ced] bg-[#f3effc] px-3 py-1 rounded-full border border-[#e7e1f8]">
                Security &amp; Infrastructure
              </span>
              <h2 className="text-3xl font-extrabold text-[#191236]">
                Built for High-Stakes Operations
              </h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="p-6 rounded-3xl bg-[#fbfaff] border border-[#e7e1f8] space-y-2">
                <p className="text-3xl sm:text-4xl font-black text-[#5e2ced]">12ms</p>
                <p className="text-xs font-bold text-[#191236]">Verification Latency</p>
                <p className="text-[11px] text-[#6e6a86]">Sub-second camera scanning prevents queue buildup</p>
              </div>

              <div className="p-6 rounded-3xl bg-[#fbfaff] border border-[#e7e1f8] space-y-2">
                <p className="text-3xl sm:text-4xl font-black text-[#5e2ced]">Level &ldquo;H&rdquo;</p>
                <p className="text-xs font-bold text-[#191236]">Vector Error Correction</p>
                <p className="text-[11px] text-[#6e6a86]">Scannable even when up to 30% of code is damaged</p>
              </div>

              <div className="p-6 rounded-3xl bg-[#fbfaff] border border-[#e7e1f8] space-y-2">
                <p className="text-3xl sm:text-4xl font-black text-[#5e2ced]">100%</p>
                <p className="text-xs font-bold text-[#191236]">Offline Resilience</p>
                <p className="text-[11px] text-[#6e6a86]">IndexedDB storage automatically caches roster</p>
              </div>

              <div className="p-6 rounded-3xl bg-[#fbfaff] border border-[#e7e1f8] space-y-2">
                <p className="text-3xl sm:text-4xl font-black text-[#5e2ced]">OWASP</p>
                <p className="text-xs font-bold text-[#191236]">Sliding Rate Limiter</p>
                <p className="text-[11px] text-[#6e6a86]">8-attempt lockout defends staff station PINs</p>
              </div>
            </div>
          </div>
        </section>

        {/* 9. TESTIMONIAL BANNER */}
        <section className="py-16 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="space-y-4">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-5 w-5 fill-amber-400" />
              ))}
            </div>
            <p className="text-lg sm:text-xl font-medium text-[#191236] italic leading-relaxed">
              &ldquo;RSVP handled our 3,500-attendee global tech conference without a single queue delay. The offline scanner mode saved us when the convention center Wi-Fi went down, and every attendee checked in under 15 seconds.&rdquo;
            </p>
            <div>
              <p className="text-sm font-bold text-[#191236]">Sarah Jenkins</p>
              <p className="text-xs text-[#6e6a86]">Director of Global Event Operations, Apex Technologies</p>
            </div>
          </div>
        </section>

        {/* 10. HIGH-CONVERSION BOTTOM CTA */}
        <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl p-10 sm:p-16 bg-gradient-to-r from-[#5e2ced] via-[#6e54e0] to-[#45286b] text-white shadow-2xl relative overflow-hidden text-center">
            {/* Ambient Background Circles */}
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#a485fd]/20 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-3xl mx-auto space-y-6">
              <span className="text-xs font-bold uppercase tracking-widest bg-white/20 backdrop-blur-md px-3.5 py-1 rounded-full">
                Get Started Free Today
              </span>
              <h2 className="text-3xl sm:text-5xl font-black tracking-tight leading-tight">
                Ready to plan your next event with confidence?
              </h2>
              <p className="text-sm sm:text-lg text-purple-100 max-w-xl mx-auto leading-relaxed">
                Join thousands of professional planners and host unforgettable experiences with RSVP. Free for your first 100 RSVPs.
              </p>

              <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
                {session ? (
                  <Link
                    href="/events/new"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-purple-50 text-[#5e2ced] px-8 py-4 text-base font-bold shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Create An Event Now</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <Link
                    href="/signup"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white hover:bg-purple-50 text-[#5e2ced] px-8 py-4 text-base font-bold shadow-lg transition-all active:scale-[0.98] cursor-pointer"
                  >
                    <span>Create Your Free Account</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                )}

                <Link
                  href={session ? "/events" : "/login"}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-full bg-white/15 hover:bg-white/25 text-white border border-white/20 px-8 py-4 text-sm font-bold transition-all cursor-pointer"
                >
                  <span>{session ? "Open Dashboard" : "Sign In to Portal"}</span>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 11. COMPREHENSIVE MODERN FOOTER */}
      <footer className="border-t border-[#e7e1f8] bg-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-12">
            {/* Col 1: Brand Info */}
            <div className="col-span-2 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#5e2ced] to-[#7c3aed] text-white shadow-md shadow-purple-500/20">
                  <CalendarCheck className="h-5 w-5" />
                </div>
                <span className="font-extrabold tracking-tight text-[#191236] text-xl flex items-center gap-1">
                  RSVP<span className="h-2 w-2 rounded-full bg-[#5e2ced]"></span>
                </span>
              </div>
              <p className="text-xs text-[#5b6072] max-w-xs leading-relaxed">
                The premier event management platform for enterprise registrations, ticketing, automated QR passes, and instant gate check-ins.
              </p>
              <div className="pt-2 flex items-center gap-2 text-xs font-bold text-[#5e2ced]">
                <span>Status: 99.99% Operational</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* Col 2: Product */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-[#191236] uppercase tracking-wider text-[11px]">Product</p>
              <ul className="space-y-2 text-[#5b6072]">
                <li><Link href="/events" className="hover:text-[#5e2ced]">Online RSVP</Link></li>
                <li><Link href="/events/new" className="hover:text-[#5e2ced]">Event Registration</Link></li>
                <li><Link href="/events" className="hover:text-[#5e2ced]">Ticket Sales</Link></li>
                <li><Link href="/employee/scanner" className="hover:text-[#5e2ced]">QR Check-In</Link></li>
                <li><Link href="/manager" className="hover:text-[#5e2ced]">Seating &amp; Capacity</Link></li>
              </ul>
            </div>

            {/* Col 3: Solutions */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-[#191236] uppercase tracking-wider text-[11px]">Solutions</p>
              <ul className="space-y-2 text-[#5b6072]">
                <li><Link href="/events" className="hover:text-[#5e2ced]">Corporate Summits</Link></li>
                <li><Link href="/events" className="hover:text-[#5e2ced]">Galas &amp; Non-Profits</Link></li>
                <li><Link href="/events" className="hover:text-[#5e2ced]">Tech Hackathons</Link></li>
                <li><Link href="/events" className="hover:text-[#5e2ced]">Private Receptions</Link></li>
                <li><Link href="/admin" className="hover:text-[#5e2ced]">Enterprise Security</Link></li>
              </ul>
            </div>

            {/* Col 4: Platform Operations */}
            <div className="space-y-2 text-xs">
              <p className="font-bold text-[#191236] uppercase tracking-wider text-[11px]">Operations</p>
              <ul className="space-y-2 text-[#5b6072]">
                <li><Link href="/login" className="hover:text-[#5e2ced]">Station Staff Login</Link></li>
                <li><Link href="/manager" className="hover:text-[#5e2ced]">Operations Command</Link></li>
                <li><Link href="/admin" className="hover:text-[#5e2ced]">Admin Payout Ledger</Link></li>
                <li><Link href="/employee/scanner" className="hover:text-[#5e2ced]">Offline Scanner</Link></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-[#e7e1f8] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6e6a86]">
            <p>© 2026 RSVP Platform. All rights reserved.</p>
            <div className="flex items-center gap-6">
              <span>SOC-2 Type II Certified</span>
              <span>GDPR Compliant</span>
              <span>12ms Latency Guarantee</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
