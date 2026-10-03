"use client";

import { useState } from "react";
import { Mail, Send, CheckCircle2, AlertCircle, Users, Loader2, Sparkles } from "lucide-react";

interface BroadcastTabProps {
  eventId: string;
  totalGuests: number;
}

export function BroadcastTab({ eventId, totalGuests }: BroadcastTabProps) {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [segment, setSegment] = useState<
    "all" | "attending" | "not_checked_in" | "checked_in" | "waitlist" | "pending_approval"
  >("attending");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; count?: number } | null>(null);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;

    setSending(true);
    setResult(null);

    try {
      const res = await fetch(`/api/events/${eventId}/broadcast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          segment,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setResult({
          success: true,
          message: `Broadcast successfully dispatched to ${data.recipientCount} recipient(s)!`,
          count: data.recipientCount,
        });
        setSubject("");
        setMessage("");
      } else {
        setResult({
          success: false,
          message: data.error || "Failed to send email broadcast. Please verify recipient list.",
        });
      }
    } catch {
      setResult({
        success: false,
        message: "Network error sending announcement broadcast.",
      });
    } finally {
      setSending(false);
    }
  }

  const segmentDescriptions: Record<string, string> = {
    attending: "Confirmed guests only (will exclude declined or unapproved attendees)",
    all: "All registrants on the roster regardless of status",
    not_checked_in: "Confirmed guests who haven't arrived yet (ideal for day-of reminders)",
    checked_in: "Attendees already validated at the gates (ideal for post-event surveys)",
    waitlist: "Guests currently on the waitlist queue",
    pending_approval: "Guests awaiting organizer screening",
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Email Broadcast & Announcements</h2>
              <p className="text-xs text-slate-500">
                Dispatch branded emails and important logistics updates directly to specific attendee segments.
              </p>
            </div>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" />
            <span>Roster: {totalGuests} guests</span>
          </span>
        </div>

        {result && (
          <div
            className={`p-4 rounded-xl text-xs font-medium mb-6 flex items-start gap-2.5 ${
              result.success
                ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                : "bg-rose-50 border border-rose-200 text-rose-800"
            }`}
          >
            {result.success ? (
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            )}
            <div>{result.message}</div>
          </div>
        )}

        <form onSubmit={handleSend} className="space-y-5">
          {/* Target Audience Selector */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Target Audience Segment
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: "attending", label: "Confirmed Attending" },
                { id: "not_checked_in", label: "Not Yet Checked In" },
                { id: "checked_in", label: "Already Checked In" },
                { id: "waitlist", label: "Waitlisted Queue" },
                { id: "pending_approval", label: "Pending Approval" },
                { id: "all", label: "All Registrants" },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSegment(s.id as any)}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border text-left transition-all ${
                    segment === s.id
                      ? "border-sky-600 bg-sky-50 text-sky-900 shadow-2xs"
                      : "border-slate-200 hover:border-slate-300 text-slate-700 bg-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              {segmentDescriptions[segment]}
            </p>
          </div>

          {/* Email Subject */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Announcement Subject
            </label>
            <input
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g., Important Parking & Venue Entry Updates"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          {/* Email Message Content */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Message Body
            </label>
            <textarea
              required
              rows={6}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter your message to attendees. Line breaks will be preserved in the formatted announcement email."
              className="w-full rounded-xl border border-slate-200 bg-white p-3.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Sparkles className="h-3.5 w-3.5 text-sky-500" />
              <span>Delivered via Resend REST API with automatic styling</span>
            </div>

            <button
              type="submit"
              disabled={sending || !subject.trim() || !message.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-sky-500 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Dispatching Emails...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Send Broadcast Now</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
