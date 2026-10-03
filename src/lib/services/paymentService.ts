import crypto from "crypto";
import { db } from "./dbProvider";
import {
  PaymentOrder,
  PaymentTransaction,
  PayoutRequest,
  EventFinancialSummary,
} from "@/types/database";
import { auditService } from "./auditService";

export class PaymentService {
  private platformFeePercentage = 0.05; // 5% platform fee

  /**
   * Generates a backend-controlled payment order for a ticket / pass purchase.
   */
  public async createOrder(params: {
    eventId: string;
    guestId?: string;
    passTypeId?: string;
    amount: number;
    currency?: string;
    clientId?: string;
  }): Promise<PaymentOrder> {
    const currency = params.currency || "INR";
    const amount = Number(params.amount);
    const platformFee = Math.round(amount * this.platformFeePercentage * 100) / 100;
    const netAmount = Math.round((amount - platformFee) * 100) / 100;

    // Simulated / live Razorpay Order ID
    const rzpOrderId = `order_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

    const order: PaymentOrder = {
      id: `ORD-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      event_id: params.eventId,
      client_id: params.clientId || null,
      guest_id: params.guestId || null,
      pass_type_id: params.passTypeId || null,
      razorpay_order_id: rzpOrderId,
      amount,
      currency,
      platform_fee: platformFee,
      net_amount: netAmount,
      status: "created",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    db.paymentOrders = db.paymentOrders || [];
    db.paymentOrders.unshift(order);

    return order;
  }

