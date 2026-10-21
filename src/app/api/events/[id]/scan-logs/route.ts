import { NextRequest, NextResponse } from "next/server";
import { accessRuleEngine } from "@/lib/services/accessRuleEngine";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const url = new URL(req.url);
    const limit = parseInt(url.searchParams.get("limit") || "100", 10);
    const result = url.searchParams.get("result") || "all";
    const checkpointId = url.searchParams.get("checkpointId") || "all";

    const [logsResult, headcount] = await Promise.all([
      accessRuleEngine.getScanLogs(id, { limit, result, checkpointId }),
      accessRuleEngine.getHeadcountStats(id),
    ]);

    return NextResponse.json({
      success: true,
      logs: logsResult.logs,
      total: logsResult.total,
      headcount,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Failed to load scan audit logs" },
      { status: 500 }
    );
  }
}
