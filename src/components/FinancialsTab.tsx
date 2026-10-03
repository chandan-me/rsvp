"use client";

import { useEffect, useState } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ShieldAlert,
  Loader2,
  RefreshCw,
  Wallet,
  Receipt,
} from "lucide-react";
import { EventFinancialSummary, PayoutRequest } from "@/types/database";

interface FinancialsTabProps {
  eventId: string;
  userRole?: string;
}

export function FinancialsTab({ eventId, userRole }: FinancialsTabProps) {
  const [financials, setFinancials] = useState<EventFinancialSummary | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);

  // Payout request modal state
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [routingCode, setRoutingCode] = useState("");
  const [submittingPayout, setSubmittingPayout] = useState(false);
  const [payoutSuccessMsg, setPayoutSuccessMsg] = useState<string | null>(null);
  const [payoutErrorMsg, setPayoutErrorMsg] = useState<string | null>(null);

  async function loadFinancials() {
    setLoading(true);
    setError(null);
    setIsRestricted(false);

    try {
      const res = await fetch(`/api/events/${eventId}/financials`);
      if (res.status === 403) {
        setIsRestricted(true);
        setLoading(false);
        return;
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load financial records");
      }

      const data = await res.json();
      setFinancials(data.financials);

      // Load payout requests
      const payoutRes = await fetch(`/api/events/${eventId}/payout-request`);
      if (payoutRes.ok) {
        const pData = await payoutRes.json();
        setPayouts(pData.payoutRequests || []);
      }
    } catch (err: any) {
      console.error("Error loading financials:", err);
      setError(err.message || "Unable to fetch financial data");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadFinancials();
  }, [eventId]);

  async function handleRequestPayout(e: React.FormEvent) {
    e.preventDefault();
    setPayoutErrorMsg(null);
    setPayoutSuccessMsg(null);

    const amount = parseFloat(payoutAmount);
    if (isNaN(amount) || amount <= 0) {
      setPayoutErrorMsg("Please enter a valid withdrawal amount.");
      return;
    }

    if (financials && amount > financials.availableForWithdrawal) {
      setPayoutErrorMsg(
        `Withdrawal amount cannot exceed available balance of ₹${financials.availableForWithdrawal.toLocaleString("en-IN")}`
      );
      return;
    }

    setSubmittingPayout(true);
    try {
      const res = await fetch(`/api/events/${eventId}/payout-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          bankDetails: {
            accountName,
            bankName,
            accountNumber,
            routingCode,
          },
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit payout request");
      }

      setPayoutSuccessMsg("Payout request submitted successfully! Funds will be reviewed and transferred.");
      setShowPayoutModal(false);
      setPayoutAmount("");
      setAccountName("");
      setBankName("");
      setAccountNumber("");
      setRoutingCode("");
      await loadFinancials();
    } catch (err: any) {
      setPayoutErrorMsg(err.message || "Failed to submit payout request");
    } finally {
      setSubmittingPayout(false);
    }
  }

  // 1. Strict Financial Isolation Firewall Screen
  if (isRestricted || userRole === "manager" || userRole === "employee") {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center shadow-sm">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 text-amber-600">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Financial Access Restricted</h2>
          <p className="text-slate-600 max-w-md mx-auto text-sm leading-relaxed mb-6">
            Financial ledgers, ticket earnings, and settlement payouts are strictly restricted to Event Organizers and Platform Admins. Operations Managers and Field Staff have zero access to event revenue data.
          </p>
          <div className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 bg-slate-200/80 text-slate-700 rounded-lg">
            Role Policy: Strict RBAC Financial Isolation Active
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-sky-600 mb-3" />
        <p className="text-sm font-medium">Loading financial ledger...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800">
          <div className="flex items-center gap-3 mb-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            <h3 className="font-bold text-base">Error Loading Financials</h3>
          </div>
          <p className="text-sm text-red-700 mb-4">{error}</p>
          <button
            onClick={loadFinancials}
            className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 transition"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-sky-600" />
            Financial Ledger & Payouts
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time gross ticket sales, platform fee deductions, and withdrawal settlement status.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={loadFinancials}
            className="inline-flex items-center gap-2 px-3.5 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 transition shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button
            onClick={() => setShowPayoutModal(true)}
            disabled={!financials || financials.availableForWithdrawal <= 0}
            className="inline-flex items-center gap-2 px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition shadow-sm"
          >
            <ArrowUpRight className="w-4 h-4" />
            Request Payout
          </button>
        </div>
      </div>

      {payoutSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{payoutSuccessMsg}</span>
          </div>
          <button onClick={() => setPayoutSuccessMsg(null)} className="text-emerald-700 hover:underline text-xs">
            Dismiss
          </button>
        </div>
      )}

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Revenue */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Gross Sales</span>
            <div className="w-9 h-9 rounded-xl bg-sky-100 flex items-center justify-center text-sky-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{(financials?.grossRevenue || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-500 mt-1">Total revenue collected ({financials?.paidOrdersCount || 0} orders)</p>
        </div>

        {/* Platform Fee */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Platform Fee (5%)</span>
            <div className="w-9 h-9 rounded-xl bg-purple-100 flex items-center justify-center text-purple-600">
              <Receipt className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{(financials?.platformFees || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-500 mt-1">Gateway & management platform fee</p>
        </div>

        {/* Net Revenue */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Net Organiser Share</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ₹{(financials?.netRevenue || 0).toLocaleString("en-IN")}
          </div>
          <p className="text-xs text-slate-500 mt-1">Gross sales minus platform commission</p>
        </div>

        {/* Available Balance */}
        <div className="bg-sky-50 border border-sky-200 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-800">Available Payout</span>
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-sky-950">
            ₹{(financials?.availableForWithdrawal || 0).toLocaleString("en-IN")}
          </div>
          <div className="flex items-center justify-between text-xs text-sky-700 mt-1">
            <span>Withdrawn: ₹{(financials?.withdrawnAmount || 0).toLocaleString("en-IN")}</span>
            {financials?.pendingSettlement ? (
              <span className="text-amber-600 font-medium">Pending: ₹{financials.pendingSettlement.toLocaleString("en-IN")}</span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Settlement Payout History */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Withdrawal & Payout Requests</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Settlements requested to verified bank accounts. Direct bank transfers occur within 2-3 business days.
            </p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md">
            {payouts.length} Requests
          </span>
        </div>

        {payouts.length === 0 ? (
          <div className="text-center py-10 border border-dashed border-slate-200 rounded-xl bg-slate-50">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-700">No payout requests yet</p>
            <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
              Once tickets are sold and you have an available balance, you can request a settlement transfer here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="text-xs uppercase bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4">Request ID</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Beneficiary</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payouts.map((req) => (
                  <tr key={req.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-mono text-xs text-slate-600">{req.id.slice(0, 10)}...</td>
                    <td className="py-3 px-4 text-xs text-slate-600">
                      {new Date(req.requested_at).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{req.amount.toLocaleString("en-IN")}</td>
                    <td className="py-3 px-4 text-xs">
                      <div className="font-semibold text-slate-900">{req.bank_account_holder || "Organizer"}</div>
                      <div className="text-slate-500 font-mono">
                        IFSC: {req.bank_ifsc || "N/A"} •••• {req.bank_account_number_masked || "XXXX"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {req.status === "paid" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Paid
                        </span>
                      )}
                      {req.status === "approved" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-100 text-sky-800">
                          <Clock className="w-3.5 h-3.5" /> Processing
                        </span>
                      )}
                      {req.status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                          <Clock className="w-3.5 h-3.5" /> In Review
                        </span>
                      )}
                      {req.status === "rejected" && (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
                          <XCircle className="w-3.5 h-3.5" /> Rejected
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-500 max-w-xs truncate">
                      {req.admin_notes || "Standard settlement"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payout Request Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-5 h-5 text-sky-600" />
                Request Payout Transfer
              </h3>
              <button
                onClick={() => setShowPayoutModal(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                &times;
              </button>
            </div>

            {payoutErrorMsg && (
              <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {payoutErrorMsg}
              </div>
            )}

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  required
                  min="100"
                  max={financials?.availableForWithdrawal || 0}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder="e.g. 25000"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Max available: ₹{(financials?.availableForWithdrawal || 0).toLocaleString("en-IN")}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Account Beneficiary Name
                </label>
                <input
                  type="text"
                  required
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="e.g. ACME Events Pvt Ltd"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Name
                  </label>
                  <input
                    type="text"
                    required
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. HDFC Bank"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IFSC / SWIFT Code
                  </label>
                  <input
                    type="text"
                    required
                    value={routingCode}
                    onChange={(e) => setRoutingCode(e.target.value)}
                    placeholder="e.g. HDFC0001234"
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm uppercase focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Bank Account Number
                </label>
                <input
                  type="text"
                  required
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="e.g. 50100234567890"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingPayout}
                  className="px-5 py-2 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2"
                >
                  {submittingPayout && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
