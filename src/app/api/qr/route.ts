import { NextRequest, NextResponse } from "next/server";
import { generateBrandedQrDataUrl, generateBrandedQrSvg, QrLogoType } from "@/lib/services/qrHelper";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text");
  const logo = (searchParams.get("logo") || "ticket") as QrLogoType;
  const customLogoUrl = searchParams.get("custom_logo_url") || undefined;
  const darkColor = searchParams.get("color") || "#0f172a";
  const format = searchParams.get("format");

  if (!text) {
    return NextResponse.json({ error: "Missing text parameter" }, { status: 400 });
  }

  const acceptHeader = req.headers.get("accept") || "";
  const wantsRawImage =
    format === "image" ||
    format === "svg" ||
    format === "png" ||
    (acceptHeader.includes("image/") && !acceptHeader.includes("application/json"));

  if (wantsRawImage) {
    const svg = await generateBrandedQrSvg(text, {
      logo,
      customLogoUrl,
      darkColor,
    });

    return new NextResponse(svg, {
      status: 200,
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
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

