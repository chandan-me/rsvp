import { NextRequest, NextResponse } from "next/server";
import { checkinService } from "@/lib/services/checkinService";
import { checkinRequestSchema } from "@/lib/validations/checkin";
import { liveSyncBus } from "@/lib/services/liveSync";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = checkinRequestSchema.parse(body);

    const result = await checkinService.processCheckin({
      eventId: validated.event_id,
      codeOrToken: validated.code_or_token,
      method: validated.method,
      pin: validated.pin,
      checkpoint: validated.checkpoint,
      operatorId: validated.gate_user_id || validated.pin || null,
    });

    if (!result.success) {
      return NextResponse.json(result, { status: 400 });
    }

    liveSyncBus.emit(validated.event_id, "checkin", {
      guestName: `${result.guest?.first_name} ${result.guest?.last_name}`,
      ticketCode: result.ticket?.ticket_code,
      operatorId: validated.gate_user_id,
      checkpoint: validated.checkpoint || "Main Gate",
      checkinTime: result.checkin?.checkin_time,
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        code: "INVALID_REQUEST",
        message: error?.message || "Invalid check-in request",
      },
      { status: 400 }
    );
  }
}
