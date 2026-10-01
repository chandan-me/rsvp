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
  Sparkles,
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

  // Audio synthesizer for check-in feedback
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
      // Audio autoplay restrictions
    }
  }

  // Gate Section / Attendance Checkpoint state
  const [activeSection, setActiveSection] = useState<string>("Main Entrance");
  const [isCustomSection, setIsCustomSection] = useState(false);
  const [customSectionInput, setCustomSectionInput] = useState("");

  const PRESET_SECTIONS = [
    "Main Entrance",
    "VIP Lounge",
    "Conference Hall",
    "Workshop Zone",
    "Dinner & Banquet",
  ];

  // Camera video stream handling with mobile fallback
  async function startCamera(overrideFacing?: "environment" | "user") {
    setCameraError(null);
    const mode = overrideFacing || facingMode;

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error(
          "Direct video stream requires a secure context (HTTPS) or device camera permission. Please ensure camera access is granted in browser settings."
        );
      }

      setIsCameraActive(true);

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
      } catch (e1) {
        console.warn("Ideal facingMode constraint failed, trying fallback:", e1);
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute("playsinline", "true");
        video.setAttribute("webkit-playsinline", "true");
        try {
          await video.play();
        } catch (playErr) {
          console.warn("Video play error:", playErr);
        }
        startScanning();
      }
    } catch (err: any) {
      console.warn("Camera start failed:", err);
      setIsCameraActive(false);
      setCameraError(
        err?.message ||
          "Unable to start live camera. Please grant camera permission in your browser or search attendee by ticket code or email."
      );
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
      const video = videoRef.current;
      if (video && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          if (ctx) {
            // Downsample video frames if too large for 60fps performance
            const maxW = 640;
            const scale = Math.min(1, maxW / video.videoWidth);
            const w = Math.round(video.videoWidth * scale);
            const h = Math.round(video.videoHeight * scale);

            canvas.width = w;
            canvas.height = h;
            ctx.drawImage(video, 0, 0, w, h);

            const imageData = ctx.getImageData(0, 0, w, h);
            const code = jsQR(imageData.data, w, h, {
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
      const chosenSection = isCustomSection && customSectionInput.trim() ? customSectionInput.trim() : activeSection;

      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          code_or_token: codeOrToken.trim(),
          method,
          pin: pin.trim() || undefined,
          checkpoint: chosenSection,
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
    <div className="space-y-4 sm:space-y-6">
      {/* Top Controller Bar */}
      <div className="flex items-center justify-between bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600 shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-xs sm:text-sm">Gate Ticket Scanner</h3>
            <p className="text-[11px] sm:text-xs text-slate-500">Scan QR pass or verify ticket code</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer border border-slate-200/80"
            title={soundEnabled ? "Mute audio cues" : "Enable audio cues"}
          >
            {soundEnabled ? <Volume2 className="h-4 w-4 text-emerald-600" /> : <VolumeX className="h-4 w-4 text-slate-400" />}
          </button>

          {/* Connect Mobile QR Modal Trigger */}
          <button
            type="button"
            onClick={openMobileModal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Open on your phone with QR code"
          >
            <Smartphone className="h-4 w-4 text-sky-600" />
            <span className="hidden sm:inline">Connect Mobile</span>
          </button>
        </div>
      </div>

      {/* Attendance Section / Gate Checkpoint Selector (Above Camera) */}
      <div className="rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-4 text-white shadow-md">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 mb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Active Attendance Section
            </span>
          </div>
          <span className="text-[11px] text-sky-400 font-medium">
            Logging attendance to: <strong className="text-white underline">{isCustomSection && customSectionInput ? customSectionInput : activeSection}</strong>
          </span>
        </div>

        {/* Section Pill Selectors */}
        <div className="flex flex-wrap gap-1.5 items-center">
          {PRESET_SECTIONS.map((section) => {
            const isSelected = !isCustomSection && activeSection === section;
            return (
              <button
                key={section}
                type="button"
                onClick={() => {
                  setIsCustomSection(false);
                  setActiveSection(section);
                }}
                className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-sky-500 text-white shadow-sm ring-2 ring-sky-300 ring-offset-1 ring-offset-slate-900"
                    : "bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700"
                }`}
              >
                {section}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsCustomSection(!isCustomSection)}
            className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              isCustomSection
                ? "bg-indigo-600 text-white shadow-sm ring-2 ring-indigo-300 ring-offset-1 ring-offset-slate-900"
                : "bg-slate-800/90 text-slate-400 hover:bg-slate-700 hover:text-slate-200 border border-slate-700"
            }`}
          >
            + Custom Section
          </button>
        </div>

        {isCustomSection && (
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              value={customSectionInput}
              onChange={(e) => setCustomSectionInput(e.target.value)}
              placeholder="e.g. Workshop Room 204, Speaker Green Room, Stage Door..."
              className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:border-sky-400 focus:outline-none"
            />
          </div>
        )}
      </div>

      {cameraError && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs text-amber-800 flex items-start gap-2.5">
          <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span className="font-semibold block mb-0.5">Camera Notice:</span>
            <p className="leading-relaxed">{cameraError}</p>
          </div>
        </div>
      )}

      {/* Main Camera / Standby Viewport */}
      <div className="relative overflow-hidden rounded-2xl border-2 border-slate-800 bg-slate-950 p-2 shadow-2xl">
        <div className="relative aspect-video max-h-[360px] mx-auto overflow-hidden rounded-xl bg-black flex items-center justify-center">
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            className={`h-full w-full object-cover ${isCameraActive ? "block" : "hidden"}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {isCameraActive ? (
            <>
              {/* Target Reticle */}
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-44 w-44 sm:h-52 sm:w-52 rounded-2xl border-2 border-sky-400 bg-sky-500/10 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] flex items-center justify-center">
                  <div className="h-36 w-36 sm:h-44 sm:w-44 border border-dashed border-sky-200/80 rounded-xl animate-pulse" />
                  <span className="absolute bottom-2 text-[10px] uppercase font-bold tracking-wider text-sky-200 bg-slate-900/90 px-2 py-0.5 rounded-full shadow-xs">
                    Align Ticket QR
                  </span>
                </div>
              </div>

              {/* Floating Camera Controls when Active */}
              <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                <button
                  type="button"
                  onClick={toggleCameraFlip}
                  className="rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors cursor-pointer flex items-center gap-1"
                  title="Switch camera"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Flip</span>
                </button>
                <button
                  type="button"
                  onClick={stopCamera}
                  className="rounded-xl bg-rose-600/90 backdrop-blur-md px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-500 transition-colors cursor-pointer flex items-center gap-1 shadow-sm"
                >
                  <CameraOff className="h-3.5 w-3.5" />
                  <span>Stop</span>
                </button>
              </div>
            </>
          ) : (
            /* Standby Card with Clear, Large Primary Action Buttons */
            <div className="text-center p-5 sm:p-8 space-y-4 w-full max-w-sm">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-sky-400 border border-slate-800 shadow-inner">
                <QrCode className="h-7 w-7" />
              </div>
              <div>
                <h4 className="text-sm sm:text-base font-bold text-white">Scanner Standby</h4>
                <p className="text-xs text-slate-400 mt-1">
                  Tap below to start the live camera scanner for attendees:
                </p>
              </div>
              <div className="flex items-center justify-center pt-2">
                <button
                  type="button"
                  onClick={() => startCamera()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-sky-600 px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-lg hover:bg-sky-500 active:scale-95 transition-all cursor-pointer"
                >
                  <Camera className="h-4 w-4" />
                  <span>Start Live Video Scanner</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry Bar */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-xs">
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
              Type ticket code (e.g. TK-E9XEAJ) or attendee email
            </span>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Enter ticket code (e.g. TK-E9XEAJ) or email"
                className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !manualCode.trim()}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-slate-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
          <div className="flex items-start gap-3">
            <div className="shrink-0 mt-0.5">
              {lastResult.success ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              ) : lastResult.code === "ALREADY_CHECKED_IN" ? (
                <AlertCircle className="h-6 w-6 text-amber-600" />
              ) : (
                <AlertCircle className="h-6 w-6 text-rose-600" />
              )}
            </div>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm tracking-wide uppercase">
                  {lastResult.success
                    ? "Check-In Approved"
                    : lastResult.code === "ALREADY_CHECKED_IN"
                    ? "Duplicate Check-In Detected"
                    : "Check-In Rejected"}
                </span>
                <button
                  type="button"
                  onClick={() => setLastResult(null)}
                  className="rounded-lg p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <p className="text-xs">{lastResult.message}</p>

              {lastResult.guest && (
                <div className="mt-3 pt-3 border-t border-black/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-bold block text-sm">
                      {lastResult.guest.first_name} {lastResult.guest.last_name}
                    </span>
                    <span className="text-[11px] opacity-80">{lastResult.guest.email}</span>
                  </div>

                  <div className="text-right">
                    <span className="font-mono text-xs font-bold block">
                      {lastResult.ticket?.ticket_code || "TICKET"}
                    </span>
                    <span className="text-[10px] uppercase font-semibold">
                      +{lastResult.guest.plus_ones_count} Guests
                    </span>
                  </div>
                </div>
              )}

              {lastResult.success && (
                <div className="mt-2.5 flex items-center justify-between text-[11px] font-semibold text-emerald-800 bg-emerald-100/70 px-3 py-1.5 rounded-xl border border-emerald-200">
                  <span>Attendance Recorded At:</span>
                  <span className="font-bold underline">{isCustomSection && customSectionInput ? customSectionInput : activeSection}</span>
                </div>
              )}

              {lastResult.code === "ALREADY_CHECKED_IN" && lastResult.alreadyCheckedInAt && (
                <div className="mt-2 text-[11px] font-medium text-amber-800 bg-amber-100/70 p-2 rounded-lg">
                  Previously checked in at: {new Date(lastResult.alreadyCheckedInAt).toLocaleTimeString()}
                </div>
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
              type="button"
              onClick={() => setShowMobileModal(false)}
              className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
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
