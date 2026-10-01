import { NextRequest, NextResponse } from "next/server";
import { generateQrDataUrl } from "@/lib/services/qrHelper";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");

  if (!text) {
    return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
  }

  const dataUrl = await generateQrDataUrl(text);
  return NextResponse.json({ success: true, dataUrl });
}
