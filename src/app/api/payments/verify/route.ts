import { NextRequest, NextResponse } from "next/server";
import { paymentService } from "@/lib/services/paymentService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { order_id, payment_id, signature, method } = body;

    if (!order_id || !payment_id) {
      return NextResponse.json(
        { error: "order_id and payment_id are required for verification." },
        { status: 400 }
      );
    }

    // Verify HMAC SHA256 signature server-side
    const isValid = paymentService.verifySignature(order_id, payment_id, signature || "");
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: "Payment signature verification failed. Untrusted transaction." },
        { status: 400 }
      );
    }

    const recordResult = await paymentService.recordTransaction({
      orderId: order_id,
      paymentId: payment_id,
      signature,
      method: method || "online",
      status: "captured",
    });

    if (!recordResult.success) {
      return NextResponse.json({ error: recordResult.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: "Payment successfully captured and verified.",
      transaction: recordResult.transaction,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to verify transaction" },
      { status: 500 }
    );
  }
}
