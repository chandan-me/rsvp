"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Search,
  Download,
  Filter,
  Users,
  DoorOpen,
  Utensils,
  Laptop,
  Clock,
  Sparkles,
  ArrowRightLeft,
  ChevronDown,
  Info,
  Check,
  Activity,
  UserCheck,
} from "lucide-react";
import { ScanLog, Event } from "@/types/database";

interface EnrichedScanLog extends ScanLog {
  guest_name?: string;
  guest_email?: string;
  tier_name?: string;
  seating_assignment?: string;
}

interface HeadcountStats {
  totalGuests: number;
  checkedInCount: number;
  currentlyInside: number;
  currentlyOutside: number;
  totalScans: number;
  allowedScans: number;
  deniedScans: number;
  mealsRedeemed: number;
}

interface SecurityScanLogsTabProps {
  eventId: string;
  event: Event;
}

export function SecurityScanLogsTab({ eventId, event }: SecurityScanLogsTabProps) {
  const [logs, setLogs] = useState<EnrichedScanLog[]>([]);
  const [headcount, setHeadcount] = useState<HeadcountStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterResult, setFilterResult] = useState<"all" | "allowed" | "denied">("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(5000); // 5 seconds default
  const [isLiveActive, setIsLiveActive] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchLogs = async (silent = false) => {
    try {
      if (!silent) setRefreshing(true);
      const res = await fetch(`/api/events/${eventId}/scan-logs?limit=200`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setHeadcount(data.headcount || null);
      }
    } catch (err) {
      console.error("Failed to load scan audit logs:", err);
    } finally {
      setLoading(false);
      if (!silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [eventId]);

  // Live Auto-Refresh polling (throttled to 12s, pauses when tab is hidden)
  useEffect(() => {
    if (!isLiveActive || autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      fetchLogs(true);
    }, autoRefreshInterval);
    return () => clearInterval(interval);
  }, [eventId, isLiveActive, autoRefreshInterval]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (filterResult === "allowed" && log.result !== "ALLOWED") return false;
      if (filterResult === "denied" && log.result !== "DENIED") return false;
      if (filterType !== "all" && log.scan_type !== filterType) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        log.scanned_code.toLowerCase().includes(q) ||
        (log.guest_name && log.guest_name.toLowerCase().includes(q)) ||
        (log.guest_email && log.guest_email.toLowerCase().includes(q)) ||
        (log.denial_reason && log.denial_reason.toLowerCase().includes(q)) ||
        (log.tier_name && log.tier_name.toLowerCase().includes(q)) ||
        (log.seating_assignment && log.seating_assignment.toLowerCase().includes(q))
      );
    });
  }, [logs, filterResult, filterType, searchQuery]);

  // Export to CSV
  const handleExportCsv = () => {
    const headers = [
      "Scan ID",
      "Timestamp",
      "Result",
      "Scan Type",
      "Guest Name",
      "Email",
      "Ticket Tier",
      "Seating Assignment",
      "Scanned Code",
      "Denial Reason",
      "Station / Gate",
      "Device / IP",
    ];

    const escapeCsv = (val: string | null | undefined) => {
      if (!val) return '""';
      let str = String(val).replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(str)) str = `'${str}`;
      return `"${str}"`;
    };

    const rows = filteredLogs.map((l) => [
      escapeCsv(l.id),
      escapeCsv(new Date(l.scanned_at).toISOString()),
      escapeCsv(l.result),
      escapeCsv(l.scan_type),
      escapeCsv(l.guest_name),
      escapeCsv(l.guest_email),
      escapeCsv(l.tier_name),
      escapeCsv(l.seating_assignment),
      escapeCsv(l.scanned_code),
      escapeCsv(l.denial_reason),
      escapeCsv(l.gate_id || l.area_id || l.food_category_id || "Main Gate"),
      escapeCsv(l.device_info),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `security-scan-logs-${event.slug}-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & Live Indicator */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200/60">
              <Activity className="h-5 w-5" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  Gate Scans & Security Audit Logs
                </h2>
                {isLiveActive && (
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80 animate-pulse">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    LIVE SYNC
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Real-time gate verification events, anti-passback violations, access control alerts, and seating audit trail.
              </p>
            </div>
          </div>
        </div>

        {/* Live Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setIsLiveActive(!isLiveActive)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              isLiveActive
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
            }`}
          >
            <Activity className="h-3.5 w-3.5" />
            <span>{isLiveActive ? "Auto-Refresh ON" : "Auto-Refresh Paused"}</span>
          </button>

          <button
            type="button"
            onClick={() => fetchLogs(false)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-2xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-[#5e2ced] hover:bg-[#5225d3] text-white shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* 2. Key Headcount & Security Metrics Banner */}
      {headcount && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Currently Inside</span>
              <span className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <DoorOpen className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{headcount.currentlyInside}</span>
              <span className="text-xs text-slate-400">/ {headcount.totalGuests} registered</span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${headcount.totalGuests > 0 ? (headcount.currentlyInside / headcount.totalGuests) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Check-Ins</span>
              <span className="p-1.5 rounded-lg bg-sky-50 text-sky-600">
                <UserCheck className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{headcount.checkedInCount}</span>
              <span className="text-xs text-slate-400">
                ({headcount.totalGuests > 0 ? Math.round((headcount.checkedInCount / headcount.totalGuests) * 100) : 0}%)
              </span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-sky-500 h-1.5 rounded-full transition-all duration-500"
                style={{
                  width: `${headcount.totalGuests > 0 ? (headcount.checkedInCount / headcount.totalGuests) * 100 : 0}%`,
                }}
              />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Total Scans Evaluated</span>
              <span className="p-1.5 rounded-lg bg-purple-50 text-purple-600">
                <ShieldCheck className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900">{headcount.totalScans}</span>
              <span className="text-xs text-emerald-600 font-semibold">{headcount.allowedScans} allowed</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">All entry, exit, and zone checks</p>
          </div>

          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500">Security Denials</span>
              <span className={`p-1.5 rounded-lg ${headcount.deniedScans > 0 ? "bg-red-50 text-red-600" : "bg-slate-50 text-slate-400"}`}>
                <ShieldAlert className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className={`text-2xl font-black ${headcount.deniedScans > 0 ? "text-red-600" : "text-slate-900"}`}>
                {headcount.deniedScans}
              </span>
              <span className="text-xs text-slate-400">flags / passbacks</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Blocked, expired, or invalid</p>
          </div>
        </div>
      )}

      {/* 3. Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by attendee name, email, code, table, or denial reason..."
            className="w-full pl-9 pr-4 py-2 text-xs font-medium text-slate-800 placeholder-slate-400 bg-slate-50/80 border border-slate-200 rounded-xl focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setFilterResult("all")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterResult === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              All ({logs.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("allowed")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterResult === "allowed" ? "bg-emerald-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Allowed ({logs.filter((l) => l.result === "ALLOWED").length})
            </button>
            <button
              type="button"
              onClick={() => setFilterResult("denied")}
              className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                filterResult === "denied" ? "bg-red-600 text-white shadow-xs font-bold" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Denied ({logs.filter((l) => l.result === "DENIED").length})
            </button>
          </div>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20"
          >
            <option value="all">All Scan Types</option>
            <option value="entry">Entry</option>
            <option value="exit">Exit</option>
            <option value="re_entry">Re-Entry</option>
            <option value="food_redemption">Food & Catering</option>
          </select>
        </div>
      </div>

      {/* 4. Live Scans Table */}
      <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 uppercase tracking-wider font-bold text-[10px]">
                <th className="py-3 px-4">Status & Time</th>
                <th className="py-3 px-4">Attendee & Seating</th>
                <th className="py-3 px-4">Pass Tier</th>
                <th className="py-3 px-4">Scan Type</th>
                <th className="py-3 px-4">Ticket Token</th>
                <th className="py-3 px-4">Reason / Notes</th>
                <th className="py-3 px-4">Device & IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                    <span>Loading scan security audit stream...</span>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <ShieldCheck className="h-8 w-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-700">No scan activity found</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {searchQuery
                        ? "Try adjusting your search query or filters."
                        : "Scans from physical gate scanners and mobile staff terminals will stream here in real time."}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => {
                  const isAllowed = log.result === "ALLOWED";
                  const dateObj = new Date(log.scanned_at);
                  const timeFormatted = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

                  return (
                    <tr
                      key={log.id}
                      className={`hover:bg-slate-50/70 transition-colors ${!isAllowed ? "bg-red-50/20" : ""}`}
                    >
                      {/* 1. Status & Time */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {isAllowed ? (
                            <span className="p-1 rounded-full bg-emerald-100 text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span className="p-1 rounded-full bg-red-100 text-red-700">
                              <XCircle className="h-3.5 w-3.5" />
                            </span>
                          )}
                          <div>
                            <span
                              className={`inline-block font-bold text-[11px] ${
                                isAllowed ? "text-emerald-700" : "text-red-700"
                              }`}
                            >
                              {log.result}
                            </span>
                            <div className="text-[10px] text-slate-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{timeFormatted}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Attendee & Seating */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{log.guest_name || "Unregistered / Unknown"}</div>
                        {log.guest_email && <div className="text-[11px] text-slate-400">{log.guest_email}</div>}
                        {log.seating_assignment && (
                          <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200/50 mt-1">
                            <span>🪑 {log.seating_assignment}</span>
                          </div>
                        )}
                      </td>

                      {/* 3. Pass Tier */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                          {log.tier_name || "General Admission"}
                        </span>
                      </td>

                      {/* 4. Scan Type */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                            log.scan_type === "entry"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                              : log.scan_type === "exit"
                              ? "bg-slate-100 text-slate-700 border border-slate-200"
                              : log.scan_type === "food_redemption"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-purple-50 text-purple-700 border border-purple-200"
                          }`}
                        >
                          {log.scan_type === "food_redemption" ? (
                            <Utensils className="h-3 w-3" />
                          ) : log.scan_type === "exit" ? (
                            <ArrowRightLeft className="h-3 w-3" />
                          ) : (
                            <DoorOpen className="h-3 w-3" />
                          )}
                          <span>{log.scan_type.replace("_", " ")}</span>
                        </span>
                      </td>

                      {/* 5. Ticket Token */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(log.scanned_code, log.id)}
                          title="Click to copy ticket token"
                          className="font-mono text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-lg border border-slate-200/80 transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <span>{log.scanned_code.length > 18 ? log.scanned_code.slice(0, 18) + "…" : log.scanned_code}</span>
                          {copiedId === log.id ? <Check className="h-3 w-3 text-emerald-600" /> : null}
                        </button>
                      </td>

                      {/* 6. Reason / Notes */}
                      <td className="py-3 px-4 max-w-xs">
                        {isAllowed ? (
                          <span className="text-slate-600 text-[11px]">
                            {log.scan_type === "exit" ? "Checked out" : "Authorized entry"}
                          </span>
                        ) : (
                          <div className="flex items-start gap-1 text-red-600 font-semibold text-[11px]">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <span>{log.denial_reason || "Access rejected"}</span>
                          </div>
                        )}
                      </td>

                      {/* 7. Device & IP */}
                      <td className="py-3 px-4 whitespace-nowrap text-[11px] text-slate-400">
                        <div className="flex items-center gap-1">
                          <Laptop className="h-3 w-3 text-slate-400" />
                          <span>{log.device_info || "Terminal"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 text-slate-500 text-[11px] flex items-center justify-between">
          <span>
            Showing {filteredLogs.length} of {logs.length} logged scans
          </span>
          <span className="text-slate-400 font-mono text-[10px]">
            Security Audit Trail • Event ID: {eventId}
          </span>
        </div>
      </div>
    </div>
  );
}
