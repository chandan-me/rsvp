import crypto from "crypto";
import { NextRequest } from "next/server";

// Fallback high-entropy secret if not configured in environment
const SERVER_AUTH_SECRET =
  process.env.AUTH_SECRET ||
  process.env.JWT_SECRET ||
  process.env.SESSION_SECRET ||
  "rsvp_prod_super_secure_hmac_secret_key_2026_981249712984";

export interface SessionPayload {
  userId: string;
  email: string;
  role: "admin" | "manager" | "client" | "employee";
  name: string;
  expiresAt: number; // timestamp in ms
}

export class SecurityService {
  private static instance: SecurityService;

  public static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  // =========================================================================
  // 1. PASSWORD SECURITY: Scrypt Hashing with Timing-Safe Verification
  // =========================================================================
  public async hashPassword(password: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(16).toString("hex");
      crypto.scrypt(password, salt, 64, (err, derivedKey) => {
        if (err) return reject(err);
        resolve(`${salt}:${derivedKey.toString("hex")}`);
      });
    });
  }

  public async verifyPassword(password: string, storedHash: string): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const [salt, key] = storedHash.split(":");
        if (!salt || !key) return resolve(false);

        crypto.scrypt(password, salt, 64, (err, derivedKey) => {
          if (err) return resolve(false);
          const keyBuffer = Buffer.from(key, "hex");
          if (keyBuffer.length !== derivedKey.length) return resolve(false);
          resolve(crypto.timingSafeEqual(keyBuffer, derivedKey));
        });
      } catch {
        resolve(false);
      }
    });
  }

  // =========================================================================
  // 2. CRYPTOGRAPHIC SESSION TOKENS (HMAC-SHA256 Signed & Sealed)
  // =========================================================================
  public createSignedSessionToken(payload: Omit<SessionPayload, "expiresAt">, durationMs: number = 7 * 24 * 60 * 60 * 1000): string {
    const sessionData: SessionPayload = {
      ...payload,
      expiresAt: Date.now() + durationMs,
    };
    const encodedPayload = Buffer.from(JSON.stringify(sessionData)).toString("base64url");
    const signature = crypto
      .createHmac("sha256", SERVER_AUTH_SECRET)
      .update(encodedPayload)
      .digest("base64url");
    return `${encodedPayload}.${signature}`;
  }

  public verifySignedSessionToken(tokenString: string): SessionPayload | null {
    if (!tokenString || typeof tokenString !== "string") return null;
    const parts = tokenString.split(".");
    if (parts.length !== 2) return null;

    const [encodedPayload, signature] = parts;
    const expectedSignature = crypto
      .createHmac("sha256", SERVER_AUTH_SECRET)
      .update(encodedPayload)
      .digest("base64url");

    // Timing-safe signature check
    try {
      const sigBuf = Buffer.from(signature);
      const expBuf = Buffer.from(expectedSignature);
      if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
        return null;
      }

      const decoded = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf-8")) as SessionPayload;
      if (!decoded.expiresAt || Date.now() > decoded.expiresAt) {
        return null; // Expired
      }
      return decoded;
    } catch {
      return null;
    }
  }

  // =========================================================================
  // 3. MULTI-FACTOR AUTHENTICATION: RFC 6238 TOTP (6-digit, 30s step)
  // =========================================================================
  public generateMfaSecret(): { secret: string; otpauthUrl: string } {
    const rawSecret = crypto.randomBytes(20);
    // Base32 encode
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let secret = "";
    let bits = 0;
    let value = 0;
    for (let i = 0; i < rawSecret.length; i++) {
      value = (value << 8) | rawSecret[i];
      bits += 8;
      while (bits >= 5) {
        secret += base32Chars[(value >>> (bits - 5)) & 31];
        bits -= 5;
      }
    }
    const otpauthUrl = `otpauth://totp/RSVP%20Pro:${encodeURIComponent("admin@platform.local")}?secret=${secret}&issuer=RSVP%20Pro`;
    return { secret, otpauthUrl };
  }

  public verifyTotp(token: string, secret: string, windowSteps: number = 1): boolean {
    if (!token || !secret) return false;
    const cleanToken = token.trim();
    if (!/^\d{6}$/.test(cleanToken)) return false;

    // Decode Base32 secret
    const base32Chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let bits = 0;
    let value = 0;
    const bytes: number[] = [];
    for (const char of secret.toUpperCase()) {
      const idx = base32Chars.indexOf(char);
      if (idx === -1) continue;
      value = (value << 5) | idx;
      bits += 5;
      if (bits >= 8) {
        bytes.push((value >>> (bits - 8)) & 255);
        bits -= 8;
      }
    }
    const secretBuffer = Buffer.from(bytes);

    const currentTimeStep = Math.floor(Date.now() / 1000 / 30);

    for (let step = -windowSteps; step <= windowSteps; step++) {
      const timeStep = currentTimeStep + step;
      const timeBuffer = Buffer.alloc(8);
      timeBuffer.writeBigInt64BE(BigInt(timeStep));

      const hmac = crypto.createHmac("sha1", secretBuffer).update(timeBuffer).digest();
      const offset = hmac[hmac.length - 1] & 0xf;
      const code =
        ((hmac[offset] & 0x7f) << 24) |
        ((hmac[offset + 1] & 0xff) << 16) |
        ((hmac[offset + 2] & 0xff) << 8) |
        (hmac[offset + 3] & 0xff);

      const computed = (code % 1000000).toString().padStart(6, "0");
      if (computed === cleanToken) {
        return true;
      }
    }
    return false;
  }

  // =========================================================================
  // 4. CSRF VALIDATION: Origin & Referer Verification for State-Changing Requests
  // =========================================================================
  public validateCsrf(req: NextRequest): { valid: boolean; reason?: string } {
    const method = req.method.toUpperCase();
    if (["GET", "HEAD", "OPTIONS"].includes(method)) {
      return { valid: true };
    }

    const host = req.headers.get("host") || "";
    const origin = req.headers.get("origin");
    const referer = req.headers.get("referer");

    // In Next.js server actions / API routes, verify Origin or Referer matches current host
    if (origin) {
      try {
        const originUrl = new URL(origin);
        if (originUrl.host === host || host.startsWith(originUrl.hostname)) {
          return { valid: true };
        }
        return { valid: false, reason: `Origin header ${origin} does not match host ${host}` };
      } catch {
        return { valid: false, reason: "Malformed Origin header" };
      }
    }

    if (referer) {
      try {
        const refererUrl = new URL(referer);
        if (refererUrl.host === host || host.startsWith(refererUrl.hostname)) {
          return { valid: true };
        }
        return { valid: false, reason: `Referer header ${referer} does not match host ${host}` };
      } catch {
        return { valid: false, reason: "Malformed Referer header" };
      }
    }

    // Direct same-origin requests or mobile/desktop API clients with valid custom API tokens
    return { valid: true };
  }

  // =========================================================================
  // 5. SSRF PROTECTION: Reject Loopback, Private IPs & Cloud Metadata
  // =========================================================================
  public validateSafeUrl(urlString: string): { safe: boolean; reason?: string } {
    try {
      const parsed = new URL(urlString);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return { safe: false, reason: "Forbidden protocol: only HTTP and HTTPS are permitted." };
      }

      const hostname = parsed.hostname.toLowerCase();

      // Check loopback / localhost
      if (
        hostname === "localhost" ||
        hostname.endsWith(".localhost") ||
        hostname === "127.0.0.1" ||
        hostname === "::1" ||
        hostname === "0.0.0.0"
      ) {
        return { safe: false, reason: "Loopback and localhost destinations are prohibited." };
      }

      // Check cloud metadata endpoints
      if (hostname === "169.254.169.254" || hostname === "metadata.google.internal") {
        return { safe: false, reason: "Cloud metadata service endpoints are prohibited." };
      }

      // Check private IPv4 address ranges (RFC 1918)
      const ipParts = hostname.split(".").map(Number);
      if (ipParts.length === 4 && ipParts.every((p) => !isNaN(p) && p >= 0 && p <= 255)) {
        // 10.0.0.0/8
        if (ipParts[0] === 10) return { safe: false, reason: "Private network access (10.0.0.0/8) is prohibited." };
        // 172.16.0.0/12
        if (ipParts[0] === 172 && ipParts[1] >= 16 && ipParts[1] <= 31)
          return { safe: false, reason: "Private network access (172.16.0.0/12) is prohibited." };
        // 192.168.0.0/16
        if (ipParts[0] === 192 && ipParts[1] === 168)
          return { safe: false, reason: "Private network access (192.168.0.0/16) is prohibited." };
        // 127.0.0.0/8
        if (ipParts[0] === 127) return { safe: false, reason: "Loopback range (127.0.0.0/8) is prohibited." };
      }

      return { safe: true };
    } catch {
      return { safe: false, reason: "Invalid destination URL." };
    }
  }

  // =========================================================================
  // 6. FILE UPLOAD SECURITY: Strict Whitelisting, Magic Bytes & Path Traversal Prevention
  // =========================================================================
  public validateFileUpload(file: {
    fileName: string;
    fileSize: number; // in bytes
    fileType: string;
    dataUrl?: string;
  }): { valid: boolean; error?: string; safeFileName?: string } {
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB limit
    if (file.fileSize > MAX_SIZE_BYTES) {
      return { valid: false, error: "File exceeds maximum permitted size of 5MB." };
    }

    // Sanitize file name against path traversal (../, \, null bytes)
    const baseName = file.fileName.replace(/^.*[\\\/]/, "").replace(/\0/g, "");
    const extMatch = baseName.match(/\.([0-9a-z]+)$/i);
    const ext = extMatch ? extMatch[1].toLowerCase() : "";

    // Prohibited dangerous extensions
    const dangerousExts = [
      "exe", "bat", "cmd", "sh", "php", "phtml", "jsp", "asp", "aspx", "cgi",
      "pl", "py", "jar", "msi", "vbs", "js", "ts", "html", "htm", "svg"
    ];
    if (dangerousExts.includes(ext)) {
      return { valid: false, error: `File type .${ext} is strictly prohibited for security reasons.` };
    }

    // Allowed extensions & corresponding MIME types
    const allowedTypes: Record<string, string[]> = {
      pdf: ["application/pdf"],
      png: ["image/png"],
      jpg: ["image/jpeg"],
      jpeg: ["image/jpeg"],
      webp: ["image/webp"],
    };

    if (!allowedTypes[ext]) {
      return { valid: false, error: "Only PDF documents and PNG/JPEG/WEBP images are permitted." };
    }

    if (!allowedTypes[ext].includes(file.fileType.toLowerCase())) {
      return { valid: false, error: "File extension does not match MIME type." };
    }

    // If data URL is provided, inspect magic bytes
    if (file.dataUrl && file.dataUrl.includes(",")) {
      const base64Content = file.dataUrl.split(",")[1];
      if (base64Content) {
        const buffer = Buffer.from(base64Content.slice(0, 64), "base64");
        if (ext === "pdf" && !buffer.toString("latin1").startsWith("%PDF")) {
          return { valid: false, error: "File signature mismatch: expected valid PDF file format." };
        }
        if (ext === "png" && !buffer.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
          return { valid: false, error: "File signature mismatch: expected valid PNG file format." };
        }
        if ((ext === "jpg" || ext === "jpeg") && (buffer[0] !== 0xff || buffer[1] !== 0xd8 || buffer[2] !== 0xff)) {
          return { valid: false, error: "File signature mismatch: expected valid JPEG file format." };
        }
      }
    }

    const safeFileName = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
    return { valid: true, safeFileName };
  }

  // =========================================================================
  // 7. WEBHOOK SIGNATURE VERIFICATION: HMAC-SHA256 & Timestamp Freshness
  // =========================================================================
  public verifyWebhookSignature(
    rawPayload: string | Buffer,
    signatureHeader: string,
    secret: string,
    maxAgeSeconds: number = 300 // 5-minute replay defense
  ): { valid: boolean; error?: string } {
    if (!signatureHeader || !secret) {
      return { valid: false, error: "Missing signature or secret." };
    }

    // Supports t=timestamp,v1=signature format (standard Stripe/Razorpay pattern)
    // or direct hex signature
    let timestamp = 0;
    let expectedSig = "";

    if (signatureHeader.includes("t=") && signatureHeader.includes("v1=")) {
      const parts = signatureHeader.split(",");
      for (const part of parts) {
        const [k, v] = part.split("=");
        if (k === "t") timestamp = parseInt(v, 10);
        if (k === "v1") expectedSig = v;
      }

      if (timestamp > 0) {
        const now = Math.floor(Date.now() / 1000);
        if (Math.abs(now - timestamp) > maxAgeSeconds) {
          return { valid: false, error: "Webhook timestamp expired (replay attack defense)." };
        }
      }

      const signedPayload = `${timestamp}.${typeof rawPayload === "string" ? rawPayload : rawPayload.toString("utf8")}`;
      const computed = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
      try {
        const a = Buffer.from(computed);
        const b = Buffer.from(expectedSig);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return { valid: false, error: "Webhook signature mismatch." };
        }
      } catch {
        return { valid: false, error: "Signature verification failed." };
      }
    } else {
      // Direct HMAC hex match
      const computed = crypto.createHmac("sha256", secret).update(rawPayload).digest("hex");
      try {
        const a = Buffer.from(computed);
        const b = Buffer.from(signatureHeader);
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
          return { valid: false, error: "Webhook signature mismatch." };
        }
      } catch {
        return { valid: false, error: "Signature verification failed." };
      }
    }

    return { valid: true };
  }

  // =========================================================================
  // 8. LOG SANITIZATION: Redact Passwords, Tokens, API Keys, Authorization Headers
  // =========================================================================
  public sanitizeForLogging(data: any): any {
    if (!data || typeof data !== "object") return data;

    const SENSITIVE_KEYS = [
      "password",
      "password_hash",
      "token",
      "secret",
      "mfa_secret",
      "auth_secret",
      "jwt_secret",
      "authorization",
      "cookie",
      "apikey",
      "api_key",
      "credit_card",
      "card_number",
      "cvv",
      "private_key",
    ];

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeForLogging(item));
    }

    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      if (SENSITIVE_KEYS.some((sk) => lowerKey.includes(sk))) {
        sanitized[key] = "[REDACTED_SENSITIVE]";
      } else if (typeof value === "object" && value !== null) {
        sanitized[key] = this.sanitizeForLogging(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }
}

export const securityService = SecurityService.getInstance();
