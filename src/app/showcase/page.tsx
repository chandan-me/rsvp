"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  ArrowRight,
  FileText,
  CheckCircle2,
  ChevronRight,
  Ticket,
  Tag,
  ShieldCheck,
  Armchair,
  Sparkles,
  Zap,
  QrCode,
  ScanLine,
  Shield,
  Printer,
} from "lucide-react";
import { getVerifiedSession } from "@/lib/authClient";

export default function InteractiveShowcasePage() {
  const [activeTab, setActiveTab] = useState<"rsvp" | "tickets" | "checkin" | "seating">("rsvp");
  const [events, setEvents] = useState<any[]>([]);
  const [session, setSession] = useState<{ user: string; role: string } | null>(null);

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

  useEffect(() => {
    async function checkAuth() {
      try {
        const data = await getVerifiedSession();
        if (data.authenticated && data.user) {
          setSession({ user: data.user.name, role: data.user.role });
        }
      } catch {
        // guest mode
      }
    }
    checkAuth();
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

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full space-y-10">
        {/* Breadcrumb & Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#f3effc] border border-[#e7e1f8] px-4 py-1.5 text-xs font-bold text-[#5e2ced]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Interactive Product Demonstration</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-[#191236]">
            Test the RSVP Pro Experience Live
          </h1>

          <p className="text-sm sm:text-base text-[#5b6072] leading-relaxed">
            Experience our 4 core event capabilities before hosting: test the custom registration form, customize digital vector QR badges, simulate high-speed turnstile gate check-in, and explore visual table seating.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href={session ? "/events/new" : "/signup"}
              className="inline-flex items-center gap-2 rounded-full bg-[#5e2ced] hover:bg-[#5225d3] text-white px-6 py-2.5 text-xs font-bold shadow-md shadow-purple-500/20 transition-all cursor-pointer"
            >
              <span>{session ? "Create Your Event Now" : "Launch Free Event in 60s"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>

            <Link
              href="/lookup"
              className="inline-flex items-center gap-2 rounded-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-5 py-2.5 text-xs font-semibold shadow-2xs transition-all"
            >
              <Ticket className="w-3.5 h-3.5 text-[#5e2ced]" />
              <span>Find My Ticket Pass</span>
            </Link>
          </div>
        </div>

        {/* Dedicated Interactive Showcase Window */}
        <div className="rounded-3xl bg-white border border-[#e7e1f8] shadow-2xl shadow-purple-900/10 overflow-hidden">
          {/* Window Header Bar */}
          <div className="border-b border-[#e7e1f8] bg-[#fbfaff] px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-rose-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-3 text-xs font-mono text-[#6e6a86] font-semibold">
                rsvp-operations-v4.production
              </span>
            </div>

            {/* Tab Switcher */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#f3effc] rounded-2xl md:rounded-full text-xs font-bold">
              <button
                type="button"
                onClick={() => setActiveTab("rsvp")}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                  activeTab === "rsvp"
                    ? "bg-[#5e2ced] text-white shadow-xs"
                    : "text-[#5b6072] hover:text-[#191236]"
                }`}
              >
                1. Online RSVP Form
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tickets")}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                  activeTab === "tickets"
                    ? "bg-[#5e2ced] text-white shadow-xs"
                    : "text-[#5b6072] hover:text-[#191236]"
                }`}
              >
                2. Digital Pass Simulator
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("checkin")}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
                  activeTab === "checkin"
                    ? "bg-[#5e2ced] text-white shadow-xs"
                    : "text-[#5b6072] hover:text-[#191236]"
                }`}
              >
                3. Live Turnstile Scanner
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("seating")}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer ${
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
                        Interactive Demo Form
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

            {/* TAB 2: TICKETING & PASS SIMULATOR */}
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
                    Collect registration fees or ticket sales securely. Keep 100% of your ticket price on free events, with seamless net revenue ledgering.
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
                    <span className="text-[10px] text-[#6e6a86]">Live pricing simulation</span>
                  </div>

                  <div className="space-y-2.5">
                    <div
                      onClick={() => setTierStyle("ga")}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        tierStyle === "ga"
                          ? "bg-white border-[#5e2ced] shadow-sm ring-2 ring-[#5e2ced]/15"
                          : "bg-white border-[#e7e1f8] hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-[#191236] flex items-center gap-1.5">
                          <Tag className="h-3 w-3 text-[#5e2ced]" />
                          <span>General Admission Pass</span>
                        </div>
                        <p className="text-[11px] text-[#5b6072] mt-0.5">Access to all general sessions &amp; lunch</p>
                      </div>
                      <span className="font-mono font-bold text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-lg">
                        FREE
                      </span>
                    </div>

                    <div
                      onClick={() => setTierStyle("vip")}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        tierStyle === "vip"
                          ? "bg-white border-[#5e2ced] shadow-sm ring-2 ring-[#5e2ced]/15"
                          : "bg-white border-[#e7e1f8] hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-[#191236] flex items-center gap-1.5">
                          <Sparkles className="h-3 w-3 text-amber-500" />
                          <span>VIP Executive All-Access</span>
                        </div>
                        <p className="text-[11px] text-[#5b6072] mt-0.5">Reserved front seating + Backstage lounge</p>
                      </div>
                      <span className="font-mono font-bold text-xs text-[#5e2ced] bg-[#f3effc] px-2.5 py-1 rounded-lg">
                        $249.00
                      </span>
                    </div>

                    <div
                      onClick={() => setTierStyle("speaker")}
                      className={`p-3.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                        tierStyle === "speaker"
                          ? "bg-white border-[#5e2ced] shadow-sm ring-2 ring-[#5e2ced]/15"
                          : "bg-white border-[#e7e1f8] hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-xs text-[#191236] flex items-center gap-1.5">
                          <ShieldCheck className="h-3 w-3 text-sky-600" />
                          <span>Speaker / VIP Presenter</span>
                        </div>
                        <p className="text-[11px] text-[#5b6072] mt-0.5">Green room access, AV mic pack &amp; escort</p>
                      </div>
                      <span className="font-mono font-bold text-xs text-slate-700 bg-slate-100 px-2.5 py-1 rounded-lg">
                        INVITE
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: LIVE CHECK-IN SCANNER SIMULATOR */}
            {activeTab === "checkin" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3effc] text-[#5e2ced] text-xs font-bold border border-[#e7e1f8]">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Gate Operations &amp; Turnstiles</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#191236]">
                    Check in 1,200 attendees/hour at under 15ms.
                  </h3>
                  <p className="text-sm text-[#5b6072] leading-relaxed">
                    Our scanner works on smartphones, iPads, and handheld USB laser guns. Works 100% offline via client-side verification and prevents screenshot sharing.
                  </p>
                  <ul className="space-y-2 text-xs text-[#5b6072] font-medium pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                      <span>Instant visual &amp; audio feedback tone (happy chime / buzzer)</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                      <span>Real-time duplicate detection across multiple gate doors</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                      <span>Offline queue auto-syncs when Wi-Fi is restored</span>
                    </li>
                  </ul>
                </div>

                {/* Interactive Scanner Simulator */}
                <div className="lg:col-span-6 rounded-2xl border border-slate-900 bg-slate-950 p-6 text-white shadow-xl space-y-4">
                  <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
                    <span className="font-mono text-emerald-400 font-bold flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
                      TURNS-01 • MAIN GATE ACTIVE
                    </span>
                    <span className="text-slate-400 font-mono">15ms Target</span>
                  </div>

                  {/* Camera Aim Box Simulation */}
                  <div className="relative h-44 rounded-xl border-2 border-dashed border-slate-700 bg-slate-900/60 flex flex-col items-center justify-center p-4 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-b from-[#5e2ced]/10 via-transparent to-transparent animate-pulse" />
                    <QrCode className="h-16 w-16 text-slate-500 mb-2" />
                    <span className="text-xs text-slate-400 font-mono">
                      {isSimulatingScan ? "Decoding vector QR matrix..." : "Aim camera or press Simulate Scan"}
                    </span>

                    {/* Scan line laser */}
                    {isSimulatingScan && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_12px_#34d399] animate-bounce" />
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={simulateScan}
                      disabled={isSimulatingScan}
                      className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <ScanLine className="h-4 w-4" />
                      <span>{isSimulatingScan ? "Verifying..." : "Simulate Gate Scan"}</span>
                    </button>
                  </div>

                  {scanResult && (
                    <div className="p-3 rounded-xl bg-emerald-950 border border-emerald-800/80 text-emerald-300 text-xs font-mono text-center font-bold animate-in fade-in">
                      {scanResult}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB 4: SEATING & CAPACITY PLANNER */}
            {activeTab === "seating" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-6 space-y-4">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f3effc] text-[#5e2ced] text-xs font-bold border border-[#e7e1f8]">
                    <Armchair className="w-3.5 h-3.5" />
                    <span>Table Assignments &amp; Seating</span>
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-extrabold text-[#191236]">
                    Drag-and-drop table arrangements for banquets.
                  </h3>
                  <p className="text-sm text-[#5b6072] leading-relaxed">
                    Assign VIPs, corporate sponsors, and speakers to specific tables. Attendees can view their assigned table on their digital pass.
                  </p>
                  <ul className="space-y-2 text-xs text-[#5b6072] font-medium pt-2">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                      <span>Automated table capacity enforcement</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                      <span>VIP seating alerts on gate check-in</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-[#5e2ced]" />
                      <span>Live export for catering staff &amp; event planners</span>
                    </li>
                  </ul>
                </div>

                {/* Seating Simulator */}
                <div className="lg:col-span-6 rounded-2xl border border-[#e7e1f8] bg-[#fbfaff] p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-[#e7e1f8] text-xs">
                    <span className="font-bold text-[#191236]">Main Ballroom • Grand Gala Layout</span>
                    <span className="text-emerald-600 font-bold">88% Capacity</span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { name: "Table 1 (VIP)", count: "8/8", full: true },
                      { name: "Table 2 (Sponsors)", count: "8/8", full: true },
                      { name: "Table 3 (Speakers)", count: "7/8", full: false },
                      { name: "Table 4 (Executive)", count: "6/8", full: false },
                      { name: "Table 5 (General)", count: "8/8", full: true },
                      { name: "Table 6 (General)", count: "5/8", full: false },
                    ].map((tbl, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-xl border text-center transition ${
                          tbl.full
                            ? "bg-slate-100 border-slate-300 text-slate-700"
                            : "bg-white border-[#5e2ced]/40 shadow-xs text-[#191236]"
                        }`}
                      >
                        <Armchair
                          className={`w-5 h-5 mx-auto mb-1 ${
                            tbl.full ? "text-slate-400" : "text-[#5e2ced]"
                          }`}
                        />
                        <div className="text-[11px] font-bold truncate">{tbl.name}</div>
                        <div className="text-[10px] text-slate-500 font-mono">{tbl.count} seats</div>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 text-center">
                    <span className="text-[11px] text-[#5b6072] inline-flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      Table seating prints automatically onto conference Avery badges
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Feature Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="rounded-3xl bg-white border border-[#e7e1f8] p-6 space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-2xl bg-[#f3effc] text-[#5e2ced] flex items-center justify-center font-bold">
              <Zap className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[#191236]">15ms Check-In Engine</h4>
            <p className="text-xs text-[#5b6072] leading-relaxed">
              Equip your staff with mobile scanners that verify guest authenticity in milliseconds, offline or online, avoiding long registration lines.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-[#e7e1f8] p-6 space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-2xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold">
              <Shield className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[#191236]">Anti-Duplicate Security</h4>
            <p className="text-xs text-[#5b6072] leading-relaxed">
              HMAC cryptographic signatures and cross-device live sync prevent screenshot reuse, forged tickets, and multiple entry attempts.
            </p>
          </div>

          <div className="rounded-3xl bg-white border border-[#e7e1f8] p-6 space-y-3 shadow-xs">
            <div className="h-10 w-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Printer className="h-5 w-5" />
            </div>
            <h4 className="text-base font-bold text-[#191236]">Name Badge Studio</h4>
            <p className="text-xs text-[#5b6072] leading-relaxed">
              Generate and print crisp attendee name badges, lanyard clip-ons, and Avery 8-up labels with attendee company names and dietary icons.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
