"use client";

import { useState, useRef, useEffect } from "react";
import jsQR from "jsqr";
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Clock,
  Search,
  Volume2,
  VolumeX,
  Loader2,
  Users,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { CheckinResult } from "@/lib/services/checkinService";

interface CheckinScannerProps {
  eventId: string;
  onCheckinSuccess?: () => void;
}

export function CheckinScanner({ eventId, onCheckinSuccess }: CheckinScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const scanCooldownRef = useRef<boolean>(false);

  // Audio tone synthesizer for tactile physical check-in feedback
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
        // High double-beep
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.08);
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.25);
      } else if (type === "duplicate") {
        // Low warning beep
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        osc.frequency.setValueAtTime(330, ctx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.35);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.35);
      } else {
        // Flat buzzer
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(220, ctx.currentTime);
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch {
      // Audio autoplay restrictions or unsupported
    }
  }

  // Camera video stream handling
  async function startCamera() {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute("playsinline", "true");
        await videoRef.current.play();
        setIsCameraActive(true);
        startScanning();
      }
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setCameraError(
        err?.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access in browser settings or use manual code entry."
          : "Unable to access camera device. Please use manual code entry below."
      );
      setIsCameraActive(false);
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
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code && code.data && !scanCooldownRef.current) {
              if (code.data !== lastScannedCodeRef.current) {
                lastScannedCodeRef.current = code.data;
                scanCooldownRef.current = true;
                handleProcessCheckin(code.data, "qr_scan");

                // Cooldown for 2 seconds to avoid rapid duplicate scans of same physical QR code
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

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  async function handleProcessCheckin(codeOrToken: string, method: "qr_scan" | "manual") {
    if (!codeOrToken.trim()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          code_or_token: codeOrToken.trim(),
          method,
          pin: pin.trim() || undefined,
        }),
      });

      const data: CheckinResult = await res.json();
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
      setLastResult({
        success: false,
        code: "TICKET_NOT_FOUND",
        message: err?.message || "Failed to process check-in",
      });
      playBeep("error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Gate & Ticket Verification</h3>
            <p className="text-xs text-slate-500">Scan digital QR ticket or enter ticket token</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {!isCameraActive ? (
            <button
              onClick={startCamera}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition-colors"
            >
              <Camera className="h-4 w-4" />
              <span>Start Camera Scanner</span>
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
            >
              <CameraOff className="h-4 w-4" />
              <span>Stop Camera</span>
            </button>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Notice: </span>
            {cameraError}
          </div>
        </div>
      )}

      {/* Camera Viewport */}
      {isCameraActive && (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-sky-400 bg-slate-950 p-2 shadow-inner">
          <div className="relative aspect-video max-h-[360px] mx-auto overflow-hidden rounded-xl bg-black flex items-center justify-center">
            <video ref={videoRef} className="h-full w-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />

            {/* Target Reticle */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-48 w-48 rounded-2xl border-2 border-sky-400 bg-sky-500/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] flex items-center justify-center">
                <div className="h-40 w-40 border border-dashed border-sky-200/80 rounded-xl animate-pulse" />
                <span className="absolute bottom-2 text-[10px] uppercase font-bold tracking-wider text-sky-200 bg-slate-900/80 px-2 py-0.5 rounded-full">
                  Align QR Code
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Entry Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessCheckin(manualCode, "manual");
          }}
          className="space-y-3"
        >
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Manual Ticket / QR Code Lookup
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter ticket code (e.g. TK-SC-78912) or guest email/token"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !manualCode.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>Verify & Check In</span>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Real-time Verification Result Banner */}
      {lastResult && (
        <div
          className={`rounded-2xl p-5 border transition-all animate-in fade-in slide-in-from-top-2 duration-200 ${
            lastResult.success
              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
              : lastResult.code === "ALREADY_CHECKED_IN"
              ? "bg-amber-50 border-amber-300 text-amber-900"
              : "bg-rose-50 border-rose-300 text-rose-900"
          }`}
        >
          <div className="flex items-start gap-3.5">
            {lastResult.success ? (
              <CheckCircle2 className="h-7 w-7 text-emerald-600 shrink-0 mt-0.5" />
            ) : lastResult.code === "ALREADY_CHECKED_IN" ? (
              <Clock className="h-7 w-7 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-7 w-7 text-rose-600 shrink-0 mt-0.5" />
            )}

            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-bold">
                  {lastResult.success
                    ? "Check-In Verified!"
                    : lastResult.code === "ALREADY_CHECKED_IN"
                    ? "Warning: Duplicate Check-In Detected"
                    : "Verification Failed"}
                </h4>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-white/70">
                  {lastResult.code}
                </span>
              </div>

              <p className="mt-1 text-sm font-medium">{lastResult.message}</p>

              {/* Guest Card Details */}
              {lastResult.guest && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white/80 p-3 rounded-xl border border-black/5 text-xs text-slate-800">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Attendee</span>
                    <span className="font-semibold text-slate-900">
                      {lastResult.guest.first_name} {lastResult.guest.last_name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Email</span>
                    <span className="truncate block font-mono">{lastResult.guest.email}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Party Size</span>
                    <span className="font-semibold">
                      1 {lastResult.guest.plus_ones_count > 0 ? `+ ${lastResult.guest.plus_ones_count} plus-ones` : ""}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Ticket Code</span>
                    <span className="font-mono font-semibold">
                      {lastResult.ticket?.ticket_code || lastResult.guest.qr_token}
                    </span>
                  </div>
                </div>
              )}

              {lastResult.code === "ALREADY_CHECKED_IN" && lastResult.alreadyCheckedInAt && (
                <p className="mt-2 text-xs text-amber-800 italic">
                  Note: Attendee was already marked as present at{" "}
                  {new Date(lastResult.alreadyCheckedInAt).toLocaleString()}. Duplicate badge was blocked.
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
