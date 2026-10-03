import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/authService";
import { paymentService } from "@/lib/services/paymentService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await authService.getSessionUser(req);

    const finCheck = authService.assertFinancialAccess(user);
    if (!finCheck.allowed) {
      return NextResponse.json({ error: finCheck.error }, { status: 403 });
    }

    const authCheck = await authService.authorizeEvent(user, id, "client");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await req.json();
    const amount = body.amount;
    const bank_account_holder = body.bank_account_holder || body.bankDetails?.accountName || "Event Organizer";
    const bank_account_number = body.bank_account_number || body.bankDetails?.accountNumber || "50100234567890";
    const bank_ifsc = body.bank_ifsc || body.bankDetails?.routingCode || "HDFC0001234";

    if (!amount) {
      return NextResponse.json(
        { error: "Withdrawal amount is required." },
        { status: 400 }
      );
    }

    const result = await paymentService.requestPayout({
      eventId: id,
      clientId: user?.id || "client",
      amount: Number(amount),
      bankAccountHolder: bank_account_holder,
      bankAccountNumber: bank_account_number,
      bankIfsc: bank_ifsc,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Withdrawal request submitted successfully. Awaiting platform administrator settlement.",
      payout: result.payout,
      payoutRequest: result.payout,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to submit withdrawal request" },
      { status: 500 }
    );
  }
}
