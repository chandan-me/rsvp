import { NextRequest, NextResponse } from "next/server";
import { rsvpService } from "@/lib/services/rsvpService";
import { rsvpSubmissionSchema } from "@/lib/validations/rsvp";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const validated = rsvpSubmissionSchema.parse(body);

    const result = await rsvpService.submitRsvp(validated);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || "Failed to submit RSVP response",
      },
      { status: 400 }
    );
  }
}
