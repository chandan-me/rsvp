"use client";

import { useState } from "react";
import {
  ShieldCheck,
  Camera,
  Users,
  Radio,
  Sparkles,
  Smartphone,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { Event, EventSettings } from "@/types/database";
import { CheckinScanner } from "./CheckinScanner";
import { GateStationsTab } from "./GateStationsTab";

interface GateHubProps {
  eventId: string;
  event: Event;
  settings: EventSettings;
  checkedInCount: number;
}

export function GateHub({ eventId, event, settings, checkedInCount }: GateHubProps) {
  const [hubTab, setHubTab] = useState<"scanner" | "stations">("scanner");

  return (
    <div className="space-y-6">
      {/* 1. Unified Hub Header Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-[#f8fafc] p-5 sm:p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200/60">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                Gate & Check-In Hub
              </h2>
              <p className="text-xs text-slate-500">
                Multi-station check-in operations, staff credentials, and section tracking.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center bg-white p-1 rounded-xl border border-slate-200 shadow-2xs self-start md:self-auto">
          <button
            type="button"
            onClick={() => setHubTab("scanner")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              hubTab === "scanner"
                ? "bg-sky-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Check-In Terminal</span>
          </button>

          <button
            type="button"
            onClick={() => setHubTab("stations")}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              hubTab === "stations"
                ? "bg-sky-600 text-white shadow-xs font-bold"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Staff Passcodes & Stations</span>
          </button>
        </div>
      </div>

      {/* 2. Sub-views */}
      {hubTab === "scanner" ? (
        <CheckinScanner eventId={eventId} />
      ) : (
        <GateStationsTab eventId={eventId} event={event} settings={settings} />
      )}
    </div>
  );
}
