import { NextRequest, NextResponse } from "next/server";
import { accessRuleEngine } from "@/lib/services/accessRuleEngine";
import { authService } from "@/lib/services/authService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    const code_or_token = body.code_or_token || body.code || body.token;
    const checkpoint_type =
      body.checkpoint_type ||
      (body.gate_id ? "gate" : body.area_id ? "area" : body.section_id ? "section" : body.food_category_id ? "food" : "gate");
    const checkpoint_id =
      body.checkpoint_id || body.gate_id || body.area_id || body.section_id || body.food_category_id;
    const checkpoint_name = body.checkpoint_name;
    const scan_type = body.scan_type || "entry";
    const employee_id = body.employee_id;
    const device_info = body.device_info;

    if (!code_or_token) {
      return NextResponse.json(
        { success: false, error: "Missing required scan code or QR token." },
        { status: 400 }
      );
    }

    const decision = await accessRuleEngine.verifyAndProcess({
      eventId: id,
      codeOrToken: code_or_token,
      checkpointType: checkpoint_type,
      checkpointId: checkpoint_id,
      checkpointName: checkpoint_name,
      scanType: scan_type,
      employeeId: employee_id,
      deviceInfo: device_info,
    });

    return NextResponse.json({
      success: decision.allowed,
      decision,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || "Internal Access Engine Error" },
      { status: 500 }
    );
  }
}
