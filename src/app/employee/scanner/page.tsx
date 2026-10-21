"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import jsQR from "jsqr";
import {
  Scan,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRightLeft,
  Utensils,
  MapPin,
  DoorOpen,
  Layers,
  Volume2,
  VolumeX,
  Loader2,
  User,
  Clock,
  Search,
  Camera,
  CameraOff,
  FlipHorizontal,
  Keyboard,
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

  // Camera vs Keypad Input Mode
  const [inputMode, setInputMode] = useState<"camera" | "manual">("camera");
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const scanCooldownRef = useRef(false);

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

  function stopCamera() {
    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
      scanLoopRef.current = null;
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
  }

  async function startCamera(overrideFacing?: "environment" | "user") {
    setCameraError(null);
    const mode = overrideFacing || facingMode;

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera API not accessible in this browser context.");
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: mode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch {
        // Fallback for laptops/desktops without facingMode constraint support
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      setCameraActive(true);

      // Ensure video element has stream attached and playing
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play error:", playErr);
        }
        startScanningLoop();
      }
    } catch (err: any) {
      console.warn("Camera start error:", err);
      setCameraError(err?.message || "Camera permission denied or camera device unavailable.");
      setCameraActive(false);
    }
  }

  function toggleCamera() {
    if (cameraActive) {
      stopCamera();
    } else {
      startCamera();
    }
  }

  function flipCamera() {
    const nextFacing = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextFacing);
    if (cameraActive) {
      stopCamera();
      setTimeout(() => startCamera(nextFacing), 150);
    }
  }

  function startScanningLoop() {
    function tick() {
      if (!videoRef.current || !canvasRef.current) return;

      if (videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data && !scanCooldownRef.current && !isVerifying) {
            scanCooldownRef.current = true;
            let codeData = code.data;
            if (codeData.startsWith("RSVP:")) {
              const parts = codeData.split(":");
              if (parts.length >= 3) {
                codeData = parts.slice(2).join(":");
              }
            }
            handleVerify(codeData);
            setTimeout(() => {
              scanCooldownRef.current = false;
            }, 1200);
          }
        }
      }

      scanLoopRef.current = requestAnimationFrame(tick);
    }

    if (scanLoopRef.current) {
      cancelAnimationFrame(scanLoopRef.current);
    }
    scanLoopRef.current = requestAnimationFrame(tick);
  }

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

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

        {/* 2. Interactive Camera Scanner & Barcode Viewport */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setInputMode("camera");
                  if (!cameraActive) startCamera();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  inputMode === "camera"
                    ? "bg-white text-sky-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Live Camera Scanner</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInputMode("manual");
                  stopCamera();
                  setTimeout(() => inputRef.current?.focus(), 100);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  inputMode === "manual"
                    ? "bg-white text-sky-700 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Manual / USB Wedge</span>
              </button>
            </div>

            {inputMode === "camera" && cameraActive && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={flipCamera}
                  className="px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 shadow-2xs transition cursor-pointer"
                  title="Switch front/rear camera"
                >
                  <FlipHorizontal className="w-3.5 h-3.5 text-slate-500" />
                  <span>Flip Camera</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-2.5 py-1.5 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Stop camera"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  <span>Pause</span>
                </button>
              </div>
            )}
          </div>

          {/* Hidden Canvas used for machine vision frame decoding */}
          <canvas ref={canvasRef} className="hidden" />

          {/* Mode 1: Live Video Camera Viewport */}
          {inputMode === "camera" && (
            <div className="space-y-3">
              {/* Mounted Video Element & Reticle: Always in DOM */}
              <div
                className={`relative aspect-video max-h-[360px] w-full rounded-2xl overflow-hidden bg-slate-950 items-center justify-center shadow-inner border border-slate-800 ${
                  cameraActive ? "flex" : "hidden"
                }`}
              >
                <video
                  ref={videoRef}
                  playsInline
                  autoPlay
                  muted
                  className="w-full h-full object-cover"
                />

                {/* High-Tech Viewfinder Reticle Overlay */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                  <div className="relative w-48 h-48 sm:w-56 sm:h-56">
                    {/* Four Corner Brackets */}
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-sky-400 rounded-tl-lg" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-sky-400 rounded-tr-lg" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-sky-400 rounded-bl-lg" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-sky-400 rounded-br-lg" />

                    {/* Animated Laser Scanning Beam */}
                    <div className="absolute left-2 right-2 top-1/2 -translate-y-1/2 h-0.5 bg-sky-400 shadow-[0_0_12px_#38bdf8] animate-pulse" />
                  </div>
                </div>

                {/* Bottom Scan Status Indicator */}
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-semibold flex items-center gap-2 border border-white/10">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>Point at QR pass badge</span>
                </div>
              </div>

              {/* Placeholder when camera is stopped */}
              {!cameraActive && (
                <div className="rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-600 flex items-center justify-center mx-auto shadow-2xs">
                    <Camera className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Mobile Video Camera Scanner</h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto mt-0.5">
                      Activate your device camera to scan attendee QR passes in real time with audio and haptic feedback.
                    </p>
                  </div>

                  {cameraError && (
                    <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 p-2 rounded-xl max-w-sm mx-auto font-medium">
                      {cameraError}
                    </p>
                  )}

                  <button
                    type="button"
                    onClick={() => startCamera()}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm shadow-sky-600/30 transition cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Start Camera Scanner</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Mode 2: Manual Keypad / USB Barcode Wedge Form */}
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
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Scan QR with handheld or enter ticket code (e.g. GBH-2026-X8F9)..."
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
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verify Pass</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Shortcuts */}
          <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 pt-1">
            <span className="font-semibold text-slate-400">Quick Test:</span>
            <button
              type="button"
              onClick={() => handleVerify("GBH-2026-DEMO")}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-mono text-slate-700 transition cursor-pointer"
            >
              GBH-2026-DEMO
            </button>
            <button
              type="button"
              onClick={() => handleVerify("VIP-PASS-TEST")}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 rounded-md font-mono text-slate-700 transition cursor-pointer"
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
                  {lastDecision.guest.seating_assignment && (
                    <div className="mt-1.5 text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg inline-flex items-center gap-1">
                      <span>🪑 Table / Seat: {lastDecision.guest.seating_assignment}</span>
                    </div>
                  )}
                  {lastDecision.pass && (
                    <div className="mt-2 block">
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-white text-slate-900 shadow-2xs">
                        {lastDecision.pass.name} Pass
                      </span>
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
