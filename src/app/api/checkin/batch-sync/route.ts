import { NextRequest, NextResponse } from "next/server";
import { checkinService } from "@/lib/services/checkinService";
import { liveSyncBus } from "@/lib/services/liveSync";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { event_id, scans } = body;

    if (!event_id || !Array.isArray(scans)) {
      return NextResponse.json(
        { error: "Invalid payload. Expected event_id and scans array." },
        { status: 400 }
      );
    }

    const results = [];
    let synced = 0;
    let failed = 0;

    for (const scan of scans) {
      const codeOrToken = scan.code_or_token || scan.token || scan.ticketCode || scan.ticket_code;
      if (!codeOrToken) continue;

      try {
        const res = await checkinService.processCheckin({
          eventId: event_id,
          codeOrToken,
          method: "qr_scan",
          checkpoint: scan.checkpoint || body.checkpoint || "Offline Cached Gate",
          operatorId: scan.gate_user_id || body.gate_user_id || "OFFLINE-STATION",
        });

        if (res.success) {
          synced++;
        } else {
          failed++;
        }
        results.push({ code: codeOrToken, success: res.success, message: res.message });
      } catch (err: any) {
        failed++;
        results.push({ code: codeOrToken, success: false, message: err?.message || "Sync failed" });
      }
    }

    if (synced > 0) {
      liveSyncBus.emit(event_id, "sync", { syncedCount: synced });
    }

    return NextResponse.json({
      success: true,
      synced,
      processed: synced + failed,
      failed,
      total: scans.length,
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal sync error" }, { status: 500 });
  }
}
