"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock3,
  Download,
  Share2,
  ArrowLeft,
  Loader2,
  AlertCircle,
  HelpCircle,
  Ticket as TicketIcon,
  User,
  Users,
  Building2,
  Mail,
  Phone,
  ShieldCheck,
  Edit3,
  Save,
  QrCode,
  Sparkles,
} from "lucide-react";
import { Event, Guest, Ticket, RsvpAnswer, RsvpQuestion } from "@/types/database";
import { formatDate, formatTime, createGoogleCalendarUrl, createIcsCalendarUrl } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string; token: string }>;
}

export default function GuestSelfServicePage({ params }: PageProps) {
  const { slug, token } = use(params);

  const [event, setEvent] = useState<Event | null>(null);
  const [guest, setGuest] = useState<Guest | null>(null);
  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [plusOnes, setPlusOnes] = useState<(Guest & { ticket?: Ticket })[]>([]);
  const [answers, setAnswers] = useState<RsvpAnswer[]>([]);
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editAnswers, setEditAnswers] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // QR Pass State
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrLogo, setQrLogo] = useState<"ticket" | "shield" | "brand" | "calendar" | "none">("ticket");

  async function loadData() {
    try {
      const resEvents = await fetch("/api/events");
      const { events } = await resEvents.json();
      const currentEvent = (events || []).find((e: Event) => e.slug === slug);

      if (!currentEvent) {
        setError("Event not found.");
        setLoading(false);
        return;
      }
      setEvent(currentEvent);

      // Load questions
      const resQ = await fetch(`/api/events/${currentEvent.id}/questions`);
      const qData = await resQ.json();
      setQuestions(qData.questions || []);

      // Load attendee details via self-service API
      const resManage = await fetch(`/api/events/${currentEvent.id}/rsvp-manage?token=${token}`);
      if (!resManage.ok) {
        const errJson = await resManage.json();
        setError(errJson.error || "Unable to locate attendee record.");
        setLoading(false);
        return;
      }

      const manageData = await resManage.json();
      setGuest(manageData.guest);
      setTicket(manageData.ticket || null);
      setPlusOnes(manageData.plusOnes || []);
      setAnswers(manageData.answers || []);

      // Initialize edit fields
      setEditFirstName(manageData.guest.first_name);
      setEditLastName(manageData.guest.last_name);
      setEditPhone(manageData.guest.phone || "");

      const ansMap: Record<string, any> = {};
      manageData.answers?.forEach((a: RsvpAnswer) => {
        ansMap[a.question_id] = a.answer_text || a.answer_json;
      });
      setEditAnswers(ansMap);
    } catch (err: any) {
      setError(err?.message || "Failed to load self-service portal.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [slug, token]);

  // Generate QR whenever ticket is ready or logo changed
  useEffect(() => {
    if (!event || !ticket) return;
    async function fetchQr() {
      try {
        const qrPayload = `RSVP:${event!.id}:${ticket!.ticket_code}`;
        const res = await fetch(`/api/qr?text=${encodeURIComponent(qrPayload)}&logo=${qrLogo}`);
        if (res.ok) {
          const json = await res.json();
          setQrDataUrl(json.dataUrl);
        }
      } catch (err) {
        console.error("Failed to load QR code:", err);
      }
    }
    fetchQr();
  }, [event, ticket, qrLogo]);

  async function handleSaveChanges(e: React.FormEvent) {
    e.preventDefault();
    if (!event || !guest) return;
    setSaving(true);
    setSaveSuccess(false);

    try {
      const formattedAnswers = Object.entries(editAnswers).map(([qid, val]) => ({
        question_id: qid,
        answer_text: typeof val === "string" ? val : null,
        answer_json: typeof val !== "string" ? val : null,
      }));

      const res = await fetch(`/api/events/${event.id}/rsvp-manage?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          first_name: editFirstName,
          last_name: editLastName,
          phone: editPhone || null,
          answers: formattedAnswers,
        }),
      });

      if (!res.ok) throw new Error("Failed to save updates.");

      setSaveSuccess(true);
      setIsEditing(false);
      await loadData();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err?.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  }

  async function handleCancelAttendance() {
    if (
      !confirm(
        "Are you sure you can no longer attend? Your spot will be released, your ticket will be cancelled, and the next person on the waitlist will be admitted."
      )
    ) {
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`/api/events/${event!.id}/rsvp-manage?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "declined",
        }),
      });

      if (res.ok) {
        await loadData();
      } else {
        alert("Failed to update status.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleReattend() {
    try {
      setSaving(true);
      const res = await fetch(`/api/events/${event!.id}/rsvp-manage?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "attending",
        }),
      });

      if (res.ok) {
        await loadData();
      } else {
        alert("Unable to update RSVP.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-xs text-slate-400 font-medium">Accessing Attendee Portal...</p>
        </div>
      </div>
    );
  }

  if (error || !event || !guest) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-800 bg-slate-950 p-8 text-center max-w-md shadow-2xl text-white">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-3" />
          <h1 className="text-lg font-bold">Pass Not Found</h1>
          <p className="text-xs text-slate-400 mt-1">{error || "Invalid self-service ticket link."}</p>
          <Link
            href={`/e/${slug}`}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go to Event Page</span>
          </Link>
        </div>
      </div>
    );
  }

  const isAttending = guest.status === "attending";
  const isPendingApproval = guest.status === "pending_approval";
  const isWaitlisted = guest.status === "waitlisted";
  const isDeclined = guest.status === "declined";

  const googleCalUrl = createGoogleCalendarUrl({
    title: event.title,
    description: event.description || "",
    location: event.location_name || event.location_address || "",
    startDate: event.start_date,
    endDate: event.end_date,
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between">
          <Link
            href={`/e/${event.slug}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>{event.title}</span>
          </Link>
          <span className="text-xs font-mono text-sky-400 bg-sky-950/80 px-2.5 py-1 rounded-full border border-sky-800/50">
            Guest Self-Service
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        {saveSuccess && (
          <div className="rounded-2xl bg-emerald-950 border border-emerald-800/80 p-4 text-xs text-emerald-200 flex items-center gap-2 shadow-lg">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>Your preferences and registration details have been updated successfully!</span>
          </div>
        )}

        {/* Status Card Hero */}
        <div className="rounded-3xl border border-slate-800/90 bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 p-6 sm:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
            <div>
              <div className="flex items-center gap-2.5 flex-wrap mb-2">
                <span className="text-xs uppercase tracking-widest font-bold text-slate-400">
                  Attendee Pass
                </span>
                {guest.tier_name && (
                  <span className="rounded-full bg-sky-950 text-sky-300 border border-sky-800/60 px-2.5 py-0.5 text-[11px] font-semibold">
                    {guest.tier_name}
                  </span>
                )}
                {isAttending && (
                  <span className="rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-3 py-0.5 text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    Confirmed Attending
                  </span>
                )}
                {isPendingApproval && (
                  <span className="rounded-full bg-amber-950 text-amber-300 border border-amber-800/60 px-3 py-0.5 text-xs font-semibold flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5 text-amber-400" />
                    Pending Host Review
                  </span>
                )}
                {isWaitlisted && (
                  <span className="rounded-full bg-violet-950 text-violet-300 border border-violet-800/60 px-3 py-0.5 text-xs font-semibold flex items-center gap-1">
                    <Clock3 className="h-3.5 w-3.5 text-violet-400" />
                    Priority Waitlist
                  </span>
                )}
                {isDeclined && (
                  <span className="rounded-full bg-rose-950 text-rose-300 border border-rose-800/60 px-3 py-0.5 text-xs font-semibold flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-rose-400" />
                    Declined
                  </span>
                )}
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                {guest.first_name} {guest.last_name}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1">{guest.email}</p>

              <div className="flex items-center gap-4 text-xs text-slate-400 mt-4 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-sky-400" />
                  {formatDate(event.start_date, event.timezone)}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-sky-400" />
                  {formatTime(event.start_date, event.timezone)}
                </span>
                {event.location_name && (
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-sky-400" />
                    {event.location_name}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row md:flex-col gap-2 shrink-0">
              <a
                href={googleCalUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-4 py-2.5 text-xs font-semibold text-white transition-all shadow-md"
              >
                <Calendar className="h-4 w-4 text-sky-400" />
                <span>Add to Google Calendar</span>
              </a>

              <a
                href={createIcsCalendarUrl({
                  title: event.title,
                  description: event.description || "",
                  location: event.location_name || event.location_address || "",
                  startDate: event.start_date,
                  endDate: event.end_date,
                })}
                download={`${event.slug}.ics`}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 transition-all"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export .ICS File</span>
              </a>
            </div>
          </div>
        </div>

        {/* Screening or Waitlist Explanation Notices */}
        {isPendingApproval && (
          <div className="rounded-2xl border border-amber-800/60 bg-amber-950/40 p-5 text-amber-200 text-xs sm:text-sm leading-relaxed space-y-2">
            <div className="font-semibold flex items-center gap-2 text-amber-300">
              <ShieldCheck className="h-4 w-4" />
              <span>Organizer Screening in Progress</span>
            </div>
            <p className="text-amber-200/90 text-xs">
              The event host has enabled screening for this event. Your answers and profile are currently under review.
              Once the host approves your registration, your entrance ticket with branded QR pass will be unlocked here and sent to your email.
            </p>
          </div>
        )}

        {isWaitlisted && (
          <div className="rounded-2xl border border-violet-800/60 bg-violet-950/40 p-5 text-violet-200 text-xs sm:text-sm leading-relaxed space-y-2">
            <div className="font-semibold flex items-center gap-2 text-violet-300">
              <Clock3 className="h-4 w-4" />
              <span>You are on the Priority Waitlist</span>
            </div>
            <p className="text-violet-200/90 text-xs">
              The event has currently reached its maximum capacity. If another attendee cancels or updates their RSVP,
              our auto-promotion engine will immediately admit you and issue your digital ticket pass.
            </p>
          </div>
        )}

        {/* Ticket Pass with Branded QR (If Confirmed) */}
        {isAttending && ticket && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <TicketIcon className="h-5 w-5 text-sky-400" />
                  <span>Digital Entrance Pass</span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Present this high-redundancy QR pass at any entrance gate station for instant verification.
                </p>
              </div>

              {/* Center Logo Selector */}
              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-xl">
                <span className="text-[10px] uppercase font-bold text-slate-400 px-2">Badge:</span>
                {[
                  { id: "ticket", label: "🎟️" },
                  { id: "shield", label: "🛡️" },
                  { id: "brand", label: "✨" },
                  { id: "calendar", label: "📅" },
                ].map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setQrLogo(b.id as any)}
                    className={`rounded-lg px-2 py-1 text-xs transition-colors ${
                      qrLogo === b.id
                        ? "bg-sky-600 text-white font-bold"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {b.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-8 py-2">
              {/* QR Code Container */}
              <div className="rounded-2xl bg-white p-4 shadow-xl border border-slate-200 inline-block text-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt="Ticket QR Code"
                    className="w-48 h-48 sm:w-56 sm:h-56 object-contain rounded-lg"
                  />
                ) : (
                  <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
                  </div>
                )}
                <div className="mt-3 font-mono font-bold text-slate-900 text-sm tracking-wider">
                  {ticket.ticket_code}
                </div>
                <div className="text-[10px] uppercase font-semibold text-slate-500 mt-0.5">
                  Level H Vector Code
                </div>
              </div>

              {/* Pass Metadata & Download Actions */}
              <div className="space-y-4 max-w-sm text-center sm:text-left">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block">
                    Access Level
                  </span>
                  <span className="text-sm font-bold text-white">
                    {guest.tier_name || "General Admission"}
                  </span>
                  {guest.plus_ones_count > 0 && (
                    <p className="text-xs text-sky-400 mt-0.5">
                      Valid for primary guest + {guest.plus_ones_count} plus-one{guest.plus_ones_count > 1 ? "s" : ""}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-2">
                  {qrDataUrl && (
                    <a
                      href={qrDataUrl}
                      download={`ticket-${ticket.ticket_code}.png`}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-3.5 py-2 text-xs font-semibold text-white shadow-md transition-colors"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download PNG Pass</span>
                    </a>
                  )}
                  <button
                    onClick={() => window.print()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 text-xs font-semibold text-slate-200 transition-colors"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span>Print Pass</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Plus-Ones Cards (If Attendee Has Individual Plus-Ones) */}
        {plusOnes.length > 0 && (
          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="h-5 w-5 text-indigo-400" />
              <span>Plus-One Guest Passes ({plusOnes.length})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Each of your registered plus-ones has a dedicated ticket and unique QR pass for gate check-in.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              {plusOnes.map((po) => (
                <div
                  key={po.id}
                  className="rounded-2xl border border-slate-800 bg-slate-950 p-4 flex items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="text-xs font-bold text-white block">
                      {po.first_name} {po.last_name}
                    </span>
                    <span className="text-[11px] text-slate-400 block">{po.email}</span>
                    <span className="text-[10px] font-mono font-semibold text-sky-400 bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/50 inline-block">
                      {po.ticket?.ticket_code || "TK-PLUSONE"}
                    </span>
                  </div>

                  <Link
                    href={`/e/${event.slug}/confirmation?ticket=${po.ticket?.ticket_code || po.qr_token}&status=attending`}
                    className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 border border-slate-700"
                  >
                    <QrCode className="h-3.5 w-3.5 text-sky-400" />
                    <span>View Pass</span>
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Edit Registration & Questionnaire Answers */}
        <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-sky-400" />
                <span>Registration Details &amp; Dietary Preferences</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Update your contact info or custom question responses anytime before the event.
              </p>
            </div>

            {!isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-1.5 text-xs font-semibold text-white transition-colors"
              >
                <Edit3 className="h-3.5 w-3.5" />
                <span>Edit Details</span>
              </button>
            )}
          </div>

          {isEditing ? (
            <form onSubmit={handleSaveChanges} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    First Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                    Last Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                  Phone Number
                </label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              {/* Custom Questions */}
              {questions.length > 0 && (
                <div className="space-y-4 pt-2 border-t border-slate-800">
                  <h3 className="text-xs font-bold uppercase text-slate-400">Event Questions</h3>
                  {questions.map((q) => (
                    <div key={q.id} className="space-y-1.5">
                      <label className="block text-xs font-medium text-slate-200">
                        {q.prompt}
                      </label>
                      {q.options && q.options.length > 0 ? (
                        <select
                          value={editAnswers[q.id] || ""}
                          onChange={(e) =>
                            setEditAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                        >
                          <option value="">Select option...</option>
                          {q.options.map((opt) => (
                            <option key={opt.id} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input
                          type="text"
                          value={editAnswers[q.id] || ""}
                          onChange={(e) =>
                            setEditAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                          }
                          placeholder="Your answer..."
                          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2 text-sm text-white focus:outline-none focus:border-sky-500"
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 px-4 py-2 text-xs font-semibold text-white shadow-md transition-colors disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                  <span>Save Changes</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="rounded-xl bg-slate-800 hover:bg-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="rounded-2xl bg-slate-950 border border-slate-800/80 p-4 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Full Name</span>
                <span className="text-sm font-semibold text-white">
                  {guest.first_name} {guest.last_name}
                </span>
              </div>
              <div className="rounded-2xl bg-slate-950 border border-slate-800/80 p-4 space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Phone</span>
                <span className="text-sm font-semibold text-white">{guest.phone || "Not provided"}</span>
              </div>

              {/* Answers preview */}
              {questions.map((q) => {
                const ans = answers.find((a) => a.question_id === q.id);
                return (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-slate-950 border border-slate-800/80 p-4 space-y-1 sm:col-span-2"
                  >
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      {q.prompt}
                    </span>
                    <span className="text-xs font-semibold text-slate-200">
                      {ans?.answer_text || (Array.isArray(ans?.answer_json) ? ans.answer_json.join(", ") : "—")}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Change Attendance / Cancellation Card */}
        <div className="rounded-3xl border border-rose-900/40 bg-rose-950/20 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-rose-300">Manage Attendance</h3>
            <p className="text-xs text-rose-200/80 mt-0.5">
              {isAttending
                ? "Can no longer attend? Cancel your reservation to release your ticket to the waitlist."
                : "Decided to join? Update your status to reserve an open spot."}
            </p>
          </div>

          <div>
            {isAttending ? (
              <button
                type="button"
                onClick={handleCancelAttendance}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-900/80 hover:bg-rose-800 border border-rose-700/60 px-4 py-2 text-xs font-semibold text-rose-100 transition-colors shadow-sm disabled:opacity-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                <span>Can No Longer Attend</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleReattend}
                disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors shadow-sm disabled:opacity-50"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Re-Confirm Attendance</span>
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
