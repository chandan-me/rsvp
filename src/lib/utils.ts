import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Generates an enterprise-grade professional identifier:
 * [ALL FIRST LETTERS OF EVENT]-[month]-[year]-[number/tag]
 * Example:
 *   "google build hackonth", "december 2026" -> GBH-dec-2026-4821
 *   "Global AI Summit", "2026-10-15" -> GAS-oct-2026-7291
 */
export function generateProfessionalId(
  eventTitle: string = "Event",
  dateString?: string | Date | null,
  suffix?: string | number
): string {
  // Extract first letter of each significant word (all uppercase)
  const cleanTitle = eventTitle.trim();
  const words = cleanTitle
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter(
      (w) =>
        w.length > 0 &&
        !/^\d+$/.test(w) &&
        !["and", "or", "the", "of", "in", "at", "for", "a", "an"].includes(w.toLowerCase())
    );

  let acronym = words.map((w) => w[0].toUpperCase()).join("");
  if (!acronym || acronym.length < 2) {
    const lettersOnly = cleanTitle.replace(/[^a-zA-Z]/g, "").toUpperCase();
    acronym = lettersOnly.slice(0, 3) || "EVT";
  }

  // Extract lowercase 3-letter month and 4-digit year
  const d = dateString ? new Date(dateString) : new Date();
  const validDate = isNaN(d.getTime()) ? new Date() : d;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const mon = months[validDate.getMonth()];
  const year = validDate.getFullYear();

  // Suffix number or entity tag
  let tag = "";
  if (typeof suffix === "number") {
    tag = suffix.toString();
  } else if (typeof suffix === "string" && suffix.trim().length > 0) {
    tag = suffix.trim();
  } else {
    tag = Math.floor(1000 + Math.random() * 9000).toString();
  }

  return `${acronym}-${mon}-${year}-${tag}`;
}

export function generateTicketCode(
  eventTitleOrPrefix: string = "TK",
  dateString?: string | Date | null
): string {
  if (eventTitleOrPrefix.length > 4) {
    return generateProfessionalId(eventTitleOrPrefix, dateString);
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let randomPart = "";
  for (let i = 0; i < 5; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${eventTitleOrPrefix}-${randomPart}`;
}

export function generateQrToken(
  eventTitle?: string,
  dateString?: string | Date | null
): string {
  if (eventTitle) {
    return generateProfessionalId(eventTitle, dateString);
  }
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "TOKEN-";
  for (let i = 0; i < 8; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

export function formatDate(dateString: string, timezone?: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString: string, timezone?: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatTime(dateString: string, timezone?: string): string {
  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: timezone || "UTC",
    }).format(date);
  } catch {
    return dateString;
  }
}

export function createIcsCalendarUrl(event: {
  title: string;
  description?: string | null;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
}): string {
  const formatIcsDate = (date: Date) => {
    return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  };

  const start = new Date(event.startDate);
  const end = event.endDate
    ? new Date(event.endDate)
    : new Date(start.getTime() + 3 * 60 * 60 * 1000); // 3 hours default

  const icsData = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//RSVP SaaS//Event Calendar//EN",
    "BEGIN:VEVENT",
    `SUMMARY:${event.title.replace(/[,;]/g, " ")}`,
    `DESCRIPTION:${(event.description || "").replace(/\n/g, "\\n").replace(/[,;]/g, " ")}`,
    `LOCATION:${(event.location || "").replace(/[,;]/g, " ")}`,
    `DTSTART:${formatIcsDate(start)}`,
    `DTEND:${formatIcsDate(end)}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  return `data:text/calendar;charset=utf8,${encodeURIComponent(icsData)}`;
}

export function createGoogleCalendarUrl(event: {
  title: string;
  description?: string | null;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
}): string {
  const formatGCalDate = (date: Date) => {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
  };

  const start = new Date(event.startDate);
  const end = event.endDate
    ? new Date(event.endDate)
    : new Date(start.getTime() + 3 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatGCalDate(start)}/${formatGCalDate(end)}`,
    details: event.description || "",
    location: event.location || "",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
