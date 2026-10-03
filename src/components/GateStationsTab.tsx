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
  UtensilsCrossed,
  Crown,
  DoorOpen,
  FlaskConical,
  BarChart3,
  RefreshCw,
} from "lucide-react";
import { Event, EventSettings, GateCredential, StationSectionType } from "@/types/database";
import { generateProfessionalId } from "@/lib/utils";

interface GateStationsTabProps {
  eventId: string;
  event: Event;
  settings: EventSettings;
}

interface StationStats {
  totalCheckins: number;
  gateCount: number;
  foodCount: number;
  vipCount: number;
  breakoutCount: number;
  stations: { id: string; name: string; count: number; section: string }[];
}

export function GateStationsTab({ eventId, event, settings }: GateStationsTabProps) {
  const [credentials, setCredentials] = useState<(GateCredential & { checkinCount: number })[]>([]);
  const [stats, setStats] = useState<StationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCredId, setCopiedCredId] = useState<string | null>(null);

  // New Credential Form state
  const [isAdding, setIsAdding] = useState(false);
  const [sectionType, setSectionType] = useState<StationSectionType>("gate");
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

  const SECTION_CONFIGS: Record<
    StationSectionType,
    { label: string; defaultName: string; prefix: string; passPrefix: string; icon: any; colorClass: string; badgeClass: string }
  > = {
    gate: {
      label: "Main Gate / Entrance",
      defaultName: "Main Entrance Gate",
      prefix: "GATE",
      passPrefix: "GATE",
      icon: DoorOpen,
      colorClass: "text-sky-600 bg-sky-50 border-sky-200",
      badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    },
    food: {
      label: "Food & Catering",
      defaultName: "Food & Catering Hall",
      prefix: "FOOD",
      passPrefix: "FOOD",
      icon: UtensilsCrossed,
      colorClass: "text-emerald-600 bg-emerald-50 border-emerald-200",
      badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    },
    vip_lounge: {
      label: "VIP Lounge & Reception",
      defaultName: "VIP Hacker Lounge",
      prefix: "VIP",
      passPrefix: "VIP",
      icon: Crown,
      colorClass: "text-indigo-600 bg-indigo-50 border-indigo-200",
      badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    breakout: {
      label: "Breakout Labs & Sessions",
      defaultName: "Breakout Workshop Room",
      prefix: "LABS",
      passPrefix: "LABS",
      icon: FlaskConical,
      colorClass: "text-amber-600 bg-amber-50 border-amber-200",
      badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    },
  };

  async function loadData() {
    try {
      setLoading(true);
      const [credsRes, statsRes] = await Promise.all([
        fetch(`/api/events/${eventId}/gate-credentials`),
        fetch(`/api/events/${eventId}/station-stats`),
      ]);

      if (credsRes.ok) {
        const data = await credsRes.json();
        setCredentials(data.credentials || []);
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.stats);
        }
      }
    } catch (err) {
      console.error("Error loading station data:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [eventId]);

  function handleSectionChange(type: StationSectionType) {
    setSectionType(type);
    const cfg = SECTION_CONFIGS[type];
    setStationName(cfg.defaultName);
    const num = Math.floor(1 + Math.random() * 9);
    const professionalStaffId = generateProfessionalId(
      event?.title || "Event",
      event?.start_date,
      `${cfg.prefix}-0${num}`
    );
    setUserId(professionalStaffId);
    setPasscode(`${cfg.passPrefix}-${Math.floor(1000 + Math.random() * 9000)}`);
  }

  function handleRandomGenerate() {
    handleSectionChange(sectionType);
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
          section_type: sectionType,
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
      loadData();
    } catch (err: any) {
      setError(err?.message || "Failed to save gate credential");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteCredential(credId: string) {
    if (!confirm("Are you sure you want to delete this station staff login?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/gate-credentials/${credId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        loadData();
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
        loadData();
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
    const text = `🚪 Station Staff Credentials - ${event.title}\nStation Portal: ${gateCheckinUrl}\nAssigned Section: ${cred.station_name}\nStation Staff ID: ${cred.user_id}\nPasscode PIN: ${cred.passcode}`;
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

  const totalGateCheckins = stats?.totalCheckins ?? credentials.reduce((sum, c) => sum + (c.checkinCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Shareable Terminal URL */}
      <div className="rounded-3xl border border-slate-200/90 bg-[#f8fafc] p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">
          <div className="space-y-1.5 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-sky-50 border border-sky-200 px-3 py-1 text-xs font-bold text-sky-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Multi-Station Operational Security</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
              Station Credentials & Operational Tracking
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Create dedicated, admin-controlled staff logins for each section: <strong>Main Gate</strong>, <strong>Food & Catering</strong>, <strong>VIP Lounge</strong>, and <strong>Breakouts</strong>. Check-ins are tracked and persisted independently in the database per station.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={openQrModal}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
            >
              <QrCode className="h-4 w-4 text-sky-600" />
              <span>Mobile QR</span>
            </button>

            <a
              href={gateCheckinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-sky-500 transition-all shadow-sm cursor-pointer"
            >
              <span>Launch Station Terminal</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>

        {/* Shareable Station Portal URL Bar */}
        <div className="mt-5 rounded-2xl bg-white border border-slate-200/80 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-2 overflow-hidden">
            <span className="font-bold text-slate-500 shrink-0 uppercase tracking-wider text-[10px]">
              Terminal URL:
            </span>
            <span className="font-mono text-sky-700 font-bold truncate">
              {gateCheckinUrl}
            </span>
          </div>

          <button
            type="button"
            onClick={copyGateLink}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 border border-sky-200 px-3 py-1.5 font-bold text-sky-700 transition-all shrink-0 cursor-pointer"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Terminal Link</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. Real-Time Section Checkpoint Dashboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">Station Activity & Tracking Dashboard</h3>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="text-xs text-sky-600 hover:text-sky-700 font-bold inline-flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh Stats</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Main Gate */}
          <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Main Gate</span>
              <div className="p-2 rounded-xl bg-sky-100 text-sky-700 border border-sky-200">
                <DoorOpen className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-slate-900">{stats?.gateCount ?? 0}</span>
              <span className="text-xs text-slate-500 block mt-0.5">Attendee Arrivals</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Section: General Admission</span>
              <span className="text-sky-700 font-bold">Active</span>
            </div>
          </div>

          {/* Food & Catering */}
          <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Food & Catering</span>
              <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-slate-900">{stats?.foodCount ?? 0}</span>
              <span className="text-xs text-slate-500 block mt-0.5">Meal Vouchers Redeemed</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Dietary alerts active</span>
              <span className="text-emerald-700 font-bold">Live</span>
            </div>
          </div>

          {/* VIP Lounge */}
          <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">VIP Lounge</span>
              <div className="p-2 rounded-xl bg-indigo-100 text-indigo-700 border border-indigo-200">
                <Crown className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-slate-900">{stats?.vipCount ?? 0}</span>
              <span className="text-xs text-slate-500 block mt-0.5">VIP Admissions</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Tier Verified</span>
              <span className="text-indigo-700 font-bold">Secured</span>
            </div>
          </div>

          {/* Breakouts & Workshops */}
          <div className="rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Breakouts / Labs</span>
              <div className="p-2 rounded-xl bg-amber-100 text-amber-700 border border-amber-200">
                <FlaskConical className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className="text-3xl font-black text-slate-900">{stats?.breakoutCount ?? 0}</span>
              <span className="text-xs text-slate-500 block mt-0.5">Session Check-Ins</span>
            </div>
            <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[11px] text-slate-500 font-medium">
              <span>Total Scans: {totalGateCheckins}</span>
              <span className="text-amber-700 font-bold">Tracked</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Section Account Action Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-xs font-bold text-slate-900 block">Configure Dedicated Station Credentials</span>
          <span className="text-xs text-slate-500 block mt-0.5">
            {credentials.length} configured staff accounts ({credentials.filter((c) => c.is_active).length} active)
          </span>
        </div>
        {!isAdding && (
          <button
            type="button"
            onClick={() => {
              setIsAdding(true);
              handleSectionChange("gate");
            }}
            className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-500 transition-colors shadow-xs cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Create Station Login</span>
          </button>
        )}
      </div>

      {/* 4. Add New Station Staff Account Form */}
      {isAdding && (
        <form
          onSubmit={handleCreateCredential}
          className="rounded-3xl border border-sky-300 bg-[#f8fafc] p-5 sm:p-6 shadow-sm space-y-4 animate-in fade-in"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Create Dedicated Station Staff Login</h3>
              <p className="text-xs text-slate-500">Assign this account to a specific section checkpoint.</p>
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

          {/* Section Selection Pills */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Select Operational Section
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(SECTION_CONFIGS) as StationSectionType[]).map((type) => {
                const cfg = SECTION_CONFIGS[type];
                const Icon = cfg.icon;
                const isSelected = sectionType === type;
                return (
                  <button
                    key={type}
                    type="button"
                    onClick={() => handleSectionChange(type)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold transition-all text-left cursor-pointer ${
                      isSelected
                        ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                        : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="truncate">{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-slate-700">
                  Staff User ID <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={handleRandomGenerate}
                  className="text-[11px] text-sky-600 hover:text-sky-700 font-bold cursor-pointer inline-flex items-center gap-1"
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
                placeholder="e.g. GBH-dec-2026-GATE-01"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Assigned Station Name
              </label>
              <input
                type="text"
                value={stationName}
                onChange={(e) => setStationName(e.target.value)}
                placeholder="e.g. Main Entrance Gate"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 font-medium focus:outline-none focus:border-sky-500"
              />
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
              placeholder="e.g. Laptop at table 2, Volunteer Sarah"
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
              className="rounded-xl bg-sky-600 px-5 py-2 text-xs font-bold text-white hover:bg-sky-500 transition-all disabled:opacity-50 cursor-pointer flex items-center gap-1.5 shadow-sm"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Save Station Account</span>
            </button>
          </div>
        </form>
      )}

      {/* 5. Authorized Station Logins Table */}
      <div className="rounded-3xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Authorized Section Logins</h3>
            <p className="text-xs text-slate-500">Dedicated credentials for door security, catering staff, and VIP hosts.</p>
          </div>
          <button
            type="button"
            onClick={loadData}
            className="text-xs text-sky-600 hover:text-sky-700 font-bold cursor-pointer inline-flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-sky-600 mx-auto mb-2" />
            <span className="text-xs text-slate-400">Loading station accounts...</span>
          </div>
        ) : credentials.length === 0 ? (
          <div className="p-8 text-center space-y-3">
            <ShieldCheck className="h-10 w-10 text-slate-300 mx-auto" />
            <p className="text-xs text-slate-500">No specific station logins created yet.</p>
            <button
              type="button"
              onClick={() => {
                setIsAdding(true);
                handleSectionChange("gate");
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create First Station Login</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {credentials.map((cred) => {
              const isVisible = visiblePasswords[cred.id];
              const isCopied = copiedCredId === cred.id;

              // Determine icon & config
              const secType: StationSectionType =
                cred.section_type ||
                (cred.station_name.toLowerCase().includes("food") || cred.station_name.toLowerCase().includes("cater")
                  ? "food"
                  : cred.station_name.toLowerCase().includes("vip")
                  ? "vip_lounge"
                  : cred.station_name.toLowerCase().includes("breakout") || cred.station_name.toLowerCase().includes("lab")
                  ? "breakout"
                  : "gate");
              const cfg = SECTION_CONFIGS[secType] || SECTION_CONFIGS.gate;
              const SectionIcon = cfg.icon;

              return (
                <div
                  key={cred.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div
                      className={`flex h-10 w-10 items-center justify-center rounded-2xl shrink-0 border ${cfg.colorClass}`}
                    >
                      <SectionIcon className="h-5 w-5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-slate-900 text-sm">
                          {cred.user_id}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {cred.station_name}
                        </span>
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${cfg.badgeClass}`}>
                          {cfg.label}
                        </span>
                        {cred.is_active ? (
                          <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
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
                        <span className="text-sky-700 font-bold">
                          {cred.checkinCount} check-ins processed
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

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-3 border border-sky-100">
              <Smartphone className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Scan to Open Station Terminal</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Scan this QR code on any phone, iPad, or laptop to launch the check-in station terminal:
            </p>

            <div className="my-5 flex justify-center">
              {qrDataUrl ? (
                <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner">
                  <img src={qrDataUrl} alt="Station Checkin QR" className="h-48 w-48 object-contain" />
                </div>
              ) : (
                <div className="h-48 w-48 bg-slate-100 rounded-2xl flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                </div>
              )}
            </div>

            <p className="text-[11px] font-mono text-slate-500 break-all bg-[#f8fafc] p-2 rounded-xl border border-slate-200">
              {gateCheckinUrl}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
