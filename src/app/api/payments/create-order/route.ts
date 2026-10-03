import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/services/paymentService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event_id = body.event_id || body.eventId;
    const pass_type_id = body.pass_type_id || body.passTypeId;
    const guest_id = body.guest_id || body.guestId;
    const amount = body.amount;
    const currency = body.currency;

    if (!event_id || !amount) {
      return NextResponse.json(
        { error: "event_id and amount are required to create a payment order." },
        { status: 400 }
      );
    }

    const order = await paymentService.createOrder({
      eventId: event_id,
      guestId: guest_id,
      passTypeId: pass_type_id,
      amount: Number(amount),
      currency: currency || "INR",
    });

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to create payment order" },
      { status: 500 }
    );
  }
}
