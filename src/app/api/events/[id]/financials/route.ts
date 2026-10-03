import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/lib/services/authService";
import { paymentService } from "@/lib/services/paymentService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await authService.getSessionUser(req);

    // 1. Financial Role Enforcement: Reject Manager and Employee immediately
    const finCheck = authService.assertFinancialAccess(user);
    if (!finCheck.allowed) {
      return NextResponse.json(
        {
          error: "FORBIDDEN: Operations managers and field employees are strictly prohibited from viewing financial data.",
          code: "FINANCIAL_ACCESS_DENIED",
        },
        { status: 403 }
      );
    }

    // 2. Event Resource Authorization: Client can only view their own event
    const authCheck = await authService.authorizeEvent(user, id, "client");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const financials = paymentService.getEventFinancialSummary(id);
    return NextResponse.json({
      success: true,
      financials,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load financial records" },
      { status: 500 }
    );
  }
}
