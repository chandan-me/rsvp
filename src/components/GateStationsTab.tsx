"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Plus,
  Trash2,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  QrCode,
  Users,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
  Smartphone,
  X,
  MapPin,
  Clock,
} from "lucide-react";
import { Event, EventSettings, GateCredential } from "@/types/database";

interface GateStationsTabProps {
  eventId: string;
  event: Event;
  settings: EventSettings;
}

export function GateStationsTab({ eventId, event, settings }: GateStationsTabProps) {
  const [credentials, setCredentials] = useState<(GateCredential & { checkinCount: number })[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCredId, setCopiedCredId] = useState<string | null>(null);

  // New Credential Form state
  const [isAdding, setIsAdding] = useState(false);
  const [userId, setUserId] = useState("");
  const [stationName, setStationName] = useState("Main Entrance Gate");
  const [passcode, setPasscode] = useState("");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});

  // QR Modal
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const gateAccessKey = settings.gate_access_key || `gk_${eventId.slice(0, 8)}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const gateCheckinUrl = `${origin}/checkin/${gateAccessKey}`;

  const PRESET_STATIONS = [
    "Main Entrance Gate",
    "VIP Lounge & Reception",
    "Conference Hall A",
    "Breakout Workshop Room",
    "Dinner & Banquet",
  ];

  async function loadCredentials() {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}/gate-credentials`);
      if (res.ok) {
        const data = await res.json();
        setCredentials(data.credentials || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCredentials();
  }, [eventId]);

  function handleRandomGenerate() {
    const letters = ["NORTH", "SOUTH", "EAST", "WEST", "VIP", "ALPHA", "BRAVO", "MAIN"];
    const randomTag = letters[Math.floor(Math.random() * letters.length)];
    const num = Math.floor(1 + Math.random() * 9);
    setUserId(`GATE-${randomTag}-${num}`);
    setPasscode(`GP-${Math.floor(100000 + Math.random() * 900000)}`);
  }

  async function handleCreateCredential(e: React.FormEvent) {
    e.preventDefault();
    if (!userId.trim() || !passcode.trim()) {
      setError("Please specify both a User ID and a Passcode/PIN.");
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/gate-credentials`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId.trim().toUpperCase(),
          station_name: stationName.trim(),
          passcode: passcode.trim(),
          notes: notes.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create gate credential");
      }

      setUserId("");
      setPasscode("");
      setNotes("");
      setIsAdding(false);
      loadCredentials();
    } catch (err: any) {
      setError(err?.message || "Failed to save gate credential");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCredential(credId: string) {
    if (!confirm("Are you sure you want to delete this gate staff login?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/gate-credentials/${credId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadCredentials();
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleToggleActive(credId: string, currentStatus: boolean) {
    try {
      const res = await fetch(`/api/events/${eventId}/gate-credentials/${credId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !currentStatus }),
      });
      if (res.ok) {
        loadCredentials();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function copyGateLink() {
    navigator.clipboard.writeText(gateCheckinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  }

  function copyStaffCredentials(cred: GateCredential) {
    const text = `🚪 Gate Staff Credentials - ${event.title}\nGate Station Link: ${gateCheckinUrl}\nStation Name: ${cred.station_name}\nGate User ID: ${cred.user_id}\nPasscode PIN: ${cred.passcode}`;
    navigator.clipboard.writeText(text);
    setCopiedCredId(cred.id);
    setTimeout(() => setCopiedCredId(null), 2500);
  }

  async function openQrModal() {
    setShowQrModal(true);
    try {
      const res = await fetch(`/api/qr?text=${encodeURIComponent(gateCheckinUrl)}&logo=shield`);
      const d = await res.json();
      if (d.success) setQrDataUrl(d.dataUrl);
    } catch (err) {
      console.error(err);
    }
  }

  const totalGateCheckins = credentials.reduce((sum, c) => sum + (c.checkinCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header Banner & Shareable Gate URL Box */}
      <div className="rounded-3xl border border-slate-200/80 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-6 text-white shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-3 py-1 text-xs font-bold text-emerald-300">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Multi-Staff Gate Station Access</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Gate Staff Authorization & Stations
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Create individual logins (User ID + Passcode) for your door security, check-in desks, and volunteer staff. Each check-in is logged with the operator's User ID and assigned station.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openQrModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800/90 border border-slate-700 px-3.5 py-2.5 text-xs font-bold text-white hover:bg-slate-700 transition-colors shadow-sm cursor-pointer"
            >
              <QrCode className="h-4 w-4 text-sky-400" />
              <span>Mobile QR</span>
            </button>

            <a
              href={gateCheckinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 transition-all shadow-md cursor-pointer"
            >
              <span>Launch Gate Portal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Dedicated Shareable Gate URL Bar */}
        <div className="mt-5 rounded-2xl bg-black/40 border border-white/10 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-semibold text-slate-400 shrink-0 uppercase tracking-wider text-[10px]">
              Gate Access URL:
            </span>
            <span className="font-mono text-emerald-300 truncate">
              {gateCheckinUrl}
            </span>
          </div>

          <button
            type="button"
            onClick={copyGateLink}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 px-3 py-1.5 font-semibold text-white transition-all shrink-0 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Total Configured Staff</span>
          <span className="text-2xl font-black text-slate-900 mt-1 block">
            {credentials.length}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">
            {credentials.filter((c) => c.is_active).length} Active Stations
          </span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block">Gate Check-Ins Processed</span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {totalGateCheckins}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 block">Attributed to staff logins</span>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Need another station?</span>
            <span className="text-xs text-slate-700 font-bold block mt-1">Add Gate Staff Account</span>
          </div>
          {!isAdding && (
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                handleRandomGenerate();
              }}
              className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
            >
              <Plus className="h-4 w-4" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Add New Gate Staff Account Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateCredential}
          className="rounded-3xl border border-sky-200 bg-sky-50/50 p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-sky-100">
            <div>
              <h3 className="text-sm font-bold text-sky-950">New Gate Staff Account</h3>
              <p className="text-xs text-sky-700">Set custom credentials or click Random Generate.</p>
            </div>
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Staff User ID <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRandomGenerate}
                  className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold cursor-pointer inline-flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Random</span>
                </button>
              </div>
              <input
                type="text"
                required
                value={userId}
                onChange={(e) => setUserId(e.target.value.toUpperCase())}
                placeholder="e.g. GATE-01"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Station Checkpoint
              </label>
              <input
                type="text"
                list="station-presets"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="e.g. Main Entrance Gate"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
              />
              <datalist id="station-presets">
                {PRESET_STATIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Secret Passcode / PIN <span className="text-rose-500">*</span>
                </label>
              </div>
              <input
                type="text"
                required
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="e.g. GATE-4821"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Internal Station Notes (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. iPad at registration table 2, Volunteer Sarah"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Save Gate Login</span>
            </button>
          </div>
        </form>
      )}

      {/* Gate Credentials List */}
      <div className="rounded-3xl border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Authorized Gate Staff Logins</h3>
            <p className="text-xs text-slate-500">Staff can unlock the scanner at your Gate Access URL using these credentials.</p>
          </div>
          <button
            type="button"
            onClick={loadCredentials}
            className="text-xs text-slate-500 hover:text-slate-900 font-semibold cursor-pointer"
          >
            Refresh List
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-sky-600 mx-auto mb-2" />
            <span className="text-xs text-slate-400">Loading gate credentials...</span>
          </div>
        ) : credentials.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No specific gate logins created yet.</p>
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                handleRandomGenerate();
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Gate Login</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {credentials.map((cred) => {
              const isVisible = visiblePasswords[cred.id];
              const isCopied = copiedCredId === cred.id;

              return (
                <div
                  key={cred.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 font-mono font-bold text-xs ${
                        cred.is_active
                          ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-400 border border-slate-200"
                      }`}
                    >
                      {cred.user_id.slice(0, 4)}
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {cred.user_id}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700">
                          {cred.station_name}
                        </span>
                        {cred.is_active ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60">
                            Active
                          </span>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                            Disabled
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1 font-mono">
                          Passcode:{" "}
                          <strong className="text-slate-800">
                            {isVisible ? cred.passcode : "••••••••"}
                          </strong>
                          <button
                            type="button"
                            onClick={() =>
                              setVisiblePasswords((prev) => ({ ...prev, [cred.id]: !prev[cred.id] }))
                            }
                            className="p-0.5 text-slate-400 hover:text-slate-600 cursor-pointer ml-1"
                            title={isVisible ? "Hide passcode" : "Show passcode"}
                          >
                            {isVisible ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                          </button>
                        </span>

                        <span>•</span>
                        <span className="text-emerald-700 font-semibold">
                          {cred.checkinCount} attendees checked in
                        </span>

                        {cred.last_login_at && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-slate-400">
                              Last login {new Date(cred.last_login_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </>
                        )}
                      </div>

                      {cred.notes && (
                        <p className="text-[11px] text-slate-400 italic">
                          Note: {cred.notes}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    {/* Copy Staff Packet */}
                    <button
                      type="button"
                      onClick={() => copyStaffCredentials(cred)}
                      className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors cursor-pointer"
                      title="Copy login details to send to staff"
                    >
                      {isCopied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 text-slate-500" />
                          <span>Copy Info</span>
                        </>
                      )}
                    </button>

                    {/* Toggle Active Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(cred.id, cred.is_active)}
                      className={`rounded-xl p-2 border transition-colors cursor-pointer ${
                        cred.is_active
                          ? "border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                          : "border-slate-200 text-slate-400 hover:bg-slate-100"
                      }`}
                      title={cred.is_active ? "Disable credential" : "Enable credential"}
                    >
                      {cred.is_active ? <ToggleRight className="h-4 w-4" /> : <ToggleLeft className="h-4 w-4" />}
                    </button>

                    {/* Delete Credential */}
                    <button
                      type="button"
                      onClick={() => handleDeleteCredential(cred.id)}
                      className="rounded-xl p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 transition-colors cursor-pointer"
                      title="Delete credential"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* QR Modal for instant mobile onboarding */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 mb-3">
              <Smartphone className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Scan to Open Gate Terminal</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Scan this QR code on any phone or iPad to launch the gate scanner station instantly:
            </p>

            <div className="my-5 flex justify-center">
              {qrDataUrl ? (
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner">
                  <img src={qrDataUrl} alt="Gate Checkin QR" className="h-48 w-48 object-contain" />
                </div>
              ) : (
                <div className="h-48 w-48 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              )}
            </div>

            <p className="text-[11px] font-mono text-slate-400 break-all">
              {gateCheckinUrl}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
