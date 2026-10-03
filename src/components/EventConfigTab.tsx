"use client";

import { useState, useEffect } from "react";
import {
  Layers,
  DoorOpen,
  MapPin,
  UtensilsCrossed,
  Tags,
  Plus,
  Trash2,
  Check,
  Loader2,
  AlertCircle,
  Save,
  ShieldCheck,
  DollarSign,
  Grid,
  Sparkles,
} from "lucide-react";
import {
  Event,
  EventModule,
  EventGate,
  EventArea,
  EventPassType,
  EventFoodCategory,
  EventModuleKey,
} from "@/types/database";

interface EventConfigTabProps {
  eventId: string;
  event: Event;
  onRefresh?: () => void;
}

const AVAILABLE_MODULES: {
  key: EventModuleKey;
  label: string;
  description: string;
  icon: any;
  category: "core" | "access" | "hospitality" | "monetization";
}[] = [
  {
    key: "rsvp",
    label: "RSVP & Registration",
    description: "Public registration forms, attendee screening, and custom questionnaire.",
    icon: Check,
    category: "core",
  },
  {
    key: "guest_management",
    label: "Guest Management",
    description: "Roster tables, CSV bulk import, attendee grouping, and guest blocking.",
    icon: Layers,
    category: "core",
  },
  {
    key: "qr_entry",
    label: "QR Digital Access",
    description: "Unique encrypted cryptographic QR tokens for digital event entry.",
    icon: ShieldCheck,
    category: "access",
  },
  {
    key: "gates",
    label: "Gate Checkpoints",
    description: "Configure entry turnstiles, VIP gates, and exit-only tracking doors.",
    icon: DoorOpen,
    category: "access",
  },
  {
    key: "areas",
    label: "Areas & Exclusive Lounges",
    description: "Segregated access control for General Halls, VIP Lounges, and Backstage.",
    icon: MapPin,
    category: "access",
  },
  {
    key: "sections",
    label: "Sections & Benches",
    description: "Sub-divide halls into Section A/B or workshop bench allocations.",
    icon: Grid,
    category: "access",
  },
  {
    key: "food",
    label: "Food & Catering",
    description: "Digital meal vouchers, banquet allocations, and dietary restriction tracking.",
    icon: UtensilsCrossed,
    category: "hospitality",
  },
  {
    key: "passes",
    label: "Pass Types & Tiers",
    description: "Define General, VIP, VVIP, Speaker, and Staff credential badges.",
    icon: Tags,
    category: "access",
  },
  {
    key: "paid_entry",
    label: "Paid Ticketing & Payments",
    description: "Razorpay payment orders, pricing, financial ledgers, and revenue payouts.",
    icon: DollarSign,
    category: "monetization",
  },
];

