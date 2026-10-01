import { NextRequest, NextResponse } from "next/server";
import { eventService } from "@/lib/services/eventService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const event = await eventService.getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const credentials = await eventService.getGateCredentials(id);
    const settings = await eventService.getEventSettings(id);

    return NextResponse.json({
      success: true,
      credentials,
      gate_access_key: settings.gate_access_key || `gk_${id.slice(0, 8)}`,
      master_pin: settings.checkin_pin,
    });
  } catch (err: any) {
    console.error("GET gate credentials error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load gate credentials" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { user_id, station_name, passcode, notes } = body;

    const event = await eventService.getEventById(id);
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    const newCred = await eventService.createGateCredential(id, {
      user_id,
      station_name,
      passcode,
      notes,
    });

    return NextResponse.json({
      success: true,
      credential: { ...newCred, checkinCount: 0 },
      message: `Gate staff account "${newCred.user_id}" created successfully.`,
    });
  } catch (err: any) {
    console.error("POST gate credentials error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to create gate credential" },
      { status: 500 }
    );
  }
}
