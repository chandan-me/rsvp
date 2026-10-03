export interface LiveSyncEvent {
  id: string;
  eventId: string;
  type: "checkin" | "rsvp" | "approval" | "decline" | "tier_update" | "sync";
  timestamp: number;
  data?: any;
}

class LiveSyncBus {
  private events: LiveSyncEvent[] = [];
  private listeners: Map<string, Set<(event: LiveSyncEvent) => void>> = new Map();

  public emit(eventId: string, type: LiveSyncEvent["type"], data?: any) {
    const event: LiveSyncEvent = {
      id: `ls_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`,
      eventId,
      type,
      timestamp: Date.now(),
      data,
    };

    this.events.unshift(event);
    if (this.events.length > 200) {
      this.events.pop();
    }

    const eventListeners = this.listeners.get(eventId);
    if (eventListeners) {
      eventListeners.forEach((callback) => {
        try {
          callback(event);
        } catch (err) {
          console.error("LiveSync callback error:", err);
        }
      });
    }

    return event;
  }

  public subscribe(eventId: string, callback: (event: LiveSyncEvent) => void): () => void {
    if (!this.listeners.has(eventId)) {
      this.listeners.set(eventId, new Set());
    }
    const set = this.listeners.get(eventId)!;
    set.add(callback);

    return () => {
      set.delete(callback);
    };
  }

  public getRecent(eventId: string, sinceTimestamp = 0): LiveSyncEvent[] {
    return this.events.filter(
      (e) => e.eventId === eventId && e.timestamp > sinceTimestamp
    );
  }
}

const globalForSync = globalThis as unknown as { liveSyncBus?: LiveSyncBus };
export const liveSyncBus = globalForSync.liveSyncBus || new LiveSyncBus();
if (process.env.NODE_ENV !== "production") globalForSync.liveSyncBus = liveSyncBus;
