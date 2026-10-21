"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  CheckCircle2,
  Lock,
  Calendar,
  MapPin,
  Image as ImageIcon,
  Copy,
  Check,
  RefreshCw,
  Trash2,
  AlertTriangle,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { Event, EventSettings } from "@/types/database";

interface EventSettingsTabProps {
  event: Event;
  settings: EventSettings;
  onRefresh: () => void;
}

export function EventSettingsTab({ event, settings, onRefresh }: EventSettingsTabProps) {
  const router = useRouter();

  // Event state
  const [title, setTitle] = useState(event.title);
  const [slug, setSlug] = useState(event.slug);
  const [description, setDescription] = useState(event.description || "");
  const [coverImageUrl, setCoverImageUrl] = useState(event.cover_image_url || "");
  const [startDate, setStartDate] = useState(event.start_date.slice(0, 16));
  const [locationName, setLocationName] = useState(event.location_name || "");
  const [locationAddress, setLocationAddress] = useState(event.location_address || "");
  const [maxCapacity, setMaxCapacity] = useState(event.max_capacity?.toString() || "");

  const [isRsvpClosed, setIsRsvpClosed] = useState(settings.is_rsvp_closed);
  const [confirmationEmailEnabled, setConfirmationEmailEnabled] = useState(
    settings.confirmation_email_enabled
  );
  const [requiresApproval, setRequiresApproval] = useState(settings.requires_approval ?? false);
  const [enableWaitlist, setEnableWaitlist] = useState(settings.enable_waitlist ?? true);
  const [ticketTiersEnabled, setTicketTiersEnabled] = useState(settings.ticket_tiers_enabled ?? true);
  const [checkinPin, setCheckinPin] = useState(settings.checkin_pin || "GATE-4821");
  const [staffEmail, setStaffEmail] = useState(settings.staff_email || "admin@craftconf.io");
  const [copiedGateCreds, setCopiedGateCreds] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Danger zone modal states
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  function generateRandomPin() {
    const prefixes = ["GATE", "PASS", "VIP", "SEC"];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(1000 + Math.random() * 9000);
    setCheckinPin(`${prefix}-${num}`);
  }

  function copyGateCredentials() {
    const text = `Event Check-In Station Credentials\nEvent: ${title}\nGatekeeper Email: ${staffEmail}\nGate Secret Password: ${checkinPin}\nDirect Link: ${window.location.origin}/events/${event.id}/checkin`;
    navigator.clipboard.writeText(text);
    setCopiedGateCreds(true);
    setTimeout(() => setCopiedGateCreds(false), 2500);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    try {
      // 1. Update event details
      const resEvent = await fetch(`/api/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          slug,
          description: description || null,
          cover_image_url: coverImageUrl || null,
          start_date: new Date(startDate).toISOString(),
          location_name: locationName || null,
          location_address: locationAddress || null,
          max_capacity: maxCapacity ? Number(maxCapacity) : null,
        }),
      });

      if (!resEvent.ok) {
        const d = await resEvent.json();
        throw new Error(d.error || "Failed to update event details");
      }

      // 2. Update settings
      const resSettings = await fetch(`/api/events/${event.id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          is_rsvp_closed: isRsvpClosed,
          confirmation_email_enabled: confirmationEmailEnabled,
          requires_approval: requiresApproval,
          enable_waitlist: enableWaitlist,
          ticket_tiers_enabled: ticketTiersEnabled,
          checkin_pin: checkinPin.trim() || null,
          staff_email: staffEmail.trim() || null,
        }),
      });

      if (!resSettings.ok) {
        const d = await resSettings.json();
        throw new Error(d.error || "Failed to update event settings");
      }

      setSuccess(true);
      onRefresh();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err?.message || "An unexpected error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleResetCheckins() {
    setIsResetting(true);
    setActionNotice(null);
    try {
      const res = await fetch(`/api/events/${event.id}/reset-checkins`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reset check-ins");
      setActionNotice(data.message || "All gate check-ins have been reset.");
      setShowResetModal(false);
      onRefresh();
    } catch (err: any) {
      setError(err?.message || "Failed to reset check-ins");
    } finally {
      setIsResetting(false);
    }
  }

  async function handleDeleteEvent() {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete event");
      window.location.replace("/events");
    } catch (err: any) {
      setError(err?.message || "Failed to delete event");
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
      {actionNotice && (
        <div className="rounded-xl bg-sky-50 border border-sky-200 p-3 text-xs text-sky-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-sky-600 shrink-0" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice(null)}
            className="text-sky-700 text-xs hover:underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {success && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <span>Event settings and details updated successfully!</span>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800">
          {error}
        </div>
      )}

      {/* Basic Event Details Card */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          Event Information & Branding
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Event Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Public URL Slug <span className="text-rose-500">*</span>
            </label>
            <div className="flex rounded-xl border border-slate-200 overflow-hidden focus-within:border-sky-500 focus-within:ring-1 focus-within:ring-sky-500">
              <span className="bg-slate-50 px-2.5 py-2 text-xs text-slate-500 select-none border-r border-slate-200">
                /e/
              </span>
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Description & Program Summary
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Cover Banner Image URL
          </label>
          <input
            type="url"
            value={coverImageUrl}
            onChange={(e) => setCoverImageUrl(e.target.value)}
            placeholder="https://images.unsplash.com/photo-..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Date & Start Time
            </label>
            <input
              type="datetime-local"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Venue / Location Name
            </label>
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              placeholder="e.g. City Hall Ballroom"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Maximum Attendee Capacity
            </label>
            <input
              type="number"
              min="1"
              value={maxCapacity}
              onChange={(e) => setMaxCapacity(e.target.value)}
              placeholder="e.g. 150"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 mb-1">
            Physical Address
          </label>
          <input
            type="text"
            value={locationAddress}
            onChange={(e) => setLocationAddress(e.target.value)}
            placeholder="123 Market St, San Francisco, CA"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
          />
        </div>
      </div>

      {/* RSVP Policy & Security Controls */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-4">
        <h3 className="text-base font-semibold text-slate-900 border-b border-slate-100 pb-3">
          RSVP Policy & Check-In Security
        </h3>

        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={isRsvpClosed}
              onChange={(e) => setIsRsvpClosed(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
            />
            <div>
              <span className="text-sm font-medium text-slate-800">Close RSVP Submissions</span>
              <p className="text-xs text-slate-500">
                Immediately freeze public RSVP submissions. Visitors will be notified that registration has closed.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={confirmationEmailEnabled}
              onChange={(e) => setConfirmationEmailEnabled(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
            />
            <div>
              <span className="text-sm font-medium text-slate-800">
                Send Automated Confirmation & QR Ticket
              </span>
              <p className="text-xs text-slate-500">
                Guests receive their digital pass and QR code immediately upon submitting their RSVP.
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={requiresApproval}
              onChange={(e) => setRequiresApproval(e.target.checked)}
              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 h-4 w-4"
            />
            <div>
              <span className="text-sm font-medium text-slate-800 flex items-center gap-1.5">
                <span>Require Host Approval (Luma-Style Screening Gate)</span>
                <span className="rounded bg-amber-100 text-amber-800 px-1.5 py-0.2 text-[10px] font-bold">
                  Curated
                </span>
              </span>
              <p className="text-xs text-slate-500">
                Applicants submit their answers to a review queue. Entrance passes and QR codes are only dispatched once you click "Approve".
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={enableWaitlist}
              onChange={(e) => setEnableWaitlist(e.target.checked)}
              className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 h-4 w-4"
            />
            <div>
              <span className="text-sm font-medium text-slate-800">
                Automated Waitlist &amp; Auto-Promotion
              </span>
              <p className="text-xs text-slate-500">
                When maximum capacity is reached, new RSVPs join the waitlist queue. If a confirmed attendee cancels, the next waitlisted applicant is automatically admitted!
              </p>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer pt-2">
            <input
              type="checkbox"
              checked={ticketTiersEnabled}
              onChange={(e) => setTicketTiersEnabled(e.target.checked)}
              className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-4 w-4"
            />
            <div>
              <span className="text-sm font-medium text-slate-800">
                Multi-Tier Ticketing &amp; Admission Classes
              </span>
              <p className="text-xs text-slate-500">
                Allow attendees to select admission tiers (e.g., General Admission, VIP All-Access, Speaker) with distinct badges.
              </p>
            </div>
          </label>
        </div>

        {/* Gate Security & Passcode Configuration */}
        <div className="pt-4 border-t border-slate-100 space-y-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Lock className="h-4 w-4 text-sky-600" />
              <span>Gate Station Authorization & Secret Token</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Anyone opening the check-in station must enter this authorized email and secret gate passcode to unlock access.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Authorized Staff / Host Email
              </label>
              <input
                type="email"
                value={staffEmail}
                onChange={(e) => setStaffEmail(e.target.value)}
                placeholder="staff@craftconf.io"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Gate operators must enter this email to verify access.
              </p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Secret Gate Password / Token
                </label>
                <button
                  type="button"
                  onClick={generateRandomPin}
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-800 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RefreshCw className="h-3 w-3" />
                  <span>Generate Random</span>
                </button>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={checkinPin}
                  onChange={(e) => setCheckinPin(e.target.value)}
                  placeholder="e.g. GATE-7492"
                  className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 font-mono font-bold tracking-wider"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                You can change this password anytime or generate a random one.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={copyGateCredentials}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer shadow-2xs"
            >
              {copiedGateCreds ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="text-emerald-700 font-bold">Credentials Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-slate-500" />
                  <span>Copy Gate Credentials for Staff</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-50 cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Saving Changes...</span>
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              <span>Save Event Settings</span>
            </>
          )}
        </button>
      </div>

      {/* Danger Zone: Event Reset & Deletion */}
      <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-6 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-rose-800">
          <ShieldAlert className="h-5 w-5 text-rose-600" />
          <h3 className="text-sm font-bold uppercase tracking-wider">Danger Zone</h3>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          Caution: These actions modify live event operations. Resetting check-ins will zero out attendance counters for testing or fresh gate sessions. Deleting an event is irreversible and deletes all associated tickets and rosters.
        </p>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowResetModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 px-4 py-2 text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <RotateCcw className="h-4 w-4 text-amber-700" />
            <span>Reset All Check-In Counters</span>
          </button>

          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-300 bg-rose-600 hover:bg-rose-500 text-white px-4 py-2 text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Trash2 className="h-4 w-4" />
            <span>Permanently Delete Event</span>
          </button>
        </div>
      </div>

      {/* Reset Check-ins Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto">
              <RotateCcw className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Reset All Gate Check-Ins?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                This will reset the verified check-in state for all attendees of <strong>{event.title}</strong> back to 0. Attendees will need to scan in again.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResetCheckins}
                disabled={isResetting}
                className="rounded-xl bg-amber-600 hover:bg-amber-500 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isResetting ? "Resetting..." : "Confirm Reset"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Event Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Delete Event Permanently?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <strong>{event.title}</strong>? All registered guest records, ticket codes, and gate credentials will be permanently erased.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteEvent}
                disabled={isDeleting}
                className="rounded-xl bg-rose-600 hover:bg-rose-500 py-2 text-xs font-semibold text-white shadow-xs cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Permanently Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
