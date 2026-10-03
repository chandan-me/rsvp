import { NextRequest, NextResponse } from "next/server";
import { liveSyncBus } from "@/lib/services/liveSync";
import { eventService } from "@/lib/services/eventService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const searchParams = req.nextUrl.searchParams;
  const since = parseInt(searchParams.get("since") || "0", 10);
  const stream = searchParams.get("stream") === "true";

  if (stream) {
    // SSE Stream
    const responseStream = new TransformStream();
    const writer = responseStream.writable.getWriter();
    const encoder = new TextEncoder();

    const unsubscribe = liveSyncBus.subscribe(eventId, (event) => {
      writer.write(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
    });

    req.signal.addEventListener("abort", () => {
      unsubscribe();
      writer.close();
    });

    // Send initial heartbeat
    writer.write(
      encoder.encode(
        `data: ${JSON.stringify({ type: "init", timestamp: Date.now(), eventId })}\n\n`
      )
    );

    return new Response(responseStream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  // Fast poll response
  const recentEvents = liveSyncBus.getRecent(eventId, since);
  const stats = await eventService.getEventStats(eventId);

  return NextResponse.json({
    events: recentEvents,
    stats,
    timestamp: Date.now(),
  });
}
