"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import {
  Scan,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  ArrowRightLeft,
  Utensils,
  MapPin,
  DoorOpen,
  Layers,
  Volume2,
  VolumeX,
  Vibrate,
  Loader2,
  User,
  Clock,
  Sparkles,
  Search,
} from "lucide-react";
import {
  Event,
  EventGate,
  EventArea,
  EventSection,
  EventFoodCategory,
  AccessDecisionResult,
  ScanType,
} from "@/types/database";
import { AuthGuard } from "@/components/AuthGuard";

export default function MobileStaffScannerPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Topology for chosen event
  const [gates, setGates] = useState<EventGate[]>([]);
  const [areas, setAreas] = useState<EventArea[]>([]);
  const [sections, setSections] = useState<EventSection[]>([]);
  const [foodCategories, setFoodCategories] = useState<EventFoodCategory[]>([]);

  // Checkpoint Selection State
  const [checkpointType, setCheckpointType] = useState<"gate" | "area" | "section" | "food">("gate");
  const [selectedCheckpointId, setSelectedCheckpointId] = useState<string>("");
  const [scanType, setScanType] = useState<ScanType>("entry");

  // Scanner & Input State
  const [inputCode, setInputCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [lastDecision, setLastDecision] = useState<AccessDecisionResult | null>(null);
  const [scanHistory, setScanHistory] = useState<AccessDecisionResult[]>([]);

  // Sound & Haptic Settings
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Initialize Audio Context on user interaction
  function playFeedbackTone(allowed: boolean) {
    if (!soundEnabled) return;
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === "suspended") {
        ctx.resume();
      }

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (allowed) {
        // Happy high-pitched two-tone chime
        osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
        osc.frequency.setValueAtTime(880, ctx.currentTime + 0.1); // A5
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Low buzzer tone
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(160, ctx.currentTime);
        gain.gain.setValueAtTime(0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.4);
      }
    } catch {
      // Audio not supported or blocked
    }

    // Trigger haptics if supported
    try {
      if (typeof window !== "undefined" && "vibrate" in navigator) {
        if (allowed) {
          navigator.vibrate([80]);
        } else {
          navigator.vibrate([180, 80, 180]);
        }
      }
    } catch {
      // Haptics unsupported
    }
  }

  // Load available events
  useEffect(() => {
    async function loadEvents() {
      try {
        const res = await fetch("/api/events");
        if (res.ok) {
          const data = await res.json();
          const evList: Event[] = data.events || [];
          setEvents(evList);
          if (evList.length > 0) {
            setSelectedEventId(evList[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load events:", err);
      } finally {
        setLoadingEvents(false);
      }
    }
    loadEvents();
  }, []);

  // Load event topography when selected event changes
  useEffect(() => {
    if (!selectedEventId) return;

    async function loadConfig() {
      try {
        const res = await fetch(`/api/events/${selectedEventId}/config`);
        if (res.ok) {
          const data = await res.json();
          setGates(data.gates || []);
          setAreas(data.areas || []);
          setSections(data.sections || []);
          setFoodCategories(data.foodCategories || []);

          // Auto-select first available checkpoint
          if (data.gates?.length > 0) {
            setCheckpointType("gate");
            setSelectedCheckpointId(data.gates[0].id);
          } else if (data.areas?.length > 0) {
            setCheckpointType("area");
            setSelectedCheckpointId(data.areas[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load topology:", err);
      }
    }
    loadConfig();
  }, [selectedEventId]);

  // Sync checkpoint type with default id
  function handleCheckpointTypeChange(type: "gate" | "area" | "section" | "food") {
    setCheckpointType(type);
    if (type === "gate" && gates.length > 0) setSelectedCheckpointId(gates[0].id);
    else if (type === "area" && areas.length > 0) setSelectedCheckpointId(areas[0].id);
    else if (type === "section" && sections.length > 0) setSelectedCheckpointId(sections[0].id);
    else if (type === "food" && foodCategories.length > 0) setSelectedCheckpointId(foodCategories[0].id);
    else setSelectedCheckpointId("");

    // Set default scan mode
    if (type === "food") setScanType("food_redemption");
    else if (scanType === "food_redemption") setScanType("entry");
  }

  // Handle Verify Scan Submission
  async function handleVerify(codeToTest?: string) {
    const rawCode = (codeToTest || inputCode).trim();
    if (!rawCode || isVerifying || !selectedEventId) return;

    setIsVerifying(true);
    setLastDecision(null);

    try {
      const payload: any = {
        code: rawCode,
        scan_type: scanType,
      };

      if (checkpointType === "gate") payload.gate_id = selectedCheckpointId;
      if (checkpointType === "area") payload.area_id = selectedCheckpointId;
      if (checkpointType === "section") payload.section_id = selectedCheckpointId;
      if (checkpointType === "food") {
        payload.food_category_id = selectedCheckpointId;
        payload.scan_type = "food_redemption";
      }

      const res = await fetch(`/api/events/${selectedEventId}/access/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      const decision: AccessDecisionResult = data.decision || {
        allowed: false,
        result: "denied_invalid",
        reason: data.error || "Invalid response from server",
        scan_type: scanType,
        timestamp: new Date().toISOString(),
      };

      setLastDecision(decision);
      setScanHistory((prev) => [decision, ...prev.slice(0, 19)]);
      playFeedbackTone(decision.allowed);
      setInputCode("");
    } catch (err: any) {
      const fallbackDecision: AccessDecisionResult = {
        allowed: false,
        result: "DENIED",
        reason: err.message || "Network error communicating with access server",
        scan_type: scanType,
        timestamp: new Date().toISOString(),
      };
      setLastDecision(fallbackDecision);
      playFeedbackTone(false);
    } finally {
      setIsVerifying(false);
      // Auto-refocus input
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-50 border-b border-slate-200 px-4 py-3 sticky top-0 z-30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold shadow-sm shadow-sky-600/30">
            <Scan className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">Field Access Terminal</h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-sky-100 text-sky-800 uppercase tracking-wider">
                Staff Ops
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Ultra-low latency checkpoint verification</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border text-xs font-semibold transition ${
              soundEnabled
                ? "bg-sky-50 border-sky-300 text-sky-700"
                : "bg-white border-slate-200 text-slate-400 hover:text-slate-600"
            }`}
            title={soundEnabled ? "Mute audio" : "Enable sound"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>
          <Link
            href="/events"
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
          >
            Dashboard
          </Link>
        </div>
      </header>

      {/* Main Terminal Grid */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* 1. Terminal Station Configurator Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Event Picker */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Active Event
              </label>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
              >
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.slug})
                  </option>
                ))}
              </select>
            </div>

            {/* Checkpoint Type Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Checkpoint Type
              </label>
              <div className="grid grid-cols-4 gap-1.5 bg-white p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => handleCheckpointTypeChange("gate")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    checkpointType === "gate" ? "bg-sky-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <DoorOpen className="w-3.5 h-3.5" /> Gate
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckpointTypeChange("area")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    checkpointType === "area" ? "bg-sky-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" /> Area
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckpointTypeChange("section")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    checkpointType === "section"
                      ? "bg-sky-600 text-white shadow-xs"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Section
                </button>
                <button
                  type="button"
                  onClick={() => handleCheckpointTypeChange("food")}
                  className={`py-1.5 px-2 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1 ${
                    checkpointType === "food" ? "bg-sky-600 text-white shadow-xs" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Utensils className="w-3.5 h-3.5" /> Food
                </button>
              </div>
            </div>
          </div>

          {/* Sub-Selection: Specific Gate/Area/Food & Mode */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-200">
            {/* Specific Station ID */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Assigned Station Name
              </label>
              {checkpointType === "gate" && (
                <select
                  value={selectedCheckpointId}
                  onChange={(e) => setSelectedCheckpointId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                >
                  {gates.length === 0 && <option value="">No gates configured</option>}
                  {gates.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name} {g.code ? `(${g.code})` : ""}
                    </option>
                  ))}
                </select>
              )}

              {checkpointType === "area" && (
                <select
                  value={selectedCheckpointId}
                  onChange={(e) => setSelectedCheckpointId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                >
                  {areas.length === 0 && <option value="">No areas configured</option>}
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.area_type})
                    </option>
                  ))}
                </select>
              )}

              {checkpointType === "section" && (
                <select
                  value={selectedCheckpointId}
                  onChange={(e) => setSelectedCheckpointId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                >
                  {sections.length === 0 && <option value="">No sections configured</option>}
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              )}

              {checkpointType === "food" && (
                <select
                  value={selectedCheckpointId}
                  onChange={(e) => setSelectedCheckpointId(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                >
                  {foodCategories.length === 0 && <option value="">No food counters configured</option>}
                  {foodCategories.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Scan Mode Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                Operation Direction
              </label>
              {checkpointType === "food" ? (
                <div className="py-2 px-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold flex items-center gap-2">
                  <Utensils className="w-4 h-4 text-amber-600" />
                  Meal / Voucher Redemption Mode
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setScanType("entry")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      scanType === "entry"
                        ? "bg-emerald-600 border-emerald-700 text-white shadow-xs"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <DoorOpen className="w-3.5 h-3.5" /> ENTRY (Check-In)
                  </button>
                  <button
                    type="button"
                    onClick={() => setScanType("exit")}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-1.5 ${
                      scanType === "exit"
                        ? "bg-amber-600 border-amber-700 text-white shadow-xs"
                        : "bg-white border-slate-300 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> EXIT (Check-Out)
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 2. Instant Scanner & Manual Input Viewport */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleVerify();
            }}
            className="flex flex-col sm:flex-row items-center gap-3"
          >
            <div className="relative flex-1 w-full">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                ref={inputRef}
                type="text"
                autoFocus
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Scan QR or enter Guest Code (e.g. GBH-2026-X8F9)..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-xl text-base font-mono font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-inner"
              />
            </div>

            <button
              type="submit"
              disabled={isVerifying || !inputCode.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition flex items-center justify-center gap-2 shadow-sm shadow-sky-600/30 cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  Verify Access
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500">
            <span className="font-semibold">Quick Test:</span>
            <button
              type="button"
              onClick={() => handleVerify("GBH-2026-DEMO")}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-mono text-slate-700 transition"
            >
              GBH-2026-DEMO
            </button>
            <button
              type="button"
              onClick={() => handleVerify("VIP-PASS-TEST")}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-mono text-slate-700 transition"
            >
              VIP-PASS-TEST
            </button>
          </div>
        </div>

        {/* 3. High-Visibility Access Decision Billboard */}
        {lastDecision && (
          <div
            className={`rounded-2xl p-6 sm:p-8 text-white transition-all transform animate-in zoom-in-95 duration-200 shadow-lg ${
              lastDecision.allowed
                ? "bg-gradient-to-br from-emerald-500 to-emerald-700 border-2 border-emerald-400"
                : "bg-gradient-to-br from-red-600 to-red-800 border-2 border-red-500"
            }`}
          >
            <div className="flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
              <div className="flex items-center gap-4">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center shrink-0 shadow-md ${
                    lastDecision.allowed ? "bg-white text-emerald-600" : "bg-white text-red-600"
                  }`}
                >
                  {lastDecision.allowed ? (
                    <CheckCircle2 className="w-12 h-12" />
                  ) : (
                    <XCircle className="w-12 h-12" />
                  )}
                </div>
                <div>
                  <div className="text-3xl font-black tracking-tight uppercase">
                    {lastDecision.allowed ? "ACCESS GRANTED" : "ACCESS DENIED"}
                  </div>
                  <div className="text-sm font-semibold opacity-90 mt-1">{lastDecision.reason}</div>
                  <div className="text-xs opacity-75 font-mono mt-0.5">
                    Checkpoint: {lastDecision.checkpoint_name || "Assigned Station"} • Mode:{" "}
                    {lastDecision.scan_type.toUpperCase()}
                  </div>
                </div>
              </div>

              {lastDecision.guest && (
                <div className="bg-black/20 backdrop-blur-xs rounded-xl p-4 min-w-[240px] text-left border border-white/20">
                  <div className="text-xs uppercase tracking-wider font-semibold opacity-75">Attendee Profile</div>
                  <div className="text-lg font-black mt-0.5">
                    {lastDecision.guest.first_name} {lastDecision.guest.last_name}
                  </div>
                  <div className="text-xs opacity-90 truncate">{lastDecision.guest.email}</div>
                  {lastDecision.pass && (
                    <div className="mt-2 inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white text-slate-900 shadow-2xs">
                      {lastDecision.pass.name} Pass
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4. Live Recent Scans Audit Ledger */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-sky-600" />
              Recent Terminal Verification Logs
            </h2>
            <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md">
              {scanHistory.length} Scans
            </span>
          </div>

          {scanHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-xs">
              No scans recorded during this terminal session yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {scanHistory.map((scan, idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    {scan.allowed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                    )}
                    <div>
                      <span className="font-bold text-slate-900">
                        {scan.guest
                          ? `${scan.guest.first_name || ""} ${scan.guest.last_name || ""}`.trim() || "Guest"
                          : "Guest"}
                      </span>
                      <span className="text-slate-500 font-mono ml-2">[{scan.result}]</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-slate-500">
                    <span className="capitalize">{scan.scan_type}</span>
                    <span className="font-mono text-[11px]">
                      {new Date(scan.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
    </AuthGuard>
  );
}
