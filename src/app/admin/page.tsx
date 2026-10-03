"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  ExternalLink,
  Users,
  Calendar,
  Layers,
} from "lucide-react";
import { PayoutRequest, AuditLog } from "@/types/database";

export default function PlatformAdminPage() {
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Rejection modal
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  async function loadData() {
    setLoading(true);
    setActionError(null);
    try {
      const [resPayouts, resLogs] = await Promise.all([
        fetch("/api/admin/payouts"),
        fetch("/api/admin/audit-logs"),
      ]);

      if (resPayouts.ok) {
        const pData = await resPayouts.json();
        setPayouts(pData.payoutRequests || []);
      }

      if (resLogs.ok) {
        const lData = await resLogs.json();
        setAuditLogs(lData.logs || []);
      }
    } catch (err: any) {
      console.error(err);
      setActionError("Failed to fetch admin data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleApprove(payoutId: string) {
    setProcessingId(payoutId);
    setActionError(null);
    setActionSuccess(null);
    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutRequestId: payoutId,
          action: "approve",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to approve payout");

      setActionSuccess(`Payout request ${payoutId} approved successfully.`);
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to approve payout");
    } finally {
      setProcessingId(null);
    }
  }

  async function handleRejectSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectingId) return;

    setProcessingId(rejectingId);
    setActionError(null);
    setActionSuccess(null);

    try {
      const res = await fetch("/api/admin/payouts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          payoutRequestId: rejectingId,
          action: "reject",
          reason: rejectionReason || "Rejected by administrator",
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject payout");

      setActionSuccess(`Payout request ${rejectingId} marked as rejected.`);
      setRejectingId(null);
      setRejectionReason("");
      await loadData();
    } catch (err: any) {
      setActionError(err.message || "Failed to reject payout");
    } finally {
      setProcessingId(null);
    }
  }

  const pendingPayouts = payouts.filter((p) => p.status === "pending");
  const approvedPayouts = payouts.filter((p) => p.status === "approved" || p.status === "paid");
  const totalPendingAmount = pendingPayouts.reduce((acc, p) => acc + p.amount, 0);

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-16">
      {/* Top Header */}
      <header className="bg-slate-50 border-b border-slate-200 px-6 py-4 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold shadow-sm">
              <ShieldCheck className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-slate-900 uppercase">
                  Platform Admin Console
                </h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-slate-200 text-slate-800 uppercase tracking-wider">
                  Superadmin
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Financial settlements & global audit logs</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            <Link
              href="/events"
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold transition shadow-sm"
            >
              Organizer Events
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 pt-8 space-y-8">
        {actionSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-700 text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {actionError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-red-700 text-xs hover:underline">
              Dismiss
            </button>
          </div>
        )}

        {/* Global Statistics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Pending Settlements
              </span>
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-700">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">
              ₹{totalPendingAmount.toLocaleString("en-IN")}
            </div>
            <p className="text-xs text-slate-500 mt-1">{pendingPayouts.length} client payout requests in queue</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Settled Payouts
              </span>
              <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700">
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{approvedPayouts.length} Approved</div>
            <p className="text-xs text-slate-500 mt-1">Transferred or processing directly</p>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                System Audit Events
              </span>
              <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-sky-700">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900">{auditLogs.length} Events</div>
            <p className="text-xs text-slate-500 mt-1">Immutable security ledger entries</p>
          </div>
        </div>

        {/* Section 1: Pending Client Payout Settlements */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Client Payout Settlement Queue</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review and approve withdrawal requests submitted by event organizers.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-800 rounded-md">
              {pendingPayouts.length} Action Needed
            </span>
          </div>

          {payouts.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
              <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No payout requests in the system</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                Client withdrawal requests will appear here for administrator clearance.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Request ID</th>
                    <th className="py-3 px-4">Event ID</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Beneficiary Bank</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payouts.map((req) => (
                    <tr key={req.id} className="hover:bg-slate-50/50">
                      <td className="py-3.5 px-4 font-mono text-xs text-slate-600">{req.id.slice(0, 10)}...</td>
                      <td className="py-3.5 px-4 text-xs font-mono text-sky-700">{req.event_id.slice(0, 12)}...</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900">₹{req.amount.toLocaleString("en-IN")}</td>
                      <td className="py-3.5 px-4 text-xs">
                        <div className="font-semibold text-slate-900">{req.bank_account_holder || "Organizer"}</div>
                        <div className="text-slate-500 font-mono">
                          IFSC: {req.bank_ifsc || "N/A"} •••• {req.bank_account_number_masked || "XXXX"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {req.status === "pending" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                            <Clock className="w-3.5 h-3.5" /> In Review
                          </span>
                        )}
                        {(req.status === "approved" || req.status === "paid") && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                          </span>
                        )}
                        {req.status === "rejected" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                            <XCircle className="w-3.5 h-3.5" /> Rejected
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        {req.status === "pending" ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              onClick={() => handleApprove(req.id)}
                              disabled={processingId === req.id}
                              className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-2xs cursor-pointer"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setRejectingId(req.id)}
                              disabled={processingId === req.id}
                              className="px-3 py-1 bg-white border border-red-300 text-red-700 hover:bg-red-50 rounded-lg text-xs font-bold transition cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Clear</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Immutable System Audit Logs */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Security & Operational Audit Logs</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Every permission grant, guest block/unblock, QR re-issuance, and module configuration change.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
              {auditLogs.length} Entries
            </span>
          </div>

          {auditLogs.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">No audit logs recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">Resource</th>
                    <th className="py-2.5 px-4">Actor</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {auditLogs.slice(0, 30).map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 text-xs">
                      <td className="py-2.5 px-4 font-mono font-bold text-slate-900">{log.action}</td>
                      <td className="py-2.5 px-4 font-mono text-slate-600">
                        {log.resource_type}: {log.resource_id?.slice(0, 10) || "N/A"}
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">
                        {log.actor_email || log.actor_id} ({log.actor_role || "system"})
                      </td>
                      <td className="py-2.5 px-4 font-mono text-slate-500">
                        {new Date(log.created_at).toLocaleString("en-IN")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Reject Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-2">Reject Payout Request</h3>
            <p className="text-xs text-slate-600 mb-4">
              Please enter the reason for rejecting payout request <span className="font-mono">{rejectingId}</span>.
            </p>
            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <textarea
                required
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Invalid bank IFSC code or account name mismatch"
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              />
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingId(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === rejectingId}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                >
                  {processingId === rejectingId && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
