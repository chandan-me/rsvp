import { NextRequest, NextResponse } from "next/server";
import { guestService } from "@/lib/services/guestService";
import { guestSchema } from "@/lib/validations/guest";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);

    const search = searchParams.get("search") || undefined;
    const status = (searchParams.get("status") as any) || undefined;
    const checkedInOnly = searchParams.get("checkedIn") === "true";
    const notCheckedInOnly = searchParams.get("checkedIn") === "false";

    const guests = await guestService.getGuests(id, {
      search,
      status,
      checkedInOnly,
      notCheckedInOnly,
    });

    return NextResponse.json({ success: true, guests });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to fetch guests" },
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
    const validated = guestSchema.parse(body);
    const guest = await guestService.createGuest(id, validated);
    return NextResponse.json({ success: true, guest }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error?.message || "Failed to add guest" },
      { status: 400 }
    );
  }
}
