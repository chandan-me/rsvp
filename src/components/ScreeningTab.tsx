"use client";

import { useState } from "react";
import {
  CheckSquare,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Search,
  Loader2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { Event, Guest } from "@/types/database";

interface ScreeningTabProps {
  eventId: string;
  event: Event;
  guests: Guest[];
  onRefresh: () => void;
}

export function ScreeningTab({ eventId, event, guests, onRefresh }: ScreeningTabProps) {
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const pendingGuests = guests.filter(
    (g) => g.status === "pending_approval" || g.status === "waitlisted"
  );

  const filtered = pendingGuests.filter(
    (g) =>
      g.first_name.toLowerCase().includes(search.toLowerCase()) ||
      g.last_name.toLowerCase().includes(search.toLowerCase()) ||
      g.email.toLowerCase().includes(search.toLowerCase())
  );

  async function handleApprove(guestId: string) {
    setProcessingId(guestId);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/${guestId}/approve`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to approve guest");
      }
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "Failed to approve guest");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDecline(guestId: string) {
    if (!confirm("Are you sure you want to decline this registration?")) return;
    setProcessingId(guestId);
    setError(null);
    try {
      const res = await fetch(`/api/events/${eventId}/guests/${guestId}/decline`, {
        method: "POST",
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to decline guest");
      }
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "Failed to decline guest");
    } finally {
      setProcessingId(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
              <CheckSquare className="h-5 w-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              Registration Screening & Approvals
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Review attendee questionnaire submissions. Approving automatically issues their digital pass & ticket code.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
            {pendingGuests.length} Pending Review
          </span>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search pending registrants..."
          className="w-full pl-9 pr-4 py-2 bg-white rounded-xl border border-slate-200 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
        />
      </div>

      {/* Roster Cards */}
      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">All Registrations Screened</h3>
          <p className="text-xs text-slate-500 mt-1">
            There are no pending applications or waitlisted guests requiring review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((guest) => {
            const isProcessing = processingId === guest.id;
            return (
              <div
                key={guest.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">
                        {guest.first_name} {guest.last_name}
                      </h4>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          guest.status === "waitlisted"
                            ? "bg-slate-100 text-slate-700"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {guest.status === "waitlisted" ? "Waitlist" : "Pending Approval"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{guest.email}</p>
                    {guest.phone && <p className="text-xs text-slate-400 mt-0.5">{guest.phone}</p>}
                  </div>

                  {guest.tier_name && (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-200 shrink-0">
                      {guest.tier_name}
                    </span>
                  )}
                </div>

                {guest.notes && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600">
                    <span className="font-semibold text-slate-700 block text-[10px] uppercase">
                      Applicant Note / Company
                    </span>
                    <p className="mt-0.5">{guest.notes}</p>
                  </div>
                )}

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-400">
                    Applied: {new Date(guest.created_at).toLocaleDateString()}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleDecline(guest.id)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      Decline
                    </button>
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => handleApprove(guest.id)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                    >
                      {isProcessing ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      <span>Approve & Issue Pass</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
