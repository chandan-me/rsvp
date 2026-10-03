import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  try {
    const tiers = await eventService.getTicketTiers(eventId);
    return NextResponse.json({ tiers });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to load tiers" }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  try {
    const body = await req.json();
    if (!body.name || !body.capacity) {
      return NextResponse.json({ error: "Name and capacity are required." }, { status: 400 });
    }

    const tier = await eventService.createTicketTier(eventId, {
      name: body.name,
      description: body.description,
      capacity: Number(body.capacity),
      badge_color: body.badge_color || "sky",
      price: body.price ? Number(body.price) : 0,
    });

    return NextResponse.json({ success: true, tier }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed to create tier" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: eventId } = await params;
  const { searchParams } = req.nextUrl;
  const tierId = searchParams.get("tierId");

  if (!tierId) {
    return NextResponse.json({ error: "tierId is required" }, { status: 400 });
  }

  const success = await eventService.deleteTicketTier(eventId, tierId);
  return NextResponse.json({ success });
}
