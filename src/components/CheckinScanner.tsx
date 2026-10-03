"use client";

import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  FlipHorizontal,
  Search,
  Loader2,
  KeyRound,
  Users,
  ShieldCheck,
  RefreshCw,
  Smartphone,
  QrCode,
  Upload,
  X,
  Sparkles,
  DoorOpen,
  Utensils,
  Crown,
  ChevronDown,
  Layers,
  Laptop,
} from "lucide-react";
import {
  cacheAttendeesForOffline,
  verifyTicketOffline,
  flushOfflineScanQueue,
  getPendingScanCount,
} from "@/lib/services/offlineSync";
import { CheckinResult } from "@/lib/services/checkinService";

interface CheckinScannerProps {
  eventId: string;
  operatorUserId?: string;
  onCheckinSuccess?: () => void;
}

export function CheckinScanner({ eventId, operatorUserId, onCheckinSuccess }: CheckinScannerProps) {
  // Laptop-friendly: Camera is OFF by default
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualCode, setManualCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Active Station / Checkpoint section
  const [activeStation, setActiveStation] = useState<string>("Main Gate Entrance");

  // Real-Time Multi-Station Sync & Offline Queue
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [liveSyncFeed, setLiveSyncFeed] = useState<string | null>(null);
  const ticketCacheRef = useRef<Map<string, { guestName: string; ticketCode: string }>>(new Map());

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const scanCooldownRef = useRef<boolean>(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const STATIONS = [
    { id: "gate", name: "Main Gate Entrance", icon: DoorOpen, color: "text-sky-600 bg-sky-50 border-sky-200" },
    { id: "food", name: "Food & Catering", icon: Utensils, color: "text-amber-600 bg-amber-50 border-amber-200" },
    { id: "vip", name: "VIP Lounge", icon: Crown, color: "text-purple-600 bg-purple-50 border-purple-200" },
    { id: "breakout", name: "Breakout Labs", icon: Sparkles, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  ];

  // Synthesizer Audio Cues
  function playBeep(type: "success" | "duplicate" | "error") {
    if (!soundEnabled || typeof window === "undefined") return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === "success") {
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "duplicate") {
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio autoplay restriction fallback
    }
  }

  // Camera video stream handling (only active when operator requests it)
  async function startCamera(overrideFacing?: "environment" | "user") {
    setCameraError(null);
    const mode = overrideFacing || facingMode;

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error("Camera not accessible in this browser context.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn("Video play error:", playErr);
        }
        setIsCameraActive(true);
        startScanning();
      }
    } catch (err: any) {
      setIsCameraActive(false);
      setCameraError(err?.message || "Camera access denied. Please use the USB / Keyboard scanner below.");
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
    setIsCameraActive(false);
  }

  function startScanning() {
    const scan = () => {
      const video = videoRef.current;
      if (video && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            const maxW = 640;
            const scale = Math.min(1, maxW / video.videoWidth);
            const w = Math.round(video.videoWidth * scale);
            const h = Math.round(video.videoHeight * scale);
            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);

            const imageData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imageData.data, w, h, { inversionAttempts: "dontInvert" });

            if (code && code.data && !scanCooldownRef.current) {
              if (code.data !== lastScannedCodeRef.current) {
                lastScannedCodeRef.current = code.data;
                scanCooldownRef.current = true;
                handleProcessCheckin(code.data, "qr_scan");

                setTimeout(() => {
                  scanCooldownRef.current = false;
                  lastScannedCodeRef.current = null;
                }, 2000);
              }
            }
          }
        }
      }
      scanLoopRef.current = requestAnimationFrame(scan);
    };
    scanLoopRef.current = requestAnimationFrame(scan);
  }

  // Preload ticket cache for offline verification & setup cross-tab listener
  useEffect(() => {
    async function preloadCache() {
      try {
        await cacheAttendeesForOffline(eventId);
        const count = await getPendingScanCount(eventId);
        setOfflineQueueCount(count);
      } catch (e) {
        console.warn("Could not preload offline ticket cache:", e);
      }
    }
    preloadCache();

    // Auto-sync function when network is restored
    async function handleAutoSync() {
      setIsOnline(true);
      const res = await flushOfflineScanQueue(eventId);
      if (res.syncedCount > 0) {
        setLiveSyncFeed(`Synced ${res.syncedCount} offline scan(s) to server.`);
        setTimeout(() => setLiveSyncFeed(null), 4000);
      }
      const count = await getPendingScanCount(eventId);
      setOfflineQueueCount(count);
    }

    const onOnline = () => handleAutoSync();
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    // Initial check of pending queue
    getPendingScanCount(eventId).then(setOfflineQueueCount);

    // Auto-focus the USB barcode / manual scanner input on load
    if (inputRef.current) {
      inputRef.current.focus();
    }

    return () => {
      stopCamera();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, [eventId]);

  // Main check-in verification handler
  async function handleProcessCheckin(code: string, method: "qr_scan" | "manual" = "manual") {
    if (!code.trim()) return;
    setLoading(true);
    setCameraError(null);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          code_or_token: code.trim(),
          method,
          pin: pin || null,
          checkpoint: activeStation,
          gate_user_id: operatorUserId || null,
        }),
      });

      const data = await res.json();
      setLastResult(data);

      if (data.success) {
        playBeep("success");
        setManualCode("");
        if (onCheckinSuccess) onCheckinSuccess();
      } else if (data.code === "ALREADY_CHECKED_IN") {
        playBeep("duplicate");
      } else {
        playBeep("error");
      }
    } catch (err: any) {
      // Robust IndexedDB Offline Fallback
      console.log("Network unavailable, performing offline verification via IndexedDB...");
      const offlineResult = await verifyTicketOffline(
        eventId,
        code,
        activeStation,
        operatorUserId
      );

      setLastResult({
        success: offlineResult.success,
        code: offlineResult.code as any,
        message: offlineResult.message,
        guest: offlineResult.guestName ? ({ first_name: offlineResult.guestName } as any) : undefined,
        section: activeStation,
      });

      if (offlineResult.success) {
        playBeep("success");
        setManualCode("");
        const newQueueCount = await getPendingScanCount(eventId);
        setOfflineQueueCount(newQueueCount);
      } else if (offlineResult.code === "ALREADY_CHECKED_IN") {
        playBeep("duplicate");
      } else {
        playBeep("error");
      }
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.focus();
    }
  }

  function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!manualCode.trim()) return;
    handleProcessCheckin(manualCode, "manual");
  }

  return (
    <div className="space-y-6 select-none">
      {/* 1. Station / Section Selector Bar (Whitesmoke Surface) */}
      <div className="bg-[#f8fafc] p-4 sm:p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Active Checkpoint Station
            </h3>
          </div>
          <span className="text-xs text-sky-700 font-medium">
            Recording entries to: <strong className="text-slate-900 underline">{activeStation}</strong>
          </span>
        </div>

        {/* Station Buttons Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {STATIONS.map((station) => {
            const Icon = station.icon;
            const isSelected = activeStation === station.name;
            return (
              <button
                key={station.id}
                type="button"
                onClick={() => setActiveStation(station.name)}
                className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                  isSelected
                    ? "bg-sky-600 border-sky-600 text-white shadow-sm font-bold"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100/80"
                }`}
              >
                <div
                  className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isSelected ? "bg-white/20 text-white" : station.color
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold block truncate">{station.name}</span>
                  <span
                    className={`text-[10px] block truncate ${
                      isSelected ? "text-sky-100" : "text-slate-400"
                    }`}
                  >
                    {station.id === "food" ? "Meals & Diet" : station.id === "vip" ? "VIP Only" : "Admission"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Primary Fast-Checkin Panel: Optimized for Laptops & USB Barcode Scanners */}
      <div className="bg-[#f8fafc] border border-slate-200/90 rounded-3xl p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-50 text-sky-600 border border-sky-100">
              <Laptop className="h-4 w-4" />
            </span>
            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Laptop Scanner &amp; Rapid Verification
              </h4>
              <p className="text-[11px] text-slate-500">
                Scan pass using any USB handheld scanner or type ticket code and press Enter.
              </p>
            </div>
          </div>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            title={soundEnabled ? "Audio chime enabled" : "Audio chime muted"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
          </button>
        </div>

        {/* Barcode Wedge Scanner Input Form */}
        <form onSubmit={handleManualSubmit} className="space-y-3">
          <div className="relative">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
            <input
              ref={inputRef}
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Scan QR pass with USB/camera scanner or enter ticket code (e.g. PASS-001)..."
              className="w-full pl-12 pr-28 py-3.5 bg-white border-2 border-slate-300 focus:border-sky-500 focus:ring-4 focus:ring-sky-100 rounded-2xl text-sm font-mono text-slate-900 placeholder-slate-400 shadow-inner transition-all"
            />
            <button
              type="submit"
              disabled={loading || !manualCode.trim()}
              className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer disabled:opacity-40"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Verify (Enter)</span>}
            </button>
          </div>
        </form>

        {/* Camera Toggle Button (Optional for Laptops) */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-200/80">
          <span className="text-xs text-slate-500">
            Using a phone/tablet or external webcam?
          </span>

          <button
            type="button"
            onClick={() => {
              if (isCameraActive) {
                stopCamera();
              } else {
                startCamera();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
          >
            <Camera className="h-3.5 w-3.5 text-sky-600" />
            <span>{isCameraActive ? "Deactivate Camera" : "Activate Camera Scanner"}</span>
          </button>
        </div>

        {/* Expandable Camera Viewport (Only rendered when operator activates it) */}
        {isCameraActive && (
          <div className="relative overflow-hidden rounded-2xl border-2 border-slate-300 bg-black p-2 shadow-inner animate-in fade-in zoom-in-95 duration-150">
            <div className="relative aspect-video max-h-[300px] mx-auto overflow-hidden rounded-xl bg-black flex items-center justify-center">
              <video ref={videoRef} playsInline muted autoPlay className="h-full w-full object-cover" />
              <canvas ref={canvasRef} className="hidden" />

              {/* Reticle */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="h-44 w-44 rounded-2xl border-2 border-sky-400 bg-sky-500/10 flex items-center justify-center">
                  <div className="h-36 w-36 border border-dashed border-sky-200 rounded-xl animate-pulse" />
                </div>
              </div>

              {/* Flip camera button */}
              <button
                type="button"
                onClick={() => {
                  const next = facingMode === "environment" ? "user" : "environment";
                  setFacingMode(next);
                  stopCamera();
                  startCamera(next);
                }}
                className="absolute top-2 right-2 p-2 rounded-xl bg-slate-900/80 text-white text-xs hover:bg-slate-800"
                title="Flip camera"
              >
                <FlipHorizontal className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </div>

      {/* 3. Real-Time Check-In Verification Feedback Card */}
      {lastResult && (
        <div
          className={`p-5 rounded-3xl border shadow-sm transition-all animate-in fade-in duration-150 ${
            lastResult.success
              ? "bg-emerald-50/80 border-emerald-300 text-emerald-950"
              : lastResult.code === "ALREADY_CHECKED_IN"
              ? "bg-amber-50/80 border-amber-300 text-amber-950"
              : "bg-rose-50/80 border-rose-300 text-rose-950"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div
                className={`p-2.5 rounded-2xl shrink-0 ${
                  lastResult.success
                    ? "bg-emerald-600 text-white shadow-xs"
                    : lastResult.code === "ALREADY_CHECKED_IN"
                    ? "bg-amber-600 text-white shadow-xs"
                    : "bg-rose-600 text-white shadow-xs"
                }`}
              >
                {lastResult.success ? (
                  <CheckCircle2 className="h-6 w-6" />
                ) : (
                  <AlertCircle className="h-6 w-6" />
                )}
              </div>

              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-md bg-white/80 border border-black/5">
                    {lastResult.section || activeStation}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-600">
                    {lastResult.ticket?.ticket_code || lastResult.guest?.qr_token}
                  </span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900">
                  {lastResult.message}
                </h3>

                {lastResult.guest && (
                  <p className="text-xs text-slate-600">
                    Attendee: <strong>{lastResult.guest.first_name} {lastResult.guest.last_name}</strong> ({lastResult.guest.email})
                  </p>
                )}

                {/* Dietary Restriction Badge for Food & Catering */}
                {lastResult.dietaryRestriction && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold mt-1">
                    <Utensils className="h-3.5 w-3.5 text-amber-700" />
                    <span>Dietary: {lastResult.dietaryRestriction}</span>
                  </div>
                )}

                {/* VIP Badge */}
                {lastResult.tierName && (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-100 text-purple-900 border border-purple-300 text-xs font-bold mt-1 ml-2">
                    <Crown className="h-3.5 w-3.5 text-purple-700" />
                    <span>Pass Tier: {lastResult.tierName}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLastResult(null)}
              className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
