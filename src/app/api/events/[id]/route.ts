import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";
import { authService } from "@/lib/services/authService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await eventService.getEventById(id);
    if (!event) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }

    // Public events can be read; if private/draft, require authorization
    if (!event.is_published) {
      const user = await authService.getSessionUser(req);
      const auth = await authService.authorizeEvent(user, id, "employee");
      if (!auth.authorized) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
      }
    }

    const [stats, settings] = await Promise.all([
      eventService.getEventStats(id, event),
      eventService.getEventSettings(id),
    ]);

    return NextResponse.json({ success: true, event, stats, settings });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch event" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Server-side BOLA/IDOR protection
    const user = await authService.getSessionUser(req);
    const auth = await authService.authorizeEvent(user, id, "client");
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const updated = await eventService.updateEvent(id, body);
    if (!updated) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, event: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to update event" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Server-side BOLA/IDOR protection
    const user = await authService.getSessionUser(req);
    const auth = await authService.authorizeEvent(user, id, "client");
    if (!auth.authorized) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const deleted = await eventService.deleteEvent(id);
    if (!deleted) {
      return NextResponse.json({ success: false, error: "Event not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true, message: "Event deleted successfully" });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to delete event" },
      { status: 500 }
    );
  }
}
