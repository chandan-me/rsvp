// ====================================================================
// RSVP Pro Offline Scanner & IndexedDB Persistence Engine
// Provides zero-trust offline ticket caching, duplicate checks,
// and automatic background sync when network returns.
// ====================================================================

export interface OfflineAttendee {
  token: string;
  ticketCode: string;
  guestName: string;
  email: string;
  tierName?: string;
  status: string;
  isCheckedIn: boolean;
  eventId: string;
}

export interface OfflineScanRecord {
  id?: number;
  eventId: string;
  codeOrToken: string;
  guestName?: string;
  checkpoint: string;
  gateUserId?: string;
  method: "qr_scan" | "manual";
  timestamp: string;
  synced: boolean;
}

const DB_NAME = "rsvp_pro_offline_db";
const DB_VERSION = 1;
const STORE_ATTENDEES = "cached_attendees";
const STORE_SCANS = "pending_scans";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("IndexedDB is not supported in this environment."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_ATTENDEES)) {
        const attendeeStore = db.createObjectStore(STORE_ATTENDEES, { keyPath: "token" });
        attendeeStore.createIndex("ticketCode", "ticketCode", { unique: false });
        attendeeStore.createIndex("eventId", "eventId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE_SCANS)) {
        const scanStore = db.createObjectStore(STORE_SCANS, { keyPath: "id", autoIncrement: true });
        scanStore.createIndex("eventId", "eventId", { unique: false });
        scanStore.createIndex("synced", "synced", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Preload and cache all attendee ticket tokens into IndexedDB for offline scanning.
 */
export async function cacheAttendeesForOffline(eventId: string): Promise<number> {
  try {
    const res = await fetch(`/api/events/${eventId}/guests`);
    if (!res.ok) return 0;
    const data = await res.json();
    const guests = data.guests || [];

    const db = await openDatabase();
    const tx = db.transaction(STORE_ATTENDEES, "readwrite");
    const store = tx.objectStore(STORE_ATTENDEES);

    let count = 0;
    for (const g of guests) {
      const name = `${g.first_name || ""} ${g.last_name || ""}`.trim() || "Guest";
      const token = (g.qr_token || g.ticket_code || "").toLowerCase().trim();
      const ticketCode = (g.ticket_code || g.qr_token || "").toLowerCase().trim();

      if (token) {
        const record: OfflineAttendee = {
          token,
          ticketCode,
          guestName: name,
          email: g.email || "",
          tierName: g.tier_name || "General Admission",
          status: g.status || "attending",
          isCheckedIn: Boolean(g.isCheckedIn),
          eventId,
        };
        store.put(record);
        count++;
      }
    }

    return count;
  } catch (err) {
    console.warn("Offline cache preload warning:", err);
    return 0;
  }
}

/**
 * Verifies a ticket code directly from IndexedDB when offline.
 */
export async function verifyTicketOffline(
  eventId: string,
  code: string,
  checkpoint: string,
  operatorUserId?: string
): Promise<{
  success: boolean;
  code: "CHECKIN_SUCCESS" | "ALREADY_CHECKED_IN" | "TICKET_NOT_FOUND" | "BLOCKED";
  message: string;
  guestName?: string;
  tierName?: string;
}> {
  try {
    const clean = code.trim().toLowerCase();
    const db = await openDatabase();

    // 1. Check if already recorded in pending offline scans for this event
    const scanTx = db.transaction(STORE_SCANS, "readonly");
    const scanStore = scanTx.objectStore(STORE_SCANS);
    const allScans: OfflineScanRecord[] = await new Promise((res, rej) => {
      const req = scanStore.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });

    const alreadyScanned = allScans.find(
      (s) => s.eventId === eventId && s.codeOrToken.toLowerCase() === clean
    );

    if (alreadyScanned) {
      return {
        success: false,
        code: "ALREADY_CHECKED_IN",
        message: `Already checked in offline at ${alreadyScanned.checkpoint} (${new Date(alreadyScanned.timestamp).toLocaleTimeString()}).`,
        guestName: alreadyScanned.guestName,
      };
    }

    // 2. Lookup attendee in cached tickets store
    const attendeeTx = db.transaction(STORE_ATTENDEES, "readonly");
    const attendeeStore = attendeeTx.objectStore(STORE_ATTENDEES);

    let match: OfflineAttendee | undefined = await new Promise((res) => {
      const req = attendeeStore.get(clean);
      req.onsuccess = () => res(req.result);
      req.onerror = () => res(undefined);
    });

    if (!match) {
      // Try searching by ticketCode index
      const index = attendeeStore.index("ticketCode");
      match = await new Promise((res) => {
        const req = index.get(clean);
        req.onsuccess = () => res(req.result);
        req.onerror = () => res(undefined);
      });
    }

    if (!match) {
      return {
        success: false,
        code: "TICKET_NOT_FOUND",
        message: `Offline pass "${code}" not found in local cache.`,
      };
    }

    if (match.status === "blocked") {
      return {
        success: false,
        code: "BLOCKED",
        message: `ACCESS DENIED: Attendee ${match.guestName} is blocked by event organizers.`,
        guestName: match.guestName,
      };
    }

    // Record offline scan into persistent queue
    await queueOfflineScan({
      eventId,
      codeOrToken: code.trim(),
      guestName: match.guestName,
      checkpoint,
      gateUserId: operatorUserId,
      method: "qr_scan",
      timestamp: new Date().toISOString(),
      synced: false,
    });

    return {
      success: true,
      code: "CHECKIN_SUCCESS",
      message: `Welcome, ${match.guestName}! (${checkpoint} — Verified Offline & Queued)`,
      guestName: match.guestName,
      tierName: match.tierName,
    };
  } catch (err: any) {
    return {
      success: false,
      code: "TICKET_NOT_FOUND",
      message: err?.message || "Failed to process offline check-in.",
    };
  }
}

/**
 * Queues an offline scan into IndexedDB.
 */
export async function queueOfflineScan(scan: OfflineScanRecord): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(STORE_SCANS, "readwrite");
  const store = tx.objectStore(STORE_SCANS);
  store.add(scan);
}

/**
 * Returns the count of pending scans in queue awaiting network upload.
 */
export async function getPendingScanCount(eventId: string): Promise<number> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_SCANS, "readonly");
    const store = tx.objectStore(STORE_SCANS);
    const scans: OfflineScanRecord[] = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });
    return scans.filter((s) => s.eventId === eventId && !s.synced).length;
  } catch {
    return 0;
  }
}

