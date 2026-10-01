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
  Smartphone,
  QrCode,
  Upload,
  X,
} from "lucide-react";
import { CheckinResult } from "@/lib/services/checkinService";

interface CheckinScannerProps {
  eventId: string;
  onCheckinSuccess?: () => void;
}

export function CheckinScanner({ eventId, onCheckinSuccess }: CheckinScannerProps) {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [manualCode, setManualCode] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<CheckinResult | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [showMobileModal, setShowMobileModal] = useState(false);
  const [mobileQrDataUrl, setMobileQrDataUrl] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scanLoopRef = useRef<number | null>(null);
  const lastScannedCodeRef = useRef<string | null>(null);
  const scanCooldownRef = useRef<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
      // Audio autoplay restrictions or unsupported
    }
  }

  // Camera video stream handling
  async function startCamera(overrideFacing?: "environment" | "user") {
    setCameraError(null);
    const mode = overrideFacing || facingMode;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error(
          "Camera video streaming requires HTTPS or localhost. On mobile, please use the 'Snap Photo' camera icon button below!"
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: mode },
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
        err?.message ||
          "Unable to access live video stream. You can tap the Camera / Upload icon below to snap a photo of the QR code with your phone camera!"
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

  function toggleCameraFlip() {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    stopCamera();
    startCamera(nextMode);
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

  // Handle Photo Snap or File Image QR decoding
  function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          setLoading(false);
          return;
        }

        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code && code.data) {
          handleProcessCheckin(code.data, "qr_scan");
        } else {
          setLastResult({
            success: false,
            code: "TICKET_NOT_FOUND",
            message: "No QR code was detected in this photo. Please make sure the QR code is centered and clearly lit.",
          });
          playBeep("error");
          setLoading(false);
        }
      };
      img.src = event.target?.result as string;
    };

    reader.readAsDataURL(file);
    // Reset input
    e.target.value = "";
  }

  // Generate mobile connect QR
  async function openMobileModal() {
    setShowMobileModal(true);
    const targetUrl = "https://visits-filename-evident-affordable.trycloudflare.com/checkin";
    try {
      const res = await fetch(`/api/qr?text=${encodeURIComponent(targetUrl)}`);
      const d = await res.json();
      if (d.success) setMobileQrDataUrl(d.dataUrl);
    } catch (err) {
      console.error(err);
    }
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
      {/* Hidden File Input for Native Camera Photo Capture */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handleFileSelected}
        className="hidden"
      />

      {/* Top Controller Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-sm">Gate & Ticket Verification</h3>
            <p className="text-xs text-slate-500">Scan digital QR ticket, snap photo, or enter ticket code</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors"
            title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </button>

          {/* Connect Mobile Modal Trigger */}
          <button
            onClick={openMobileModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
            title="Open on your phone with QR code"
          >
            <Smartphone className="h-4 w-4 text-sky-600" />
            <span className="hidden sm:inline">Open on Mobile</span>
          </button>

          {/* Snap Photo Button (Works on all mobile devices even without HTTPS) */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors shadow-2xs"
            title="Snap photo with camera or upload image"
          >
            <Camera className="h-4 w-4 text-slate-700" />
            <span>Snap Photo</span>
          </button>

          {/* Live Video Camera Button */}
          {!isCameraActive ? (
            <button
              onClick={() => startCamera()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-sky-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-sky-500 transition-colors"
            >
              <Camera className="h-4 w-4" />
              <span>Live Video Scanner</span>
            </button>
          ) : (
            <div className="flex items-center gap-1.5">
              <button
                onClick={toggleCameraFlip}
                className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition-colors"
                title="Switch between front and back camera"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Flip</span>
              </button>
              <button
                onClick={stopCamera}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-700 transition-colors"
              >
                <CameraOff className="h-4 w-4" />
                <span>Stop</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {cameraError && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Camera Notice:</span>
            <p className="leading-relaxed">{cameraError}</p>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-amber-700 transition-colors"
              >
                <Camera className="h-3.5 w-3.5" />
                <span>Snap / Upload Photo Now</span>
              </button>
            </div>
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

      {/* Manual Entry Bar with Camera Icon Button */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleProcessCheckin(manualCode, "manual");
          }}
          className="space-y-3"
        >
          <div className="flex items-center justify-between">
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Manual Ticket / QR Code Lookup
            </label>
            <span className="text-[11px] text-slate-400">
              Type code or tap camera icon to scan
            </span>
          </div>

          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter ticket code (e.g. TK-SC-78912) or guest email/token"
                className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-11 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />

              {/* CAMERA ICON BUTTON INSIDE INPUT FIELD */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Tap to snap photo of QR code with camera"
                className="absolute right-2 top-1.5 p-1 rounded-lg text-slate-400 hover:text-sky-600 hover:bg-slate-100 transition-colors"
              >
                <Camera className="h-5 w-5" />
              </button>
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

      {/* Mobile Connect Modal */}
      {showMobileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="relative w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl text-center">
            <button
              onClick={() => setShowMobileModal(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-3">
              <Smartphone className="h-6 w-6" />
            </div>

            <h3 className="text-lg font-bold text-slate-900">Open on Your Mobile</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
              Scan this QR code with your phone camera to open this check-in gate directly on your phone:
            </p>

            <div className="my-5 flex justify-center">
              <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner">
                {mobileQrDataUrl ? (
                  <img
                    src={mobileQrDataUrl}
                    alt="Scan with phone"
                    className="h-44 w-44 object-contain rounded-lg"
                  />
                ) : (
                  <div className="h-44 w-44 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 text-left text-xs text-slate-600 space-y-1.5 border border-slate-200/80">
              <span className="font-semibold text-emerald-700 block text-[11px] uppercase tracking-wider">
                Direct Mobile HTTPS Link:
              </span>
              <a
                href="https://visits-filename-evident-affordable.trycloudflare.com/checkin"
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-sky-700 font-bold hover:underline break-all block"
              >
                https://visits-filename-evident-affordable.trycloudflare.com/checkin
              </a>
              <p className="text-[10px] text-slate-500 mt-1">
                Works on any mobile device anywhere with full camera permissions enabled!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
