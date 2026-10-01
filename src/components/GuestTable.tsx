"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  Download,
  Mail,
  UserPlus,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Ticket as TicketIcon,
  Trash2,
  Check,
  Copy,
  Loader2,
  ExternalLink,
} from "lucide-react";
import { Guest, GuestStatus } from "@/types/database";
import { AddGuestModal } from "./AddGuestModal";

interface EnhancedGuest extends Guest {
  isCheckedIn: boolean;
  checkinTime?: string;
  ticketCode?: string;
}

interface GuestTableProps {
  eventId: string;
  guests: EnhancedGuest[];
  onRefresh: () => void;
}

export function GuestTable({ eventId, guests, onRefresh }: GuestTableProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [sendingInviteId, setSendingInviteId] = useState<string | null>(null);
  const [checkingInId, setCheckingInId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkSendResult, setBulkSendResult] = useState<string | null>(null);

  // Client-side filtering for ultra-fast instant UI responsiveness
  const filteredGuests = guests.filter((guest) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      guest.first_name.toLowerCase().includes(q) ||
      guest.last_name.toLowerCase().includes(q) ||
      guest.email.toLowerCase().includes(q) ||
      (guest.ticketCode && guest.ticketCode.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (statusFilter === "all") return true;
    if (statusFilter === "checked_in") return guest.isCheckedIn;
    if (statusFilter === "not_checked_in") return !guest.isCheckedIn;
    return guest.status === statusFilter;
  });

  async function handleSendInvitation(guestId: string) {
    setSendingInviteId(guestId);
    try {
      const res = await fetch(`/api/events/${eventId}/invitations/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestIds: [guestId] }),
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSendingInviteId(null);
    }
  }

  async function handleBulkSend() {
    if (!confirm("Send invitation emails to all pending & invited guests?")) return;
    setIsBulkSending(true);
    setBulkSendResult(null);
    try {
      const res = await fetch(`/api/events/${eventId}/invitations/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (res.ok) {
        setBulkSendResult(`Sent invitations to ${data.result.sent} guests!`);
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkSending(false);
    }
  }

  async function handleQuickCheckin(guest: EnhancedGuest) {
    if (guest.isCheckedIn) return;
    setCheckingInId(guest.id);
    try {
      const res = await fetch("/api/checkin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_id: eventId,
          code_or_token: guest.qr_token,
          method: "manual",
        }),
      });
      const data = await res.json();
      if (data.success) {
        onRefresh();
      } else {
        alert(data.message || "Failed to check in");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCheckingInId(null);
    }
  }

  async function handleDeleteGuest(guestId: string, name: string) {
    if (!confirm(`Are you sure you want to remove ${name} from the event?`)) return;
    try {
      const res = await fetch(`/api/events/${eventId}/guests/${guestId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedCode(text);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  const getStatusBadge = (status: GuestStatus) => {
    switch (status) {
      case "attending":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-200/60">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
            <span>Attending</span>
          </span>
        );
      case "declined":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 border border-rose-200/60">
            <XCircle className="h-3.5 w-3.5 text-rose-600" />
            <span>Declined</span>
          </span>
        );
      case "invited":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-medium text-sky-700 border border-sky-200/60">
            <Mail className="h-3.5 w-3.5 text-sky-600" />
            <span>Invited</span>
          </span>
        );
      case "pending":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/60">
            <Clock className="h-3.5 w-3.5 text-amber-600" />
            <span>Pending</span>
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {bulkSendResult && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-800 flex items-center justify-between">
          <span>{bulkSendResult}</span>
          <button
            onClick={() => setBulkSendResult(null)}
            className="text-emerald-700 font-semibold hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or ticket code..."
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-2xs"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleBulkSend}
            disabled={isBulkSending}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs disabled:opacity-50"
          >
            {isBulkSending ? (
              <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
            ) : (
              <Send className="h-4 w-4 text-sky-600" />
            )}
            <span>Invite Pending</span>
          </button>

          <a
            href={`/api/events/${eventId}/guests/export`}
            download
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <Download className="h-4 w-4 text-slate-500" />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-slate-800 transition-colors"
          >
            <UserPlus className="h-4 w-4" />
            <span>Add Guest</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        {[
          { id: "all", label: `All Guests (${guests.length})` },
          {
            id: "attending",
            label: `Attending (${guests.filter((g) => g.status === "attending").length})`,
          },
          {
            id: "checked_in",
            label: `Checked In (${guests.filter((g) => g.isCheckedIn).length})`,
          },
          {
            id: "pending",
            label: `Pending (${guests.filter((g) => g.status === "pending").length})`,
          },
          {
            id: "invited",
            label: `Invited (${guests.filter((g) => g.status === "invited").length})`,
          },
          {
            id: "declined",
            label: `Declined (${guests.filter((g) => g.status === "declined").length})`,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`rounded-lg px-3 py-1.5 font-medium whitespace-nowrap transition-colors ${
              statusFilter === tab.id
                ? "bg-slate-900 text-white"
                : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Guest Table */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-100">
              <tr>
                <th scope="col" className="px-5 py-3.5">Guest</th>
                <th scope="col" className="px-4 py-3.5">RSVP Status</th>
                <th scope="col" className="px-4 py-3.5">Party Size</th>
                <th scope="col" className="px-4 py-3.5">Check-In</th>
                <th scope="col" className="px-4 py-3.5">Ticket / Token</th>
                <th scope="col" className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                    <p className="font-medium text-slate-700">No guests match your search or filter.</p>
                    <p className="text-xs text-slate-400 mt-1">Try modifying your search or click "Add Guest" to expand the roster.</p>
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Guest Name & Email */}
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-slate-900">
                        {guest.first_name} {guest.last_name}
                      </div>
                      <div className="text-xs text-slate-500">{guest.email}</div>
                      {guest.notes && (
                        <div className="text-[11px] text-amber-700 bg-amber-50 rounded px-1.5 py-0.5 inline-block mt-0.5">
                          {guest.notes}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {getStatusBadge(guest.status)}
                    </td>

                    {/* Party Size */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs text-slate-700">
                      {guest.status === "attending" ? (
                        <span className="font-medium">
                          1 {guest.plus_ones_count > 0 ? `+ ${guest.plus_ones_count}` : ""}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    {/* Check-In */}
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      {guest.isCheckedIn ? (
                        <div className="flex items-center gap-1.5 text-emerald-700 text-xs font-medium">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>
                            {guest.checkinTime
                              ? new Date(guest.checkinTime).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "Checked In"}
                          </span>
                        </div>
                      ) : guest.status === "attending" ? (
                        <button
                          onClick={() => handleQuickCheckin(guest)}
                          disabled={checkingInId === guest.id}
                          className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700 hover:bg-sky-100 transition-colors disabled:opacity-50"
                        >
                          {checkingInId === guest.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3" />
                          )}
                          <span>Check In</span>
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">Not Attending</span>
                      )}
                    </td>

                    {/* Ticket / Token */}
                    <td className="px-4 py-3.5 whitespace-nowrap text-xs font-mono">
                      {guest.ticketCode ? (
                        <div className="flex items-center gap-1.5">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">
                            {guest.ticketCode}
                          </span>
                          <button
                            onClick={() => copyToClipboard(guest.ticketCode!)}
                            title="Copy ticket code"
                            className="text-slate-400 hover:text-slate-600"
                          >
                            {copiedCode === guest.ticketCode ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">{guest.qr_token.slice(0, 12)}...</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleSendInvitation(guest.id)}
                          disabled={sendingInviteId === guest.id}
                          title="Send invitation email"
                          className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-sky-600 transition-colors disabled:opacity-50"
                        >
                          {sendingInviteId === guest.id ? (
                            <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
                          ) : (
                            <Mail className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() =>
                            handleDeleteGuest(guest.id, `${guest.first_name} ${guest.last_name}`)
                          }
                          title="Remove guest"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddGuestModal
        eventId={eventId}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onGuestAdded={onRefresh}
      />
    </div>
  );
}
