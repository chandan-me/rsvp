"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LayoutGrid,
  Users,
  CheckSquare,
  Tags,
  HelpCircle,
  ShieldCheck,
  Mail,
  Printer,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sparkles,
  ExternalLink,
  Shield,
  Lock,
  SlidersHorizontal,
  Wallet,
} from "lucide-react";

export type AdminTabId =
  | "overview"
  | "config"
  | "guests"
  | "screening"
  | "tiers"
  | "questions"
  | "gate_hub"
  | "financials"
  | "broadcast"
  | "badges"
  | "settings";

interface AdminSidebarProps {
  activeTab: AdminTabId;
  setActiveTab: (tab: AdminTabId) => void;
  eventTitle: string;
  eventSlug: string;
  guestCount: number;
  pendingCount: number;
  tierCount: number;
  questionCount: number;
  checkedInCount: number;
  enabledModules?: string[];
  userRole?: string;
}

export function AdminSidebar({
  activeTab,
  setActiveTab,
  eventTitle,
  eventSlug,
  guestCount,
  pendingCount,
  tierCount,
  questionCount,
  checkedInCount,
  enabledModules,
  userRole,
}: AdminSidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Progressive Disclosure: Filter tabs based on event's active modules & user role
  const isModuleActive = (mod: string) => !enabledModules || enabledModules.includes(mod);
  const isFinancialRestricted = userRole === "manager" || userRole === "employee";

  const ALL_NAV_ITEMS: {
    id: AdminTabId;
    label: string;
    icon: any;
    badge?: number;
    badgeColor?: "orange" | "amber" | "emerald";
    visible: boolean;
  }[] = [
    { id: "overview", label: "Dashboard", icon: LayoutGrid, visible: true },
    {
      id: "config",
      label: "Modules & Topography",
      icon: SlidersHorizontal,
      visible: userRole !== "employee",
    },
    { id: "guests", label: "Guest Roster", icon: Users, badge: guestCount, badgeColor: "orange", visible: true },
    {
      id: "screening",
      label: "Tasks & Screening",
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: "amber",
      visible: isModuleActive("rsvp") || isModuleActive("qr_access"),
    },
    {
      id: "tiers",
      label: "Ticket Tiers",
      icon: Tags,
      badge: tierCount,
      badgeColor: "orange",
      visible: isModuleActive("pass_types") || isModuleActive("payments"),
    },
    {
      id: "questions",
      label: "RSVP Questions",
      icon: HelpCircle,
      badge: questionCount,
      badgeColor: "orange",
      visible: isModuleActive("rsvp"),
    },
    {
      id: "gate_hub",
      label: "Gate & Check-In Hub",
      icon: ShieldCheck,
      badge: checkedInCount > 0 ? checkedInCount : undefined,
      badgeColor: "emerald",
      visible: isModuleActive("gates") || isModuleActive("qr_access") || isModuleActive("areas"),
    },
    {
      id: "financials",
      label: "Financial Ledger",
      icon: Wallet,
      visible: isModuleActive("payments") && !isFinancialRestricted,
    },
    { id: "broadcast", label: "Email Broadcasts", icon: Mail, visible: isModuleActive("rsvp") },
    { id: "badges", label: "Name Badges Studio", icon: Printer, visible: true },
    { id: "settings", label: "Event Settings", icon: Settings, visible: userRole !== "employee" },
  ];

  const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => item.visible);

  function handleSignOut() {
    try {
      localStorage.removeItem("rsvp_auth_session");
      sessionStorage.clear();
    } catch {
      // ignore storage errors
    }
    router.push("/login?signed_out=true");
  }

  return (
    <>
      <aside
        className={`bg-white border-r border-slate-200 flex flex-col shrink-0 transition-all duration-200 ease-in-out relative z-30 select-none ${
          collapsed ? "w-20" : "w-64 sm:w-72"
        }`}
      >
        {/* 1. Header with Sky Blue Emblem & Collapse Toggle */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-sky-500 via-sky-600 to-sky-700 flex items-center justify-center text-white shadow-md shadow-sky-500/25 shrink-0 ring-2 ring-sky-200/50">
              <Sparkles className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-extrabold tracking-tight text-slate-900 truncate uppercase">
                  {eventTitle || "RSVP PRO"}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest text-sky-600 block">
                  ADMIN PANEL
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? "Expand navigation" : "Collapse navigation"}
            className="h-7 w-7 rounded-full border border-slate-200 bg-white hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-800 shadow-2xs transition-colors shrink-0 cursor-pointer"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* 2. Navigation Menu Items (Sky Blue active state, whitesmoke hover) */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1.5 scrollbar-thin scrollbar-thumb-slate-200">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveTab(item.id)}
                title={collapsed ? item.label : undefined}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer relative group ${
                  isActive
                    ? "bg-sky-50 text-sky-950 font-bold border border-sky-300 shadow-xs"
                    : "text-slate-600 hover:bg-[#f8fafc] hover:text-slate-900"
                } ${collapsed ? "justify-center px-0" : ""}`}
              >
                <Icon
                  className={`h-4.5 w-4.5 shrink-0 transition-colors ${
                    isActive ? "text-sky-600" : "text-slate-500 group-hover:text-slate-800"
                  }`}
                />

                {!collapsed && (
                  <span className="flex-1 text-left truncate">{item.label}</span>
                )}

                {!collapsed && item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold rounded-full shrink-0 shadow-2xs ${
                      item.badgeColor === "emerald"
                        ? "bg-emerald-600 text-white"
                        : item.badgeColor === "amber"
                        ? "bg-amber-500 text-white"
                        : "bg-sky-600 text-white"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}

                {/* Collapsed Tooltip on Hover */}
                {collapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-[11px] font-medium rounded-lg shadow-lg whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                    {item.label}
                    {item.badge !== undefined && (
                      <span className="ml-1.5 px-1.5 py-0.2 bg-sky-600 text-white text-[9px] font-bold rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Bottom Profile Card & High-Security Sign Out */}
        <div className="p-3 border-t border-slate-200/80 bg-[#f8fafc] space-y-2">
          {/* User Profile Card */}
          <div
            className={`rounded-2xl bg-white border border-slate-200 p-2.5 flex items-center gap-2.5 transition-all shadow-2xs ${
              collapsed ? "justify-center p-2" : ""
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-sky-100 border border-sky-300 flex items-center justify-center text-sky-800 font-extrabold text-sm shrink-0 shadow-2xs">
              C
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">Chandan N</h4>
                  <span className="text-[9px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold border border-sky-200">
                    Admin
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate" title="chandan2004.n@gmail.com">
                  chandan2004.n@gmail.com
                </p>
              </div>
            )}
          </div>

          {/* High-Security Sign Out Button */}
          <button
            type="button"
            onClick={() => setShowSignOutConfirm(true)}
            title={collapsed ? "Sign Out" : undefined}
            className={`w-full rounded-xl border border-rose-200 bg-rose-50/70 hover:bg-rose-100/90 text-rose-700 font-bold text-xs py-2 px-3 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-2xs ${
              collapsed ? "p-2" : ""
            }`}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* High-Security Sign Out Confirmation Modal */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="h-12 w-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Lock className="h-6 w-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-bold text-slate-900">Sign Out of Admin Panel?</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Your authenticated session for <strong>Chandan N</strong> will be securely invalidated.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSignOutConfirm(false)}
                className="rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-xl bg-rose-600 py-2 text-xs font-semibold text-white hover:bg-rose-500 shadow-xs cursor-pointer"
              >
                Sign Out Now
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
