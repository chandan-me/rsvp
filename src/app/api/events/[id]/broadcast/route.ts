import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";
import { guestService } from "@/lib/services/guestService";
import { notificationService } from "@/lib/notifications/service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;

  try {
    const body = await req.json();
    const { segment, subject, message } = body;

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 });
    }

    const event = await eventService.getEventById(eventId);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const allGuests = await guestService.getGuests(eventId);
    let targetGuests = allGuests;

    if (segment === "attending") {
      targetGuests = allGuests.filter((g) => g.status === "attending");
    } else if (segment === "not_checked_in") {
      targetGuests = allGuests.filter((g) => g.status === "attending" && !g.isCheckedIn);
    } else if (segment === "checked_in") {
      targetGuests = allGuests.filter((g) => g.isCheckedIn);
    } else if (segment === "waitlist") {
      targetGuests = allGuests.filter((g) => g.status === "waitlisted");
    } else if (segment === "pending_approval") {
      targetGuests = allGuests.filter((g) => g.status === "pending_approval");
    }

    let sent = 0;
    for (const guest of targetGuests) {
      if (!guest.email) continue;
      try {
        await notificationService.send({
          eventId,
          recipientEmail: guest.email,
          recipientName: `${guest.first_name} ${guest.last_name}`,
          notificationType: "reminder",
          subject,
          bodyText: `Hi ${guest.first_name},\n\n${message}\n\n— ${event.title} Operations`,
        });
        sent++;
      } catch (err) {
        console.error(`Failed to send broadcast to ${guest.email}:`, err);
      }
    }

    return NextResponse.json({
      success: true,
      sent,
      recipientCount: sent,
      totalTargeted: targetGuests.length,
      segment,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to dispatch broadcast" }, { status: 500 });
  }
}
