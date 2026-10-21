"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getVerifiedSession } from "@/lib/authClient";
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
  Activity,
  Menu,
  X,
} from "lucide-react";

export type AdminTabId =
  | "overview"
  | "config"
  | "guests"
  | "screening"
  | "tiers"
  | "questions"
  | "gate_hub"
  | "scan_logs"
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
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [currentUser, setCurrentUser] = useState<{ name: string; email: string; role: string }>({
    name: "Platform Host",
    email: "organizer@event.pro",
    role: userRole || "admin",
  });

  useEffect(() => {
    getVerifiedSession()
      .then((data) => {
        if (data?.authenticated && data.user) {
          setCurrentUser({
            name: data.user.name,
            email: data.user.email,
            role: data.user.role || userRole || "admin",
          });
        }
      })
      .catch(() => {});
  }, [userRole]);

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
      id: "scan_logs",
      label: "Gate Scans & Audit Logs",
      icon: Activity,
      visible: true,
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

  async function handleSignOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("rsvp_auth_session");
      sessionStorage.clear();
      window.dispatchEvent(new Event("auth_session_changed"));
    } catch {
      // ignore storage errors
    }
    window.location.replace("/login?signed_out=true");
  }

  const currentActiveItem = ALL_NAV_ITEMS.find((i) => i.id === activeTab);
  const CurrentIcon = currentActiveItem?.icon || LayoutGrid;

  return (
    <>
      {/* 1. Mobile Top Navigation Strip for < md */}
      <div className="md:hidden w-full bg-white border-b border-[#e7e1f8] px-4 py-2.5 flex items-center justify-between z-20 shrink-0 shadow-2xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-[#5e2ced] via-[#6e54e0] to-[#7c3aed] flex items-center justify-center text-white shadow-xs shrink-0">
            <CurrentIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#5e2ced] block">Section</span>
            <span className="text-xs font-extrabold text-slate-900 truncate block">
              {currentActiveItem?.label || "Overview"}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setMobileDrawerOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-[#f3effc] text-[#5e2ced] border border-[#e7e1f8] hover:bg-[#ede7fa] transition-colors cursor-pointer shadow-2xs"
        >
          <Menu className="h-3.5 w-3.5" />
          <span>Switch Tab ({NAV_ITEMS.length}) ▾</span>
        </button>
      </div>

      {/* 2. Mobile Modal / Bottom Sheet Drawer */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150">
          <div className="bg-white rounded-t-3xl max-h-[85vh] flex flex-col shadow-2xl border-t border-slate-200 animate-in slide-in-from-bottom duration-200">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-purple-50 text-[#5e2ced]">
                  <Sparkles className="h-4 w-4" />
                </span>
                <span className="font-extrabold text-sm text-slate-900">Event Sections &amp; Tools</span>
              </div>
              <button
                type="button"
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-full hover:bg-slate-100 text-slate-500 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 overflow-y-auto space-y-1 divide-y divide-slate-100">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl text-xs font-semibold transition cursor-pointer ${
                      isActive
                        ? "bg-sky-50 text-sky-950 font-bold border border-sky-300"
                        : "text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className={`h-4.5 w-4.5 ${isActive ? "text-sky-600" : "text-slate-500"}`} />
                      <span>{item.label}</span>
                    </div>
                    {item.badge !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* 3. Desktop Sidebar */}
      <aside
        className={`hidden md:flex bg-white border-r border-[#e7e1f8] flex-col shrink-0 transition-all duration-200 ease-in-out relative z-30 select-none ${
          collapsed ? "w-20" : "w-64 sm:w-72"
        }`}
      >
        {/* 1. Header with RSVP Purple Emblem & Collapse Toggle */}
        <div className="p-4 border-b border-[#e7e1f8] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-[#5e2ced] via-[#6e54e0] to-[#7c3aed] flex items-center justify-center text-white shadow-md shadow-purple-500/25 shrink-0 ring-2 ring-purple-100">
              <Sparkles className="h-5 w-5" />
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-extrabold tracking-tight text-[#191236] truncate uppercase">
                  {eventTitle || "RSVP"}
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#5e2ced] block">
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
          {/* Dynamic User Profile Card */}
          <div
            className={`rounded-2xl bg-white border border-slate-200 p-2.5 flex items-center gap-2.5 transition-all shadow-2xs ${
              collapsed ? "justify-center p-2" : ""
            }`}
          >
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 border border-sky-400 flex items-center justify-center text-white font-extrabold text-sm shrink-0 shadow-2xs">
              {(currentUser.name || "A").charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <h4 className="text-xs font-bold text-slate-900 truncate">{currentUser.name}</h4>
                  <span className="text-[9px] bg-sky-100 text-sky-800 px-1 py-0.2 rounded font-bold border border-sky-200 uppercase">
                    {currentUser.role}
                  </span>
                </div>
                <p className="text-[10px] text-slate-500 truncate" title={currentUser.email}>
                  {currentUser.email}
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
                Your authenticated session for <strong>{currentUser.name}</strong> will be securely invalidated.
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
