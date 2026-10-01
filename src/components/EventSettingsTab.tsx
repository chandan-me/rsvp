"use client";

import { useState } from "react";
import { Save, Loader2, CheckCircle2, Lock, Calendar, MapPin, Image as ImageIcon, Copy, Check, RefreshCw } from "lucide-react";
import { Event, EventSettings } from "@/types/database";

interface EventSettingsTabProps {
  event: Event;
  settings: EventSettings;
  onRefresh: () => void;
}

export function EventSettingsTab({ event, settings, onRefresh }: EventSettingsTabProps) {
  // Event state
  const [title, setTitle] = useState(event.title);
  const [slug, setSlug] = useState(event.slug);
  const [description, setDescription] = useState(event.description || "");
  const [coverImageUrl, setCoverImageUrl] = useState(event.cover_image_url || "");
  const [startDate, setStartDate] = useState(event.start_date.slice(0, 16));
  const [locationName, setLocationName] = useState(event.location_name || "");
  const [locationAddress, setLocationAddress] = useState(event.location_address || "");
  const [maxCapacity, setMaxCapacity] = useState(event.max_capacity?.toString() || "");

  // Settings state
  const [isRsvpClosed, setIsRsvpClosed] = useState(settings.is_rsvp_closed);
  const [confirmationEmailEnabled, setConfirmationEmailEnabled] = useState(
    settings.confirmation_email_enabled
  );
  const [checkinPin, setCheckinPin] = useState(settings.checkin_pin || "GATE-4821");
  const [staffEmail, setStaffEmail] = useState(settings.staff_email || "admin@craftconf.io");
  const [copiedGateCreds, setCopiedGateCreds] = useState(false);

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
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
          className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
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
    </form>
  );
}