export function EventConfigTab({ eventId, event, onRefresh }: EventConfigTabProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Configuration state
  const [modules, setModules] = useState<Record<string, boolean>>({
    rsvp: true,
    guest_management: true,
    qr_entry: true,
    gates: true,
    areas: true,
    sections: false,
    food: true,
    passes: true,
    paid_entry: false,
    seating: false,
    parking: false,
    staff_checkin: true,
    analytics: true,
  });

  const [gates, setGates] = useState<EventGate[]>([]);
  const [areas, setAreas] = useState<EventArea[]>([]);
  const [passTypes, setPassTypes] = useState<EventPassType[]>([]);
  const [foodCategories, setFoodCategories] = useState<EventFoodCategory[]>([]);

  // New item modal states
  const [newGateName, setNewGateName] = useState("");
  const [newAreaName, setNewAreaName] = useState("");
  const [newPassName, setNewPassName] = useState("");
  const [newPassPrice, setNewPassPrice] = useState(0);
  const [newFoodName, setNewFoodName] = useState("");

  async function loadConfig() {
    try {
      setLoading(true);
      const res = await fetch(`/api/events/${eventId}/config`);
      if (res.ok) {
        const data = await res.json();
        const conf = data.config;
        if (conf.modules) {
          const modMap: any = { ...modules };
          conf.modules.forEach((m: EventModule) => {
            modMap[m.module_key] = m.is_enabled;
          });
          setModules(modMap);
        }
        setGates(conf.gates || []);
        setAreas(conf.areas || []);
        setPassTypes(conf.passTypes || []);
        setFoodCategories(conf.foodCategories || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadConfig();
  }, [eventId]);

  function toggleModule(key: EventModuleKey) {
    setModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  async function handleSaveModules() {
    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);
    try {
      const updates = (Object.keys(modules) as EventModuleKey[]).map((key) => ({
        module_key: key,
        is_enabled: modules[key],
      }));

      const res = await fetch(`/api/events/${eventId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ modules: updates }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to update configuration");
      }

      setSuccessMsg("Event module configuration saved successfully!");
      if (onRefresh) onRefresh();
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  }

  function handleAddGate() {
    if (!newGateName.trim()) return;
    const gate: EventGate = {
      id: `GATE-${Date.now().toString(36)}`,
      event_id: eventId,
      name: newGateName.trim(),
      gate_type: "bidirectional",
      is_active: true,
    };
    setGates([...gates, gate]);
    setNewGateName("");
  }

  function handleAddArea() {
    if (!newAreaName.trim()) return;
    const area: EventArea = {
      id: `AREA-${Date.now().toString(36)}`,
      event_id: eventId,
      name: newAreaName.trim(),
      area_type: newAreaName.toLowerCase().includes("vip") ? "vip" : "general",
      capacity: 100,
      is_active: true,
    };
    setAreas([...areas, area]);
    setNewAreaName("");
  }

  function handleAddPass() {
    if (!newPassName.trim()) return;
    const pass: EventPassType = {
      id: `PASS-${Date.now().toString(36)}`,
      event_id: eventId,
      name: newPassName.trim(),
      price: Number(newPassPrice) || 0,
      quota: 100,
      badge_color: newPassPrice > 0 ? "violet" : "sky",
      is_active: true,
    };
    setPassTypes([...passTypes, pass]);
    setNewPassName("");
    setNewPassPrice(0);
  }

  function handleAddFood() {
    if (!newFoodName.trim()) return;
    const food: EventFoodCategory = {
      id: `FOOD-${Date.now().toString(36)}`,
      event_id: eventId,
      name: newFoodName.trim(),
      dietary_info: "Standard / Multi-Option",
      total_quota: 100,
      is_active: true,
    };
    setFoodCategories([...foodCategories, food]);
    setNewFoodName("");
  }

  if (loading) {
    return (
      <div className="p-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-sky-600 mx-auto mb-2" />
        <p className="text-xs text-slate-400">Loading event configuration engine...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="rounded-3xl border border-slate-200/90 bg-[#f8fafc] p-6 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Configurable Event Operations Engine</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Event Modules & Topology Configuration
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              Every event is different. Activate only the operational modules needed for this event. Inactive modules will not clutter staff terminals or client navigation.
            </p>
          </div>

          <button
            type="button"
            onClick={handleSaveModules}
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-sky-500 shadow-xs transition-all cursor-pointer disabled:opacity-50 self-start lg:self-auto"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            <span>Save Configuration</span>
          </button>
        </div>

        {successMsg && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-medium flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}
      </div>

      {/* 2. Available Modules Selection Grid */}
      <div>
        <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Layers className="h-4 w-4 text-sky-600" />
          <span>Active Operational Modules</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {AVAILABLE_MODULES.map((mod) => {
            const isEnabled = modules[mod.key];
            const Icon = mod.icon;

            return (
              <div
                key={mod.key}
                onClick={() => toggleModule(mod.key)}
                className={`p-5 rounded-2xl border transition-all cursor-pointer select-none ${
                  isEnabled
                    ? "bg-white border-sky-300 shadow-xs ring-2 ring-sky-100"
                    : "bg-[#f8fafc] border-slate-200 opacity-60 hover:opacity-90"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2.5 rounded-xl border ${
                      isEnabled
                        ? "bg-sky-50 text-sky-600 border-sky-200"
                        : "bg-slate-100 text-slate-400 border-slate-200"
                    }`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      isEnabled
                        ? "bg-sky-50 text-sky-700 border-sky-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {isEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>

                <div className="mt-3.5 space-y-1">
                  <h4 className="text-sm font-bold text-slate-900">{mod.label}</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">{mod.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. Conditional Configuration Sub-Panels */}

      {/* Panel A: Gates Configuration (if gates enabled) */}
      {modules.gates && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <DoorOpen className="h-4 w-4 text-sky-600" />
                <span>Configured Gates ({gates.length})</span>
              </h4>
              <p className="text-xs text-slate-500">Add physical entry points, VIP doors, or exit turnstiles.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. VVIP East Gate"
              value={newGateName}
              onChange={(e) => setNewGateName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleAddGate}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Add Gate
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {gates.map((g) => (
              <div key={g.id} className="p-3 rounded-xl border border-slate-200 bg-[#f8fafc] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{g.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">{g.gate_type}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setGates(gates.filter((item) => item.id !== g.id))}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel B: Areas & Lounges (if areas enabled) */}
      {modules.areas && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-sky-600" />
                <span>Areas & Exclusive Lounges ({areas.length})</span>
              </h4>
              <p className="text-xs text-slate-500">Configure spaces subject to access rule control.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Backstage Artist Lounge"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleAddArea}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Add Area
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {areas.map((a) => (
              <div key={a.id} className="p-3 rounded-xl border border-slate-200 bg-[#f8fafc] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{a.name}</span>
                  <span className="text-[10px] text-slate-500 font-mono uppercase">Capacity: {a.capacity || "Unlimited"}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setAreas(areas.filter((item) => item.id !== a.id))}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel C: Pass Types (if passes enabled) */}
      {modules.passes && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Tags className="h-4 w-4 text-sky-600" />
                <span>Pass Types & Badges ({passTypes.length})</span>
              </h4>
              <p className="text-xs text-slate-500">Tier access credentials mapped to entry rights.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="text"
              placeholder="e.g. VIP All-Access Pass"
              value={newPassName}
              onChange={(e) => setNewPassName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
            <input
              type="number"
              placeholder="Price (₹)"
              value={newPassPrice || ""}
              onChange={(e) => setNewPassPrice(Number(e.target.value))}
              className="w-28 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleAddPass}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Add Pass Type
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {passTypes.map((p) => (
              <div key={p.id} className="p-3 rounded-xl border border-slate-200 bg-[#f8fafc] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{p.name}</span>
                  <span className="text-[10px] text-slate-500">
                    {p.price > 0 ? `₹${p.price.toLocaleString()}` : "Free Admission"} • Quota: {p.quota || "Open"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setPassTypes(passTypes.filter((item) => item.id !== p.id))}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Panel D: Food Categories (if food enabled) */}
      {modules.food && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-sky-600" />
                <span>Food & Catering Categories ({foodCategories.length})</span>
              </h4>
              <p className="text-xs text-slate-500">Meal vouchers and catering redemption counters.</p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="e.g. Networking Banquet Buffet"
              value={newFoodName}
              onChange={(e) => setNewFoodName(e.target.value)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-sky-500"
            />
            <button
              type="button"
              onClick={handleAddFood}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
            >
              Add Food Category
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {foodCategories.map((f) => (
              <div key={f.id} className="p-3 rounded-xl border border-slate-200 bg-[#f8fafc] flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">{f.name}</span>
                  <span className="text-[10px] text-slate-500">Dietary: {f.dietary_info}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setFoodCategories(foodCategories.filter((item) => item.id !== f.id))}
                  className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
