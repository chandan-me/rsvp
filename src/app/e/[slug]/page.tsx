"use client";

import { useEffect, useState, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Calendar,
  Clock,
  MapPin,
  Check,
  X,
  Users,
  Sparkles,
  ArrowRight,
  Loader2,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { Event, EventSettings, RsvpQuestion } from "@/types/database";
import { formatDate, formatTime } from "@/lib/utils";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function PublicRsvpPage({ params }: PageProps) {
  const { slug } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");

  const [event, setEvent] = useState<Event | null>(null);
  const [settings, setSettings] = useState<EventSettings | null>(null);
  const [questions, setQuestions] = useState<RsvpQuestion[]>([]);
  const [loading, setLoading] = useState(true);

  // Form State
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"attending" | "declined">("attending");
  const [plusOnesCount, setPlusOnesCount] = useState(0);
  const [notes, setNotes] = useState("");
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEventDetails() {
      try {
        const res = await fetch("/api/events");
        const data = await res.json();
        const found = (data.events || []).find((e: Event) => e.slug === slug);

        if (!found) {
          setLoading(false);
          return;
        }

        setEvent(found);

        // Fetch settings & questions for this event
        const resDetail = await fetch(`/api/events/${found.id}`);
        const detailData = await resDetail.json();
        setSettings(detailData.settings);

        const resQ = await fetch(`/api/events/${found.id}/questions`);
        const qData = await resQ.json();
        setQuestions(qData.questions || []);

        // Pre-fill if token was provided in URL
        if (tokenParam) {
          const resGuests = await fetch(`/api/events/${found.id}/guests`);
          const gData = await resGuests.json();
          const matchedGuest = (gData.guests || []).find(
            (g: any) => g.qr_token === tokenParam
          );
          if (matchedGuest) {
            setFirstName(matchedGuest.first_name);
            setLastName(matchedGuest.last_name);
            setEmail(matchedGuest.email);
            if (matchedGuest.phone) setPhone(matchedGuest.phone);
            if (matchedGuest.status === "declined") setStatus("declined");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchEventDetails();
  }, [slug, tokenParam]);

  function handleAnswerChange(questionId: string, val: any) {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: val,
    }));
  }

  function handleMultipleChoiceToggle(questionId: string, optionValue: string) {
    setAnswers((prev) => {
      const currentList: string[] = Array.isArray(prev[questionId]) ? prev[questionId] : [];
      if (currentList.includes(optionValue)) {
        return {
          ...prev,
          [questionId]: currentList.filter((item) => item !== optionValue),
        };
      } else {
        return {
          ...prev,
          [questionId]: [...currentList, optionValue],
        };
      }
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!event) return;
    setSubmitting(true);
    setError(null);

    try {
      // Format answers payload
      const formattedAnswers = questions.map((q) => {
        const val = answers[q.id];
        if (Array.isArray(val) || typeof val === "boolean") {
          return {
            question_id: q.id,
            answer_text: Array.isArray(val) ? val.join(", ") : val ? "Yes" : "No",
            answer_json: val,
          };
        }
        return {
          question_id: q.id,
          answer_text: val ? String(val) : null,
          answer_json: null,
        };
      });

      const res = await fetch("/api/rsvp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: event.id,
          first_name: firstName.trim(),
          last_name: lastName.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || null,
          status,
          plus_ones_count: status === "attending" ? Number(plusOnesCount) : 0,
          notes: notes.trim() || null,
          answers: formattedAnswers,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit RSVP response");
      }

      // Successful submission -> redirect to confirmation page
      const ticketCode = data.ticket?.ticket_code || data.guest?.qr_token;
      router.push(`/e/${slug}/confirmation?ticket=${ticketCode}&status=${status}`);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred while saving your RSVP.");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
          <p className="text-xs text-slate-500 font-medium">Loading invitation...</p>
        </div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center max-w-md shadow-xs">
          <AlertCircle className="mx-auto h-10 w-10 text-rose-500 mb-3" />
          <h1 className="text-lg font-bold text-slate-900">Event Not Found</h1>
          <p className="text-xs text-slate-500 mt-1">
            This invitation link is invalid or has expired. Please check with your host.
          </p>
        </div>
      </div>
    );
  }

  const isRsvpClosed = settings?.is_rsvp_closed;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-between">
      {/* Event Cover Photo Hero */}
      <div className="relative w-full max-w-3xl mx-auto mt-0 sm:mt-8 overflow-hidden sm:rounded-3xl shadow-xl border border-slate-200/80 bg-white">
        {/* Banner Image */}
        <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-900">
          {event.cover_image_url ? (
            <img
              src={event.cover_image_url}
              alt={event.title}
              className="h-full w-full object-cover brightness-[0.85]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-tr from-slate-950 via-slate-900 to-sky-950 flex items-center justify-center">
              <Calendar className="h-16 w-16 text-white/30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-900/30 to-transparent" />

          {/* Overlay Event Title & Date */}
          <div className="absolute bottom-6 left-6 right-6 text-white">
            <span className="inline-block rounded-full bg-sky-500/90 backdrop-blur-xs px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-xs mb-2">
              Official Invitation
            </span>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight drop-shadow-xs">
              {event.title}
            </h1>
          </div>
        </div>

        {/* Event Schedule & Location Bar */}
        <div className="border-b border-slate-100 bg-slate-50/80 px-6 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-700">
          <div className="flex items-start gap-2.5">
            <Calendar className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
            <div>
              <span className="font-semibold block text-slate-900">
                {formatDate(event.start_date, event.timezone)}
              </span>
              <span className="text-slate-500">
                Starts at {formatTime(event.start_date, event.timezone)}
                {event.end_date && ` • Concludes ${formatTime(event.end_date, event.timezone)}`}
              </span>
            </div>
          </div>

          {event.location_name && (
            <div className="flex items-start gap-2.5">
              <MapPin className="h-4 w-4 text-sky-600 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold block text-slate-900">{event.location_name}</span>
                {event.location_address && (
                  <span className="text-slate-500">{event.location_address}</span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Event Description */}
        {event.description && (
          <div className="px-6 py-5 text-sm text-slate-600 leading-relaxed border-b border-slate-100 bg-white">
            <p>{event.description}</p>
          </div>
        )}

        {/* RSVP Closed Warning */}
        {isRsvpClosed ? (
          <div className="p-8 text-center bg-slate-50">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 mb-3">
              <Clock className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">RSVP Has Closed</h2>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Online response submissions for this event are currently closed. Please contact the event organizer directly for any inquiries.
            </p>
          </div>
        ) : (
          /* RSVP Interactive Form */
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6 bg-white">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Your RSVP Response</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Please let us know if you will be attending.
              </p>
            </div>

            {error && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800">
                {error}
              </div>
            )}

            {/* Attendance Choice Buttons */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Will you be attending? <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus("attending")}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all text-center ${
                    status === "attending"
                      ? "border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs scale-[1.01]"
                      : "border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl mb-2 ${
                      status === "attending"
                        ? "bg-emerald-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <Check className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">Attending</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">I will be there!</span>
                </button>

                <button
                  type="button"
                  onClick={() => setStatus("declined")}
                  className={`flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition-all text-center ${
                    status === "declined"
                      ? "border-rose-600 bg-rose-50/70 text-rose-950 font-bold shadow-xs scale-[1.01]"
                      : "border-slate-200 hover:border-slate-300 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 items-center justify-center rounded-xl mb-2 ${
                      status === "declined"
                        ? "bg-rose-600 text-white"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    <X className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold">Decline</span>
                  <span className="text-[11px] text-slate-500 mt-0.5">Unable to attend</span>
                </button>
              </div>
            </div>

            {/* Guest Details */}
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Doe"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane.doe@example.com"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Mobile Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>

              {/* Plus-Ones Selector (Only if attending) */}
              {status === "attending" && (
                <div className="rounded-xl border border-slate-200 p-4 bg-slate-50/50">
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Will you be bringing any additional guests? (+1s)
                  </label>
                  <div className="flex items-center gap-2 mt-2">
                    {[0, 1, 2, 3].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setPlusOnesCount(num)}
                        className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                          plusOnesCount === num
                            ? "bg-slate-900 text-white shadow-2xs"
                            : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {num === 0 ? "Just Me (1)" : `+${num} Guest${num > 1 ? "s" : ""}`}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Custom RSVP Questions (Only if attending) */}
            {status === "attending" && questions.length > 0 && (
              <div className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-sm font-bold text-slate-900">Event Preferences & Details</h3>

                {questions.map((q) => (
                  <div key={q.id} className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-700">
                      {q.prompt} {q.is_required && <span className="text-rose-500">*</span>}
                    </label>

                    {/* Single Choice (Radio) */}
                    {q.question_type === "single_choice" && q.options && (
                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt) => (
                          <label
                            key={opt.id}
                            className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs text-slate-800"
                          >
                            <input
                              type="radio"
                              name={q.id}
                              required={q.is_required}
                              value={opt.value}
                              checked={answers[q.id] === opt.value}
                              onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                              className="text-sky-600 focus:ring-sky-500 h-4 w-4"
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {/* Multiple Choice (Checkboxes) */}
                    {q.question_type === "multiple_choice" && q.options && (
                      <div className="space-y-1.5 pt-1">
                        {q.options.map((opt) => {
                          const checked = (answers[q.id] || []).includes(opt.value);
                          return (
                            <label
                              key={opt.id}
                              className="flex items-center gap-2.5 p-2 rounded-lg border border-slate-200 hover:bg-slate-50 cursor-pointer text-xs text-slate-800"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleMultipleChoiceToggle(q.id, opt.value)}
                                className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                              />
                              <span>{opt.label}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* Short Text */}
                    {q.question_type === "text" && (
                      <input
                        type="text"
                        required={q.is_required}
                        value={answers[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Your answer..."
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    )}

                    {/* Textarea */}
                    {q.question_type === "textarea" && (
                      <textarea
                        rows={2}
                        required={q.is_required}
                        value={answers[q.id] || ""}
                        onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                        placeholder="Your response..."
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      />
                    )}

                    {/* Boolean */}
                    {q.question_type === "boolean" && (
                      <label className="flex items-center gap-2 pt-1 cursor-pointer text-xs text-slate-700">
                        <input
                          type="checkbox"
                          checked={Boolean(answers[q.id])}
                          onChange={(e) => handleAnswerChange(q.id, e.target.checked)}
                          className="rounded text-sky-600 focus:ring-sky-500 h-4 w-4"
                        />
                        <span>Yes, I confirm</span>
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Notes to Organizer */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Note to the Host (Optional)
              </label>
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special accommodations or greetings..."
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-900 py-3.5 px-6 text-sm font-bold text-white shadow-md hover:bg-slate-800 transition-all active:scale-[0.99] disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Submitting Your Response...</span>
                  </>
                ) : (
                  <>
                    <span>Confirm RSVP</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      <footer className="py-6 text-center text-xs text-slate-400">
        Powered by RSVP Pro • Secure Event Operations
      </footer>
    </div>
  );
}
