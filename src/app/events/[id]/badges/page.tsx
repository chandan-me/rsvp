"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  Filter,
  CheckCircle2,
  Users,
  Sparkles,
  QrCode,
  Loader2,
  LayoutGrid,
  FileText,
  Sliders,
} from "lucide-react";
import { Event, Guest, Ticket, TicketTier } from "@/types/database";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function NameBadgeStudioPage({ params }: PageProps) {
  const { id: eventId } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<any[]>([]);
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Customization
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("attending");
  const [badgeFormat, setBadgeFormat] = useState<"avery_8" | "lanyard" | "thermal">("avery_8");
  const [showQr, setShowQr] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const [showTierPill, setShowTierPill] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [resEvent, resGuests, resTiers] = await Promise.all([
          fetch(`/api/events/${eventId}`),
          fetch(`/api/events/${eventId}/guests`),
          fetch(`/api/events/${eventId}/tiers`),
        ]);

        if (resEvent.ok) {
          const data = await resEvent.json();
          setEvent(data.event);
        }

        if (resGuests.ok) {
          const gData = await resGuests.json();
          setGuests(gData.guests || []);
        }

        if (resTiers.ok) {
          const tData = await resTiers.json();
          setTiers(tData.tiers || []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [eventId]);

  const filteredGuests = guests.filter((g) => {
    if (statusFilter === "attending" && g.status !== "attending") return false;
    if (statusFilter === "checked_in" && !g.isCheckedIn) return false;
    if (tierFilter !== "all" && g.tier_id !== tierFilter && g.tier_name !== tierFilter) return false;
    return true;
  });

  const getTierColor = (tierName?: string | null) => {
    const t = (tierName || "").toLowerCase();
    if (t.includes("vip")) return { bg: "bg-purple-100", text: "text-purple-800", border: "border-purple-300" };
    if (t.includes("speaker")) return { bg: "bg-emerald-100", text: "text-emerald-800", border: "border-emerald-300" };
    return { bg: "bg-sky-100", text: "text-sky-800", border: "border-sky-300" };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <p className="text-xs text-slate-500 font-medium">Preparing Name Badge Studio...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-md shadow-xs">
          <p className="font-semibold text-slate-800">Event Not Found</p>
          <Link
            href="/events"
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      {/* Control Toolbar — Hidden during Print */}
      <div className="print:hidden bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/events/${eventId}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Event</span>
            </Link>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-600" />
              <h1 className="text-sm font-bold text-slate-900">Name Badge Print Studio</h1>
              <span className="rounded-full bg-slate-100 text-slate-700 px-2 py-0.5 text-xs font-semibold">
                {filteredGuests.length} Badges Ready
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Format Selector */}
            <select
              value={badgeFormat}
              onChange={(e) => setBadgeFormat(e.target.value as any)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-sky-500 shadow-2xs"
            >
              <option value="avery_8">Avery Sheet (8 Badges / Page)</option>
              <option value="lanyard">Conference Lanyard (3" x 4")</option>
              <option value="thermal">Thermal Clip Badge (2.25" x 3.5")</option>
            </select>

            {/* Filter */}
            <select
              value={tierFilter}
              onChange={(e) => setTierFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 focus:outline-none focus:border-sky-500 shadow-2xs"
            >
              <option value="all">All Ticket Tiers</option>
              {tiers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {/* Toggle checkboxes */}
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showQr}
                onChange={(e) => setShowQr(e.target.checked)}
                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span>QR Code</span>
            </label>

            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              <Printer className="h-4 w-4" />
              <span>Print Badges Now</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print Sheet Canvas */}
      <main className="max-w-6xl mx-auto px-4 py-8 print:p-0 print:m-0 print:max-w-none">
        {filteredGuests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
            <Users className="h-8 w-8 mx-auto text-slate-400 mb-2" />
            <p className="font-semibold text-slate-700">No attendees match your filter.</p>
            <p className="text-xs text-slate-500 mt-1">Try switching to "All Ticket Tiers".</p>
          </div>
        ) : (
          <div
            className={`grid gap-4 print:gap-3 ${
              badgeFormat === "avery_8"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 print:grid-cols-2"
                : badgeFormat === "lanyard"
                ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 print:grid-cols-3"
                : "grid-cols-1 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-4"
            }`}
          >
            {filteredGuests.map((guest, idx) => {
              const tierColor = getTierColor(guest.tier_name);
              const qrPayload = `RSVP:${eventId}:${guest.ticket_code || guest.qr_token}`;
              const qrUrl = `/api/qr?text=${encodeURIComponent(qrPayload)}&logo=ticket`;

              return (
                <div
                  key={guest.id || idx}
                  className="bg-white border-2 border-slate-300 print:border-slate-400 rounded-2xl p-5 shadow-xs flex flex-col justify-between relative overflow-hidden break-inside-avoid print:shadow-none min-h-[220px]"
                >
                  {/* Top Branding Bar */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="truncate">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-widest">
                        Official Pass
                      </span>
                      <h2 className="text-xs font-bold text-slate-800 truncate">{event.title}</h2>
                    </div>

                    {showTierPill && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border shrink-0 ${tierColor.bg} ${tierColor.text} ${tierColor.border}`}
                      >
                        {guest.tier_name || "General"}
                      </span>
                    )}
                  </div>

                  {/* Center Attendee Identity */}
                  <div className="py-4 my-auto">
                    <h3 className="text-xl font-extrabold text-slate-900 tracking-tight leading-tight">
                      {guest.first_name} {guest.last_name}
                    </h3>
                    {showCompany && guest.notes && (
                      <p className="text-xs font-medium text-slate-500 mt-1 line-clamp-1">
                        {guest.notes}
                      </p>
                    )}
                  </div>

                  {/* Bottom Footer with QR and Ticket Code */}
                  <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-100">
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                        Scan at Gate
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-800 tracking-wider">
                        {guest.ticket_code || guest.qr_token}
                      </span>
                    </div>

                    {showQr && (
                      <BadgeQr payload={qrPayload} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Embedded Badge QR Code with Instant Fallback */}
      <style jsx global>{`
        @media print {
          body {
            background-color: white !important;
            color: black !important;
          }
          @page {
            margin: 0.4in;
            size: auto;
          }
          .break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
}

function BadgeQr({ payload }: { payload: string }) {
  const [src, setSrc] = useState<string>(
    `/api/qr?format=svg&text=${encodeURIComponent(payload)}&logo=ticket`
  );
  const [hasFallback, setHasFallback] = useState(false);

  const handleError = async () => {
    if (!hasFallback) {
      setHasFallback(true);
      try {
        const QRCode = (await import("qrcode")).default;
        const fallbackUrl = await QRCode.toDataURL(payload, {
          errorCorrectionLevel: "M",
          margin: 1,
          width: 140,
          color: { dark: "#0f172a", light: "#ffffff" },
        });
        setSrc(fallbackUrl);
      } catch (err) {
        console.error("Client QR generation fallback failed:", err);
      }
    }
  };

  return (
    <div className="rounded-lg bg-white border border-slate-200 p-1 shrink-0 flex items-center justify-center shadow-xs">
      <img
        src={src}
        alt="Badge QR"
        width={56}
        height={56}
        className="w-14 h-14 object-contain rounded"
        onError={handleError}
        loading="eager"
      />
    </div>
  );
}

