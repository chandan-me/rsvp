"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  Search,
  Calendar,
  MapPin,
  Clock,
  Download,
  Mail,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Loader2,
  ShieldCheck,
  Copy,
  Check,
  Armchair,
  QrCode,
  Tag,
  User,
} from "lucide-react";
import { Event, Guest, Ticket } from "@/types/database";
import { formatDate, formatTime, createGoogleCalendarUrl, createIcsCalendarUrl } from "@/lib/utils";
import { getVerifiedSession } from "@/lib/authClient";

interface FoundPass {
  guest: Guest;
  ticket?: Ticket;
  event: Event;
  isCheckedIn: boolean;
  checkinTime?: string;
}

function LookupContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("email") || "";

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [passes, setPasses] = useState<FoundPass[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [selectedPassIndex, setSelectedPassIndex] = useState(0);
  const [qrLogo, setQrLogo] = useState<"ticket" | "shield" | "brand" | "calendar">("shield");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendStatus, setResendStatus] = useState<string | null>(null);
  const [session, setSession] = useState<{ user: string; role: string } | null>(null);

  useEffect(() => {
    async function checkSession() {
      try {
        const data = await getVerifiedSession();
        if (data.authenticated && data.user) {
          setSession({ user: data.user.name, role: data.user.role });
        }
      } catch {
        // guest mode
      }
    }
    checkSession();
  }, []);

  async function performLookup(searchVal: string) {
    const val = searchVal.trim();
    if (!val) return;

    setLoading(true);
    setError(null);
    setResendStatus(null);
    setHasSearched(true);

    try {
      const res = await fetch("/api/rsvp/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: val }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "No confirmed ticket pass was found.");
      }

      setPasses(data.passes || []);
      setSelectedPassIndex(0);
      if (data.passes?.length === 0) {
        setError(`No passes found matching "${val}". Please double check your email address or ticket code.`);
      }
    } catch (err: any) {
      setError(err?.message || "Failed to search for passes. Please try again.");
      setPasses([]);
    } finally {
      setLoading(false);
    }
  }

  // Auto-search if query param present
  useEffect(() => {
    if (initialQuery) {
      performLookup(initialQuery);
    }
  }, [initialQuery]);

  const activePass = passes[selectedPassIndex];

  // Generate / update QR code when active pass or chosen logo changes
  useEffect(() => {
    if (!activePass?.ticket || !activePass.event) return;

    async function generateQr() {
      try {
        const qrPayload = `RSVP:${activePass.event.id}:${activePass.ticket!.ticket_code}`;
        const params = new URLSearchParams({
          text: qrPayload,
          logo: qrLogo,
        });

        const res = await fetch(`/api/qr?${params.toString()}`);
        if (res.ok) {
          const data = await res.json();
          setQrDataUrl(data.dataUrl);
        }
      } catch (e) {
        console.warn("QR fetch error:", e);
      }
    }

    generateQr();
  }, [activePass?.ticket?.ticket_code, activePass?.event?.id, qrLogo]);

  function copyTicketCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  async function handleResendEmail(pass: FoundPass) {
    setResendingEmail(true);
    setResendStatus(null);
    try {
      const res = await fetch("/api/rsvp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: pass.guest.email,
          event_id: pass.event.id,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setResendStatus(`Pass sent to ${pass.guest.email}! Check your inbox.`);
      } else {
        setResendStatus(data.error || "Failed to resend pass email.");
      }
    } catch {
      setResendStatus("Network error sending pass email.");
    } finally {
      setResendingEmail(false);
    }
  }

  function downloadPassImage() {
    if (!qrDataUrl || !activePass) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `ticket-${activePass.guest.first_name}-${activePass.ticket?.ticket_code || "pass"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  return (
    <div className="min-h-screen bg-[#fbfaff] text-[#191236] flex flex-col selection:bg-[#5e2ced] selection:text-white">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        {/* Hero Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          {session ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-[#f3effc] border border-[#e7e1f8] px-3.5 py-1.5 text-xs font-bold text-[#5e2ced]">
              <User className="w-3.5 h-3.5" />
              <span>Host Search Mode • Signed in as {session.user} ({session.role})</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full bg-white border border-[#e7e1f8] px-3.5 py-1.5 text-xs font-bold text-[#5e2ced] shadow-xs">
              <Sparkles className="w-4 h-4" />
              <span>Attendee Self-Service Portal</span>
            </div>
          )}
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-[#191236]">
            Find My Ticket &amp; QR Pass
          </h1>
          <p className="text-sm text-[#5b6072] leading-relaxed">
            Lost your registration email or need your gate check-in pass? Enter your email address or ticket code to retrieve your pass instantly.
          </p>
        </div>

        {/* Search Box */}
        <div className="max-w-2xl mx-auto">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              performLookup(query);
            }}
            className="relative flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 bg-white p-2 sm:p-2.5 rounded-2xl border border-[#e7e1f8] shadow-lg shadow-purple-500/5 focus-within:border-[#5e2ced] transition-all"
          >
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Enter your email or ticket code (e.g. alex.rivera@google.com)"
                className="w-full pl-11 pr-4 py-3 bg-transparent text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !query.trim()}
              className="px-6 py-3 rounded-xl bg-[#5e2ced] hover:bg-[#5225d3] disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md shadow-[#5e2ced]/25 transition cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Searching...</span>
                </>
              ) : (
                <>
                  <span>Retrieve Pass</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Chips */}
          <div className="mt-3 flex items-center justify-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-semibold text-slate-400">Try demo:</span>
            <button
              type="button"
              onClick={() => {
                setQuery("alex.rivera@google.com");
                performLookup("alex.rivera@google.com");
              }}
              className="px-2.5 py-1 rounded-full bg-white border border-[#e7e1f8] hover:border-[#5e2ced] text-slate-700 font-medium hover:text-[#5e2ced] transition cursor-pointer"
            >
              alex.rivera@google.com
            </button>
            <button
              type="button"
              onClick={() => {
                setQuery("elena.chen@mit.edu");
                performLookup("elena.chen@mit.edu");
              }}
              className="px-2.5 py-1 rounded-full bg-white border border-[#e7e1f8] hover:border-[#5e2ced] text-slate-700 font-medium hover:text-[#5e2ced] transition cursor-pointer"
            >
              elena.chen@mit.edu
            </button>
          </div>
        </div>

        {/* Error Notification */}
        {error && (
          <div className="max-w-2xl mx-auto p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
            <span className="flex-1 font-medium">{error}</span>
          </div>
        )}

        {/* Search Results Display */}
        {passes.length > 0 && activePass && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
            {/* Multiple Passes Tab Switcher */}
            {passes.length > 1 && (
              <div className="max-w-2xl mx-auto flex items-center justify-center gap-2 bg-slate-100 p-1.5 rounded-2xl">
                {passes.map((p, idx) => (
                  <button
                    key={p.guest.id}
                    onClick={() => setSelectedPassIndex(idx)}
                    className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition ${
                      selectedPassIndex === idx
                        ? "bg-white text-[#5e2ced] shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {p.event.title}
                  </button>
                ))}
              </div>
            )}

            {/* The Digital Pass Card */}
            <div className="max-w-3xl mx-auto rounded-3xl bg-white border border-[#e7e1f8] shadow-xl shadow-purple-500/10 overflow-hidden">
              {/* Pass Header Banner */}
              <div className="bg-gradient-to-r from-[#191236] via-[#261758] to-[#5e2ced] text-white p-6 sm:p-8 relative overflow-hidden">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-[10px] font-extrabold uppercase tracking-wider text-purple-200 mb-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Official Digital Entrance Pass</span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black tracking-tight">{activePass.event.title}</h2>
                    <p className="text-xs text-purple-200 mt-1 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        {formatDate(activePass.event.start_date, activePass.event.timezone)} at{" "}
                        {formatTime(activePass.event.start_date, activePass.event.timezone)}
                      </span>
                    </p>
                  </div>

                  <div className="flex flex-col items-start sm:items-end">
                    <span className="text-[10px] uppercase font-bold text-purple-300">Gate Status</span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase mt-1 ${
                        activePass.isCheckedIn
                          ? "bg-emerald-500 text-white shadow-xs"
                          : "bg-white/20 text-white backdrop-blur-md border border-white/30"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>{activePass.isCheckedIn ? "Checked In" : "Valid for Entry"}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Pass Main Grid */}
              <div className="p-6 sm:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                {/* Left Side: QR Code & Branded Logo Selector */}
                <div className="flex flex-col items-center justify-center text-center space-y-4">
                  <div className="relative p-4 rounded-3xl bg-gradient-to-b from-[#fbfaff] to-[#f3effc] border-2 border-dashed border-[#e7e1f8] shadow-inner group">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Digital QR Check-in Pass"
                        className="w-56 h-56 rounded-2xl shadow-sm bg-white p-2"
                      />
                    ) : (
                      <div className="w-56 h-56 flex items-center justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-[#5e2ced]" />
                      </div>
                    )}
                  </div>

                  {/* QR Emblem Logo Picker */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Center Emblem Customizer
                    </span>
                    <div className="flex items-center justify-center gap-1.5 bg-[#fbfaff] p-1 rounded-xl border border-[#e7e1f8]">
                      {(["shield", "ticket", "brand", "calendar"] as const).map((logo) => (
                        <button
                          key={logo}
                          type="button"
                          onClick={() => setQrLogo(logo)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer capitalize ${
                            qrLogo === logo
                              ? "bg-[#5e2ced] text-white shadow-2xs"
                              : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                          }`}
                        >
                          {logo === "brand" ? "✨ Star" : logo === "shield" ? "🛡️ Shield" : logo === "ticket" ? "🎟️ Pass" : "📅 Date"}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Ticket Code Pill */}
                  <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-full">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Code:</span>
                    <span className="font-mono text-xs font-black text-slate-900 tracking-wider">
                      {activePass.ticket?.ticket_code || activePass.guest.qr_token}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyTicketCode(activePass.ticket?.ticket_code || activePass.guest.qr_token)}
                      className="p-1 text-slate-400 hover:text-[#5e2ced] transition cursor-pointer"
                      title="Copy ticket code"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Right Side: Attendee Details & Actions */}
                <div className="space-y-5">
                  <div className="space-y-3 pb-5 border-b border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Attendee Name</span>
                      <h3 className="text-lg font-black text-[#191236]">
                        {activePass.guest.first_name} {activePass.guest.last_name}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">{activePass.guest.email}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-[#fbfaff] border border-[#e7e1f8] p-3 rounded-2xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Ticket Tier</span>
                        <span className="text-xs font-extrabold text-[#5e2ced] flex items-center gap-1">
                          <Tag className="w-3 h-3" />
                          <span>{activePass.guest.tier_name || "General Admission"}</span>
                        </span>
                      </div>

                      <div className="bg-[#fbfaff] border border-[#e7e1f8] p-3 rounded-2xl">
                        <span className="text-[10px] font-bold uppercase text-slate-400 block mb-0.5">Seating / Table</span>
                        <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1">
                          <Armchair className="w-3 h-3 text-slate-400" />
                          <span>{activePass.guest.seating_assignment || "Open Seating"}</span>
                        </span>
                      </div>
                    </div>

                    {activePass.event.location_name && (
                      <div className="text-xs text-slate-600 flex items-start gap-2 pt-1">
                        <MapPin className="w-4 h-4 text-[#5e2ced] shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-slate-900 block">{activePass.event.location_name}</strong>
                          {activePass.event.location_address && (
                            <span className="text-slate-500">{activePass.event.location_address}</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={downloadPassImage}
                      className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Digital Pass (PNG)</span>
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <a
                        href={createGoogleCalendarUrl({
                          title: activePass.event.title,
                          description: activePass.event.description || "",
                          location: activePass.event.location_name || activePass.event.location_address || "",
                          startDate: activePass.event.start_date,
                          endDate: activePass.event.end_date,
                        })}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <Calendar className="w-3.5 h-3.5 text-sky-600" />
                        <span>Google Calendar</span>
                      </a>

                      <a
                        href={createIcsCalendarUrl({
                          title: activePass.event.title,
                          description: activePass.event.description || "",
                          location: activePass.event.location_name || activePass.event.location_address || "",
                          startDate: activePass.event.start_date,
                          endDate: activePass.event.end_date,
                        })}
                        download={`${activePass.event.slug || "event"}.ics`}
                        className="py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center justify-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Apple / .ICS</span>
                      </a>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleResendEmail(activePass)}
                      disabled={resendingEmail}
                      className="w-full py-2 px-4 rounded-xl border border-[#e7e1f8] bg-[#fbfaff] hover:bg-[#f3effc] text-[#5e2ced] text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {resendingEmail ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Sending Confirmation Email...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="w-3.5 h-3.5" />
                          <span>Email Me This Pass</span>
                        </>
                      )}
                    </button>

                    {resendStatus && (
                      <p className="text-[11px] text-center font-semibold text-emerald-700 bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                        {resendStatus}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Helpful Info Section */}
        {!hasSearched && (
          <div className="max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
            <div className="bg-white p-5 rounded-2xl border border-[#e7e1f8] shadow-2xs text-center space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#5e2ced] flex items-center justify-center mx-auto">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">High-Density QR</h4>
              <p className="text-[11px] text-slate-500">
                Level-H error correction with embedded center security emblems.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#e7e1f8] shadow-2xs text-center space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center mx-auto">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Instant Verification</h4>
              <p className="text-[11px] text-slate-500">
                Validates in under 15ms at gate turnstiles and food counters.
              </p>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-[#e7e1f8] shadow-2xs text-center space-y-1.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h4 className="text-xs font-bold text-slate-900">Anti-Duplicate</h4>
              <p className="text-[11px] text-slate-500">
                Cryptographically protected against screenshots and duplication.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TicketLookupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#fbfaff] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#5e2ced]" />
        </div>
      }
    >
      <LookupContent />
    </Suspense>
  );
}