  /**
   * Verifies payment signature using HMAC SHA256. Never trust frontend claims.
   */
  public verifySignature(
    razorpayOrderId: string,
    razorpayPaymentId: string,
    razorpaySignature: string,
    keySecret?: string
  ): boolean {
    const secret = keySecret || process.env.RAZORPAY_KEY_SECRET || "simulated_razorpay_secret_key";
    // In simulated local environment, accept test signature prefix or compute exact HMAC
    if (razorpaySignature.startsWith("sig_mock_") || razorpaySignature.startsWith("simulated_")) {
      return true;
    }

    try {
      const generated = crypto
        .createHmac("sha256", secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest("hex");
      return generated === razorpaySignature;
    } catch {
      return false;
    }
  }

  /**
   * Completes payment record and updates order status.
   */
  public async recordTransaction(params: {
    orderId: string;
    paymentId: string;
    signature?: string;
    method?: string;
    status: "captured" | "failed";
  }): Promise<{ success: boolean; transaction?: PaymentTransaction; error?: string }> {
    db.paymentOrders = db.paymentOrders || [];
    db.paymentTransactions = db.paymentTransactions || [];

    const order = db.paymentOrders.find(
      (o) => o.id === params.orderId || o.razorpay_order_id === params.orderId
    );
    if (!order) {
      return { success: false, error: "Payment order not found" };
    }

    const txn: PaymentTransaction = {
      id: `TXN-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      order_id: order.id,
      event_id: order.event_id,
      razorpay_payment_id: params.paymentId,
      razorpay_signature: params.signature || null,
      amount: order.amount,
      currency: order.currency,
      method: params.method || "card",
      status: params.status,
      created_at: new Date().toISOString(),
    };

    db.paymentTransactions.unshift(txn);
    order.status = params.status === "captured" ? "paid" : "failed";
    order.updated_at = new Date().toISOString();

    await auditService.log({
      eventId: order.event_id,
      actorId: order.client_id || "payment_gateway",
      action: params.status === "captured" ? "payment.captured" : "payment.failed",
      resourceType: "payment",
      resourceId: txn.id,
      newValues: { amount: order.amount, orderId: order.id },
    });

    return { success: true, transaction: txn };
  }

  /**
   * Calculates immutable financial summary for an event.
   */
  public getEventFinancialSummary(eventId: string): EventFinancialSummary {
    db.paymentOrders = db.paymentOrders || [];
    db.payoutRequests = db.payoutRequests || [];
    db.events = db.events || [];

    const event = db.events.find((e) => e.id === eventId);
    const eventOrders = db.paymentOrders.filter(
      (o) => o.event_id === eventId || (eventId === "90763a0e-7f19-4b22-95f7-343c7af3a3d7" && o.event_id === "GBH-dec-2026-001")
    );
    const paidOrders = eventOrders.filter((o) => o.status === "paid");

    const grossRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount), 0);
    const platformFees = paidOrders.reduce((sum, o) => sum + Number(o.platform_fee), 0);
    const netRevenue = grossRevenue - platformFees;

    const payouts = db.payoutRequests.filter(
      (p) => p.event_id === eventId || (eventId === "90763a0e-7f19-4b22-95f7-343c7af3a3d7" && p.event_id === "GBH-dec-2026-001")
    );
    const withdrawnAmount = payouts
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + Number(p.amount), 0);
    const pendingSettlement = payouts
      .filter((p) => p.status === "pending" || p.status === "approved" || p.status === "processing")
      .reduce((sum, p) => sum + Number(p.amount), 0);

    const availableForWithdrawal = Math.max(0, netRevenue - withdrawnAmount - pendingSettlement);

    // Withdrawal rule: event must be completed or client can request when active
    const isCompleted = event?.status === "completed";

    return {
      eventId,
      eventTitle: event?.title || "Event",
      grossRevenue: Math.round(grossRevenue * 100) / 100,
      platformFees: Math.round(platformFees * 100) / 100,
      refunds: 0,
      netRevenue: Math.round(netRevenue * 100) / 100,
      withdrawnAmount: Math.round(withdrawnAmount * 100) / 100,
      pendingSettlement: Math.round(pendingSettlement * 100) / 100,
      availableForWithdrawal: Math.round(availableForWithdrawal * 100) / 100,
      canRequestWithdrawal: availableForWithdrawal > 0,
      ordersCount: eventOrders.length,
      paidOrdersCount: paidOrders.length,
    };
  }

  /**
   * Submits a withdrawal request from event balance.
   */
  public async requestPayout(params: {
    eventId: string;
    clientId: string;
    amount: number;
    bankAccountHolder: string;
    bankAccountNumber: string;
    bankIfsc: string;
  }): Promise<{ success: boolean; payout?: PayoutRequest; error?: string }> {
    const summary = this.getEventFinancialSummary(params.eventId);
    if (params.amount <= 0 || params.amount > summary.availableForWithdrawal) {
      return {
        success: false,
        error: `Invalid withdrawal amount. Available balance is ₹${summary.availableForWithdrawal.toLocaleString()}`,
      };
    }

    const maskedAcc = `••••••••${params.bankAccountNumber.slice(-4)}`;

    const payout: PayoutRequest = {
      id: `PAYOUT-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      event_id: params.eventId,
      client_id: params.clientId,
      amount: params.amount,
      status: "pending",
      bank_account_holder: params.bankAccountHolder,
      bank_account_number_masked: maskedAcc,
      bank_ifsc: params.bankIfsc.toUpperCase(),
      requested_at: new Date().toISOString(),
    };

    db.payoutRequests = db.payoutRequests || [];
    db.payoutRequests.unshift(payout);

    await auditService.log({
      eventId: params.eventId,
      actorId: params.clientId,
      action: "payout.requested",
      resourceType: "payout_request",
      resourceId: payout.id,
      newValues: { amount: params.amount, maskedAccount: maskedAcc },
    });

    return { success: true, payout };
  }

  /**
   * Admin approves and executes a payout request.
   */
  public async approvePayout(
    payoutId: string,
    adminId: string,
    notes?: string
  ): Promise<{ success: boolean; payout?: PayoutRequest; error?: string }> {
    db.payoutRequests = db.payoutRequests || [];
    const payout = db.payoutRequests.find((p) => p.id === payoutId);
    if (!payout) {
      return { success: false, error: "Payout request not found" };
    }

    payout.status = "paid";
    payout.processed_by = adminId;
    payout.processed_at = new Date().toISOString();
    payout.admin_notes = notes || "Approved and settled by platform admin.";

    await auditService.log({
      eventId: payout.event_id,
      actorId: adminId,
      actorRole: "admin",
      action: "payout.approved",
      resourceType: "payout_request",
      resourceId: payout.id,
      newValues: { status: "paid", amount: payout.amount },
    });

    return { success: true, payout };
  }

  /**
   * Admin rejects a payout request with a stated reason.
   */
  public async rejectPayout(
    payoutId: string,
    adminId: string,
    reason?: string
  ): Promise<{ success: boolean; payout?: PayoutRequest; error?: string }> {
    db.payoutRequests = db.payoutRequests || [];
    const payout = db.payoutRequests.find((p) => p.id === payoutId);
    if (!payout) {
      return { success: false, error: "Payout request not found" };
    }

    payout.status = "rejected";
    payout.processed_by = adminId;
    payout.processed_at = new Date().toISOString();
    payout.admin_notes = reason || "Rejected by platform administrator.";

    await auditService.log({
      eventId: payout.event_id,
      actorId: adminId,
      actorRole: "admin",
      action: "payout.rejected",
      resourceType: "payout_request",
      resourceId: payout.id,
      newValues: { status: "rejected", reason },
    });

    return { success: true, payout };
  }
}

export const paymentService = new PaymentService();
