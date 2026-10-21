import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { paymentService } from "@/lib/services/paymentService";
import { auditService } from "@/lib/services/auditService";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-razorpay-signature") || "";
    const webhookSecret =
      process.env.RAZORPAY_WEBHOOK_SECRET ||
      process.env.RAZORPAY_KEY_SECRET ||
      "";

    // Verify webhook signature if secret is configured
    if (webhookSecret && !webhookSecret.includes("YOUR_") && signature) {
      const expectedSignature = crypto
        .createHmac("sha256", webhookSecret)
        .update(rawBody)
        .digest("hex");

      const a = Buffer.from(expectedSignature);
      const b = Buffer.from(signature);

      if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
        return NextResponse.json(
          { error: "Invalid Razorpay webhook signature." },
          { status: 400 }
        );
      }
    }

    let payload: any = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    const orderEntity = payload.payload?.order?.entity;

    if (paymentEntity && (event === "payment.captured" || event === "order.paid")) {
      const orderId = paymentEntity.order_id || orderEntity?.id;
      const paymentId = paymentEntity.id;

      if (orderId && paymentId) {
        await paymentService.recordTransaction({
          orderId,
          paymentId,
          method: paymentEntity.method || "razorpay_webhook",
          status: "captured",
        });

        await auditService.log({
          eventId: paymentEntity.notes?.eventId || "platform",
          actorId: "razorpay_webhook",
          action: "payment.webhook_captured",
          resourceType: "payment",
          resourceId: paymentId,
          newValues: { orderId, amount: paymentEntity.amount / 100 },
        });
      }
    } else if (event === "payment.failed" && paymentEntity) {
      const orderId = paymentEntity.order_id;
      const paymentId = paymentEntity.id;
      if (orderId) {
        await paymentService.recordTransaction({
          orderId,
          paymentId,
          method: paymentEntity.method || "razorpay_webhook",
          status: "failed",
        });
      }
    }

    return NextResponse.json({ status: "ok", received: true });
  } catch (err: any) {
    console.error("Razorpay webhook handler error:", err);
    return NextResponse.json(
      { error: err?.message || "Webhook processing error" },
      { status: 500 }
    );
  }
}
