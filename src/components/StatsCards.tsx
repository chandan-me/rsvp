"use client";

import { Users, UserCheck, Clock, UserX, BarChart3, ShieldCheck } from "lucide-react";
import { EventStats } from "@/types/database";

interface StatsCardsProps {
  stats: EventStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {/* 1. Attending Headcount */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Attending Headcount
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            {stats.totalAttendeesCount}
          </span>
          <span className="text-xs text-slate-500">
            ({stats.attending} guests {stats.totalAttendeesCount - stats.attending > 0 ? `+ ${stats.totalAttendeesCount - stats.attending} plus-ones` : ""})
          </span>
        </div>
        {stats.capacityLimit && (
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-slate-500 mb-1">
              <span>Capacity ({stats.totalAttendeesCount}/{stats.capacityLimit})</span>
              <span>{Math.round((stats.totalAttendeesCount / stats.capacityLimit) * 100)}%</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.round((stats.totalAttendeesCount / stats.capacityLimit) * 100))}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. Check-In Rate */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Checked In
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
            <ShieldCheck className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            {stats.checkedInCount}
          </span>
          <span className="text-xs font-medium text-sky-600 bg-sky-50 px-2 py-0.5 rounded-full">
            {stats.checkinPercentage}% rate
          </span>
        </div>
        <div className="mt-3">
          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
            <span>Attendance Progress</span>
            <span>{stats.checkedInCount} of {stats.totalAttendeesCount || stats.attending}</span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-sky-500 rounded-full transition-all duration-500"
              style={{ width: `${stats.checkinPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* 3. Pending RSVPs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Awaiting Response
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
            <Clock className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            {stats.pending + stats.invited}
          </span>
          <span className="text-xs text-slate-500">
            ({stats.invited} invited, {stats.pending} pending)
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Reminders can be sent anytime via email or invitation link.
        </p>
      </div>

      {/* 4. Declined RSVPs */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Declined
          </span>
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
            <UserX className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-3xl font-bold tracking-tight text-slate-900">
            {stats.declined}
          </span>
          <span className="text-xs text-slate-500">
            guests unable to attend
          </span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Freed up spots can be given to waitlist or new invitees.
        </p>
      </div>
    </div>
  );
}
