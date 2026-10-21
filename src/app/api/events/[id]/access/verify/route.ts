import { NextRequest, NextResponse } from "next/server";
import { accessRuleEngine } from "@/lib/services/accessRuleEngine";
import { rateLimiter } from "@/lib/services/rateLimiter";
import { eventService } from "@/lib/services/eventService";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Rate Limiting Protection (anti-brute-force: 60 scans/min per IP)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || "Terminal";
    const rateCheck = rateLimiter.check(`scan-verify:${id}:${clientIp}`, 60, 60000);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `RATE_LIMIT_EXCEEDED: Terminal scan velocity exceeded. Please wait ${rateCheck.retryAfterSeconds}s.`,
        },
        { status: 429 }
      );
    }

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
    const gate_key = body.gate_key || req.headers.get("x-gate-key");
    const device_info = body.device_info ? `${body.device_info} [${clientIp}]` : `${userAgent.slice(0, 40)} [${clientIp}]`;

    // Security Gate Key Check if provided
    if (gate_key) {
      const settings = await eventService.getEventSettings(id);
      const credentials = await eventService.getGateCredentials(id);
      const isValidKey =
        gate_key === settings.gate_access_key ||
        credentials.some((c) => c.passcode === gate_key || c.id === gate_key);
      if (!isValidKey) {
        return NextResponse.json(
          { success: false, error: "UNAUTHORIZED: Invalid gate security key or passcode." },
          { status: 401 }
        );
      }
    }

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