/**
 * Uploads all pending offline scans to the server when online.
 */
export async function flushOfflineScanQueue(
  eventId: string
): Promise<{ syncedCount: number; errors: number }> {
  try {
    const db = await openDatabase();
    const tx = db.transaction(STORE_SCANS, "readwrite");
    const store = tx.objectStore(STORE_SCANS);
    const scans: OfflineScanRecord[] = await new Promise((res, rej) => {
      const req = store.getAll();
      req.onsuccess = () => res(req.result || []);
      req.onerror = () => rej(req.error);
    });

    const pending = scans.filter((s) => s.eventId === eventId && !s.synced);
    if (pending.length === 0) return { syncedCount: 0, errors: 0 };

    let synced = 0;
    let errors = 0;

    for (const scan of pending) {
      try {
        const res = await fetch("/api/checkin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_id: scan.eventId,
            code_or_token: scan.codeOrToken,
            method: scan.method,
            checkpoint: scan.checkpoint,
            gate_user_id: scan.gateUserId,
          }),
        });

        if (res.ok) {
          scan.synced = true;
          if (scan.id !== undefined) {
            store.delete(scan.id);
          }
          synced++;
        } else {
          errors++;
        }
      } catch {
        errors++;
      }
    }

    return { syncedCount: synced, errors };
  } catch (err) {
    console.error("Flush offline scan queue error:", err);
    return { syncedCount: 0, errors: 0 };
  }
}
