"use client";

import { useState, useEffect } from "react";
import {
  Tags,
  Plus,
  Trash2,
  Users,
  CheckCircle2,
  Sparkles,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { Event, TicketTier } from "@/types/database";

interface TicketTiersTabProps {
  eventId: string;
  event: Event;
}

export function TicketTiersTab({ eventId, event }: TicketTiersTabProps) {
  const [tiers, setTiers] = useState<TicketTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState<number | "">("");
  const [price, setPrice] = useState<number | "">(0);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadTiers() {
    try {
      const res = await fetch(`/api/events/${eventId}/tiers`);
      if (res.ok) {
        const data = await res.json();
        setTiers(data.tiers || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTiers();
  }, [eventId]);

  async function handleCreateTier(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);

    try {
      const res = await fetch(`/api/events/${eventId}/tiers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          capacity: capacity === "" ? null : Number(capacity),
          price: price === "" ? 0 : Number(price),
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to create tier");
      }

      setName("");
      setDescription("");
      setCapacity("");
      setPrice(0);
      setIsAdding(false);
      await loadTiers();
    } catch (err: any) {
      setError(err?.message || "Failed to create ticket tier");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteTier(tierId: string) {
    if (!confirm("Are you sure you want to delete this ticket tier?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/tiers?tier_id=${tierId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTiers((prev) => prev.filter((t) => t.id !== tierId));
      }
    } catch (err) {
      console.error(err);
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 flex justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-amber-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-50 text-amber-700 border border-amber-200/60">
              <Tags className="h-5 w-5" />
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">Ticket Tiers & Access Passes</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Segment your attendees (VIP, General, Speaker, Student) with dedicated quotas and custom badge tags.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>{isAdding ? "Cancel" : "Add Ticket Tier"}</span>
        </button>
      </div>

      {/* Add Tier Form Modal / Card */}
      {isAdding && (
        <form
          onSubmit={handleCreateTier}
          className="rounded-2xl border border-amber-200/80 bg-amber-50/40 p-5 shadow-xs space-y-4 animate-in fade-in duration-150"
        >
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            <span>Create New Ticket Tier</span>
          </h3>

          {error && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tier Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. VIP All-Access Pass"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Max Capacity (Blank for Unlimited)
              </label>
              <input
                type="number"
                min="1"
                value={capacity}
                onChange={(e) => setCapacity(e.target.value === "" ? "" : Number(e.target.value))}
                placeholder="Unlimited"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Inclusions
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Includes exclusive keynote seating, catered lounge, and swag bag."
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 px-4 py-1.5 text-xs font-semibold text-white shadow-xs cursor-pointer"
            >
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
              <span>Save Ticket Tier</span>
            </button>
          </div>
        </form>
      )}

      {/* Tiers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tiers.map((tier) => (
          <div
            key={tier.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-md">
                  Tier Pass
                </span>
                <button
                  type="button"
                  onClick={() => handleDeleteTier(tier.id)}
                  title="Delete tier"
                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <div>
                <h3 className="text-sm font-bold text-slate-900">{tier.name}</h3>
                {tier.description && (
                  <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{tier.description}</p>
                )}
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-slate-400" />
                <span>Capacity: {tier.capacity !== null ? tier.capacity : "Unlimited"}</span>
              </span>
              <span className="font-mono text-[10px] text-slate-400">{tier.id}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
