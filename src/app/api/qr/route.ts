import { NextRequest, NextResponse } from "next/server";
import { generateBrandedQrDataUrl, QrLogoType } from "@/lib/services/qrHelper";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  const logo = (searchParams.get("logo") || "ticket") as QrLogoType;
  const customLogoUrl = searchParams.get("custom_logo_url") || undefined;
  const darkColor = searchParams.get("color") || "#0f172a";

  if (!text) {
    return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
  }

  const dataUrl = await generateBrandedQrDataUrl(text, {
    logo,
    customLogoUrl,
    darkColor,
  });

  return NextResponse.json({
    success: true,
    dataUrl,
    logo,
    hasEmbeddedLogo: logo !== "none" || !!customLogoUrl,
  });
}
