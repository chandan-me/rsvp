import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/services/dbProvider";
import { authService } from "@/lib/services/authService";
import { paymentService } from "@/lib/services/paymentService";

export async function GET(req: NextRequest) {
  try {
    const user = await authService.getSessionUser(req);
    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Access Denied: Platform Administrator privileges required." },
        { status: 403 }
      );
    }

    db.payoutRequests = db.payoutRequests || [];
    return NextResponse.json({
      success: true,
      payouts: db.payoutRequests,
      payoutRequests: db.payoutRequests,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load payouts" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await authService.getSessionUser(req);
    if (user?.role !== "admin") {
      return NextResponse.json(
        { error: "Access Denied: Platform Administrator privileges required." },
        { status: 403 }
      );
    }

    const body = await req.json();
    const payout_id = body.payout_id || body.payoutRequestId;
    const notes = body.notes || body.reason;
    const action = body.action || "approve";

    if (!payout_id) {
      return NextResponse.json({ error: "Missing payout_id parameter." }, { status: 400 });
    }

    let result;
    if (action === "reject") {
      result = await paymentService.rejectPayout(payout_id, user.id, notes);
    } else {
      result = await paymentService.approvePayout(payout_id, user.id, notes);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: action === "reject" ? "Payout request marked as rejected." : "Payout approved and settlement recorded.",
      payout: result.payout,
      payoutRequest: result.payout,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to process payout" }, { status: 500 });
  }
}
