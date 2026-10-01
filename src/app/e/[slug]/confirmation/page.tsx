"use client";

import { useEffect, useState, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import confetti from "canvas-confetti";
import {
  CheckCircle2,
  Calendar,
  MapPin,
  Clock,
  Printer,
  Download,
  Share2,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  Ticket as TicketIcon,
  Mail,
  Loader2,
  Building2,
} from "lucide-react";
import { Event } from "@/types/database";
import { formatDate, formatTime, createIcsCalendarUrl, createGoogleCalendarUrl } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ConfirmationPage({ params }: PageProps) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const ticketCode = searchParams.get("ticket") || "TK-GUEST";
  const status = searchParams.get("status") || "attending";

  const [event, setEvent] = useState<Event | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [resendEmail, setResendEmail] = useState("");
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [showEmailPrompt, setShowEmailPrompt] = useState(false);
  const isAttending = status === "attending";

  useEffect(() => {
    // Fire festive celebration confetti if attendee confirmed
    if (isAttending) {
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
          colors: ["#0284c7", "#10b981", "#6366f1", "#f59e0b"],
        });
      } catch {
        // Safe fallback
      }
    }

    async function loadData() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        const found = (data.events || []).find((e: Event) => e.slug === slug);
        if (found) {
          setEvent(found);

          // Fetch QR code
          const qrPayload = `RSVP:${found.id}:${ticketCode}`;
          const resQr = await fetch(`/api/qr?text=${encodeURIComponent(qrPayload)}`);
          if (resQr.ok) {
            const qrJson = await resQr.json();
            setQrDataUrl(qrJson.dataUrl);
          }
        }
      } catch (err) {
        console.error(err);
      }
    }

    loadData();
  }, [slug, ticketCode, isAttending]);

  async function handleResendEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!resendEmail.trim() || !event) return;
    setIsResending(true);
    setResendMessage(null);

    try {
      const res = await fetch("/api/rsvp/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: resendEmail.trim().toLowerCase(),
          event_id: event.id,
        }),
      });

      const d = await res.json();
      if (res.ok) {
        setResendMessage("Digital ticket pass and event details sent to your email!");
        setShowEmailPrompt(false);
      } else {
        setResendMessage(d.error || "Failed to deliver ticket email. Please check your email address.");
      }
    } catch {
      setResendMessage("Network error sending email.");
    } finally {
      setIsResending(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between p-4 sm:p-6 print:bg-white print:p-0">
      <div className="mx-auto max-w-xl w-full my-auto space-y-6">
        {/* Status Header */}
        <div className="text-center print:hidden">
          <div
            className={`mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl shadow-sm ${
              isAttending ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-700"
            }`}
          >
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {isAttending ? "You're on the Guest List!" : "Response Confirmed"}
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {isAttending
              ? "Your digital pass has been issued. Present this QR code at the entrance for instant check-in."
              : "Thank you for letting us know. We hope to see you at future events!"}
          </p>
        </div>

        {/* Digital Ticket Pass Card */}
        {isAttending && event && (
          <div className="relative overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xl print:shadow-none print:border-black">
            {/* Ticket Header */}
            <div className="bg-slate-900 text-white p-6 relative overflow-hidden">
              <div className="absolute right-0 top-0 -mr-6 -mt-6 h-28 w-28 rounded-full bg-sky-600/30 blur-2xl pointer-events-none" />
              <div className="flex items-center justify-between text-xs text-sky-400 font-bold uppercase tracking-wider mb-2">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5" />
                  Official Digital Pass
                </span>
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded text-white text-[11px]">
                  {ticketCode}
                </span>
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white leading-tight">
                {event.title}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Hosted by RSVP Pro Event Management
              </p>
            </div>

            {/* Ticket Details & QR Code */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Date & Time</span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {formatDate(event.start_date, event.timezone)}
                  </span>
                  <span className="text-slate-500">
                    {formatTime(event.start_date, event.timezone)}
                  </span>
                </div>

                <div>
                  <span className="text-slate-400 block uppercase font-bold text-[10px]">Location</span>
                  <span className="font-semibold text-slate-900 block mt-0.5">
                    {event.location_name || "See invitation details"}
                  </span>
                  {event.location_address && (
                    <span className="text-slate-500 text-[11px] block truncate">
                      {event.location_address}
                    </span>
                  )}
                </div>
              </div>

              {/* Perforation line */}
              <div className="relative flex items-center justify-center my-4">
                <div className="border-t-2 border-dashed border-slate-200 w-full" />
                <div className="absolute -left-9 h-6 w-6 rounded-full bg-slate-100 border-r border-slate-200" />
                <div className="absolute -right-9 h-6 w-6 rounded-full bg-slate-100 border-l border-slate-200" />
              </div>

              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner">
                  {qrDataUrl ? (
                    <img
                      src={qrDataUrl}
                      alt="Digital Check-In QR Code"
                      className="h-44 w-44 object-contain rounded-lg"
                    />
                  ) : (
                    <div className="h-44 w-44 bg-slate-100 rounded-lg flex items-center justify-center text-slate-400">
                      <TicketIcon className="h-10 w-10 animate-pulse" />
                    </div>
                  )}
                </div>
                <span className="mt-2 text-[11px] font-mono text-slate-500 tracking-wider">
                  SCAN AT GATE • {ticketCode}
                </span>
              </div>

              {/* Resend to Email Feedback message */}
              {resendMessage && (
                <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-800 text-center font-medium animate-in fade-in">
                  {resendMessage}
                </div>
              )}

              {/* Resend to Email Prompt */}
              {showEmailPrompt && (
                <form onSubmit={handleResendEmail} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3 animate-in fade-in">
                  <span className="text-xs font-semibold text-slate-800 block">
                    Send Ticket Pass & Event Details to Email:
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
                    />
                    <button
                      type="submit"
                      disabled={isResending || !resendEmail.trim()}
                      className="rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-sky-500 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                    >
                      {isResending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                      <span>Send</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Ticket Actions Bar */}
            <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-4 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailPrompt(!showEmailPrompt)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Mail className="h-3.5 w-3.5 text-sky-600" />
                  <span>Email Pass</span>
                </button>

                <a
                  href={createGoogleCalendarUrl({
                    title: event.title,
                    description: event.description,
                    location: event.location_name || event.location_address,
                    startDate: event.start_date,
                    endDate: event.end_date,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 shadow-2xs"
                >
                  + Google Cal
                </a>

                <a
                  href={createIcsCalendarUrl({
                    title: event.title,
                    description: event.description,
                    location: event.location_name || event.location_address,
                    startDate: event.start_date,
                    endDate: event.end_date,
                  })}
                  download={`${event.slug}.ics`}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-100 shadow-2xs"
                >
                  .ICS
                </a>
              </div>

              <button
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 font-medium text-white hover:bg-slate-800 shadow-xs cursor-pointer"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Pass</span>
              </button>
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="text-center print:hidden">
          <Link
            href={`/e/${slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Return to Event Invitation</span>
          </Link>
        </div>
      </div>

      <footer className="py-6 text-center text-xs text-slate-400 print:hidden">
        RSVP Pro • Seamless Event Operations
      </footer>
    </div>
  );
}
