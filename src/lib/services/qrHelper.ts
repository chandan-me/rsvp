import QRCode from "qrcode";

export type QrLogoType = "ticket" | "shield" | "brand" | "calendar" | "custom" | "none";

export interface BrandedQrOptions {
  logo?: QrLogoType;
  customLogoUrl?: string;
  darkColor?: string;
  lightColor?: string;
  margin?: number;
  width?: number;
}

// Built-in crisp SVG badge paths for center QR logos
const LOGO_PATHS: Record<string, { fill: string; stroke: string; svgInner: string }> = {
  ticket: {
    fill: "#0284c7",
    stroke: "#38bdf8",
    svgInner: `
      <rect x="22" y="28" width="56" height="44" rx="8" fill="#0284c7" />
      <circle cx="22" cy="50" r="6" fill="#ffffff" />
      <circle cx="78" cy="50" r="6" fill="#ffffff" />
      <line x1="42" y1="36" x2="42" y2="64" stroke="#ffffff" stroke-width="3" stroke-dasharray="4 3" />
      <circle cx="60" cy="50" r="7" fill="#ffffff" opacity="0.9" />
    `,
  },
  shield: {
    fill: "#10b981",
    stroke: "#34d399",
    svgInner: `
      <path d="M50 20 L76 30 V52 C76 68 50 80 50 80 C50 80 24 68 24 52 V30 Z" fill="#10b981" />
      <path d="M42 49 L47 55 L58 43" fill="none" stroke="#ffffff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" />
    `,
  },
  brand: {
    fill: "#0ea5e9",
    stroke: "#38bdf8",
    svgInner: `
      <circle cx="50" cy="50" r="30" fill="#0f172a" />
      <path d="M50 28 L54 44 L70 50 L54 56 L50 72 L46 56 L30 50 L46 44 Z" fill="#38bdf8" />
      <circle cx="50" cy="50" r="4" fill="#ffffff" />
    `,
  },
  calendar: {
    fill: "#6366f1",
    stroke: "#818cf8",
    svgInner: `
      <rect x="24" y="26" width="52" height="48" rx="8" fill="#6366f1" />
      <path d="M24 38 H76" stroke="#ffffff" stroke-width="3" />
      <line x1="36" y1="20" x2="36" y2="28" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
      <line x1="64" y1="20" x2="64" y2="28" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
      <circle cx="38" cy="50" r="3" fill="#ffffff" />
      <circle cx="50" cy="50" r="3" fill="#ffffff" />
      <circle cx="62" cy="50" r="3" fill="#ffffff" />
      <circle cx="38" cy="61" r="3" fill="#ffffff" />
      <circle cx="50" cy="61" r="3" fill="#ffffff" />
      <circle cx="62" cy="61" r="3" fill="#ffffff" />
    `,
  },
};

/**
 * Generate a standard QR data URL
 */
export async function generateQrDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 320,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("Error generating standard QR code:", err);
    return "";
  }
}

/**
 * Generate a Branded QR Code with an embedded image/logo in the center.
 * Uses high error correction ("H") so 30% of data is redundant,
 * ensuring 100% reliable decodability by any scanner app.
 */
export async function generateBrandedQrSvg(
  text: string,
  options: BrandedQrOptions = {}
): Promise<string> {
  const {
    logo = "ticket",
    customLogoUrl,
    darkColor = "#0f172a",
    lightColor = "#ffffff",
    margin = 2,
  } = options;

  try {
    // Generate base QR as SVG string with High Error Correction
    const baseSvg = await QRCode.toString(text, {
      type: "svg",
      errorCorrectionLevel: "H",
      margin,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });

    if (logo === "none" && !customLogoUrl) {
      return baseSvg;
    }

    // Extract viewBox size to calculate center badge coordinates
    const viewBoxMatch = baseSvg.match(/viewBox="0 0 (\d+) (\d+)"/);
    const size = viewBoxMatch ? parseInt(viewBoxMatch[1], 10) : 100;

    // Center badge dimensions: ~22% of total QR size
    const badgeSize = Math.round(size * 0.23);
    const badgeX = Math.round((size - badgeSize) / 2);
    const badgeY = Math.round((size - badgeSize) / 2);
    const cornerRadius = Math.round(badgeSize * 0.22);

    let logoContent = "";

    if (customLogoUrl) {
      // Custom image URL embedded in SVG
      logoContent = `
        <image
          href="${customLogoUrl}"
          x="${badgeX + 2}"
          y="${badgeY + 2}"
          width="${badgeSize - 4}"
          height="${badgeSize - 4}"
          preserveAspectRatio="xMidYMid slice"
          clip-path="url(#badgeClip)"
        />
      `;
    } else {
      const preset = LOGO_PATHS[logo] || LOGO_PATHS.ticket;
      logoContent = `
        <svg
          x="${badgeX}"
          y="${badgeY}"
          width="${badgeSize}"
          height="${badgeSize}"
          viewBox="0 0 100 100"
        >
          ${preset.svgInner}
        </svg>
      `;
    }

    // Embed center badge with a clean white rounded backdrop + border
    const centerBadgeSvg = `
      <defs>
        <clipPath id="badgeClip">
          <rect x="${badgeX}" y="${badgeY}" width="${badgeSize}" height="${badgeSize}" rx="${cornerRadius}" />
        </clipPath>
        <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="1" stdDeviation="1.5" flood-color="#0f172a" flood-opacity="0.15" />
        </filter>
      </defs>
      <!-- Center Badge Backdrop -->
      <g id="qr-center-logo" filter="url(#badgeShadow)">
        <rect
          x="${badgeX}"
          y="${badgeY}"
          width="${badgeSize}"
          height="${badgeSize}"
          rx="${cornerRadius}"
          fill="${lightColor}"
          stroke="#e2e8f0"
          stroke-width="1.2"
        />
        ${logoContent}
      </g>
    `;

    // Inject before closing </svg>
    return baseSvg.replace("</svg>", `${centerBadgeSvg}</svg>`);
  } catch (err) {
    console.error("Error generating branded QR SVG:", err);
    return "";
  }
}

/**
 * Generates a data URL for a Branded QR Code (ready for <img src="...">)
 */
export async function generateBrandedQrDataUrl(
  text: string,
  options: BrandedQrOptions = {}
): Promise<string> {
  const svg = await generateBrandedQrSvg(text, options);
  if (!svg) return "";
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}
