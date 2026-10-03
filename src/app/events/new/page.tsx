"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Navbar } from "@/components/Navbar";
import {
  Calendar,
  MapPin,
  Users,
  Image as ImageIcon,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Sparkles,
  SlidersHorizontal,
  DoorOpen,
  Utensils,
  Layers,
  CreditCard,
  QrCode,
  Car,
  Armchair,
  FileQuestion,
  Plus,
  Trash2,
} from "lucide-react";
import { generateSlug } from "@/lib/utils";
import { EventModuleKey } from "@/types/database";

interface ModuleOption {
  key: EventModuleKey;
  label: string;
  description: string;
  icon: any;
  defaultChecked: boolean;
}

const MODULE_OPTIONS: ModuleOption[] = [
  {
    key: "rsvp",
    label: "RSVP & Registration",
    description: "Public registration form, guest screening, and custom questionnaire.",
    icon: FileQuestion,
    defaultChecked: true,
  },
  {
    key: "qr_access",
    label: "QR Passes & Check-In",
    description: "Cryptographic QR passes issued upon approval with check-in scanning.",
    icon: QrCode,
    defaultChecked: true,
  },
  {
    key: "gates",
    label: "Gates Management",
    description: "Specific gates (e.g. Main Gate, VIP Gate) with dedicated gatekeeper logins.",
    icon: DoorOpen,
    defaultChecked: true,
  },
  {
    key: "areas",
    label: "Restricted Areas & Lounges",
    description: "Multi-zone access control (e.g. General Hall, VIP Lounge, Backstage).",
    icon: Layers,
    defaultChecked: false,
  },
  {
    key: "sections",
    label: "Hall Sections & Blocks",
    description: "Auditorium sections (e.g. Section A, Block 102).",
    icon: Layers,
    defaultChecked: false,
  },
  {
    key: "food",
    label: "Food & Beverage Counters",
    description: "Meal entitlements, lunch/dinner quota vouchers, and catering redemption.",
    icon: Utensils,
    defaultChecked: false,
  },
  {
    key: "parking",
    label: "Valet & Parking Passes",
    description: "Vehicle slot allocation and parking QR verification.",
    icon: Car,
    defaultChecked: false,
  },
  {
    key: "seating",
    label: "Reserved Seating Layout",
    description: "Seat number allocation per guest.",
    icon: Armchair,
    defaultChecked: false,
  },
  {
    key: "payments",
    label: "Ticketing & Payments",
    description: "Paid ticket tiers with automated platform fee calculation and bank payouts.",
    icon: CreditCard,
    defaultChecked: false,
  },
];

export default function ConfigurableEventBuilderPage() {
  const router = useRouter();

  // Wizard Step (1: Details, 2: Modules, 3: Topography)
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Essentials
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [coverImageUrl, setCoverImageUrl] = useState(
    "https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&w=1600&q=80"
  );
  const [startDate, setStartDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [endDate, setEndDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 4 * 60 * 60 * 1000).toISOString().slice(0, 16)
  );
  const [timezone, setTimezone] = useState("America/New_York");
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [maxCapacity, setMaxCapacity] = useState("250");

  // Step 2: Enabled Modules Set
  const [selectedModules, setSelectedModules] = useState<Record<string, boolean>>({
    rsvp: true,
    qr_access: true,
    gates: true,
    areas: false,
    sections: false,
    food: false,
    parking: false,
    seating: false,
    payments: false,
  });

  // Step 3: Topography Draft Entities
  const [initialGates, setInitialGates] = useState<string[]>(["Main Gate"]);
  const [initialAreas, setInitialAreas] = useState<string[]>(["General Area", "VIP Lounge"]);
  const [initialPassTypes, setInitialPassTypes] = useState<string[]>(["General Attendee", "VIP Pass"]);
  const [initialFoodCategories, setInitialFoodCategories] = useState<string[]>(["Lunch Buffet"]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    setTitle(val);
    setSlug(generateSlug(val));
  }

  function toggleModule(key: EventModuleKey) {
    setSelectedModules((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  // Create Event and Save Config
  async function handleFinalSubmit() {
    setLoading(true);
    setError(null);

    try {
      // 1. Create base event
      const resEvent = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim(),
          description: description.trim() || null,
          cover_image_url: coverImageUrl.trim() || null,
          start_date: new Date(startDate).toISOString(),
          end_date: endDate ? new Date(endDate).toISOString() : null,
          timezone,
          location_name: locationName.trim() || null,
          location_address: locationAddress.trim() || null,
          is_published: true,
          max_capacity: maxCapacity ? Number(maxCapacity) : null,
        }),
      });

      const eventData = await resEvent.json();
      if (!resEvent.ok) {
        throw new Error(eventData.error || "Failed to create event");
      }

      const eventId = eventData.event.id;

      // 2. Build custom modules array
      const modulesConfig = Object.entries(selectedModules).map(([key, is_enabled]) => ({
        module_key: key,
        is_enabled,
      }));

      // 3. Format gates, areas, pass types, food
      const gatesConfig = selectedModules.gates
        ? initialGates.map((name, i) => ({
            name,
            gate_code: `GATE-${i + 1}`,
            description: `${name} checkpoint`,
            is_active: true,
          }))
        : [];

      const areasConfig = selectedModules.areas
        ? initialAreas.map((name, i) => ({
            name,
            area_code: `AREA-${i + 1}`,
            is_restricted: i > 0,
          }))
        : [];

      const passTypesConfig = initialPassTypes.map((name, i) => ({
        name,
        code: `PASS-${i + 1}`,
        description: `${name} tier pass`,
        price: selectedModules.payments && i > 0 ? 1999 : 0,
        is_active: true,
      }));

      const foodCategoriesConfig = selectedModules.food
        ? initialFoodCategories.map((name, i) => ({
            name,
            category_code: `MEAL-${i + 1}`,
            is_active: true,
          }))
        : [];

      // 4. Save configuration and topography
      await fetch(`/api/events/${eventId}/config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modules: modulesConfig,
          gates: gatesConfig,
          areas: areasConfig,
          passTypes: passTypesConfig,
          foodCategories: foodCategoriesConfig,
        }),
      });

      // Redirect directly to event management dashboard
      router.push(`/events/${eventId}`);
    } catch (err: any) {
      setError(err?.message || "An error occurred while creating your event.");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 mx-auto max-w-4xl w-full px-4 sm:px-6 py-8">
        <Link
          href="/events"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Events Dashboard</span>
        </Link>

        {/* Wizard Progress Stepper */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-0.5 bg-slate-200 -z-10" />

            {/* Step 1 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step >= 1 ? "bg-sky-600 text-white shadow-sm ring-4 ring-sky-100" : "bg-slate-200 text-slate-600"
                }`}
              >
                1
              </div>
              <span className="text-xs font-bold text-slate-800 mt-1.5">Event Details</span>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step >= 2 ? "bg-sky-600 text-white shadow-sm ring-4 ring-sky-100" : "bg-slate-200 text-slate-600"
                }`}
              >
                2
              </div>
              <span className="text-xs font-bold text-slate-800 mt-1.5">Choose Modules</span>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold transition ${
                  step === 3 ? "bg-sky-600 text-white shadow-sm ring-4 ring-sky-100" : "bg-slate-200 text-slate-600"
                }`}
              >
                3
              </div>
              <span className="text-xs font-bold text-slate-800 mt-1.5">Topography & Gates</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
            {error}
          </div>
        )}

        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 sm:p-8 shadow-sm">
          {/* STEP 1: Basic Event Details */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Event Details & Schedule</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Enter your event name, location, and schedule details.
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Event Title *</label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={handleTitleChange}
                    placeholder="e.g. Google Build Hackathon 2026"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Custom URL Slug *</label>
                  <div className="flex items-center">
                    <span className="px-3 py-2.5 bg-slate-100 border border-r-0 border-slate-300 rounded-l-xl text-xs font-mono text-slate-500">
                      /e/
                    </span>
                    <input
                      type="text"
                      required
                      value={slug}
                      onChange={(e) => setSlug(e.target.value)}
                      placeholder="google-build-hackathon-2026"
                      className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-r-xl text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your event, agenda, and speakers..."
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">End Date & Time</label>
                    <input
                      type="datetime-local"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Venue / Location Name</label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. Grand Convention Center"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Attendee Capacity Limit</label>
                    <input
                      type="number"
                      value={maxCapacity}
                      onChange={(e) => setMaxCapacity(e.target.value)}
                      placeholder="e.g. 500"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200">
                <button
                  type="button"
                  disabled={!title.trim() || !slug.trim()}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-sky-600/30 cursor-pointer"
                >
                  <span>Next: Configure Modules</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Configure Modules */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">Select Event Modules</h1>
                <p className="text-xs text-slate-500 mt-1">
                  Every event is unique. Enable only the modules your event requires (Gates, VIP areas, Food, Ticketing).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {MODULE_OPTIONS.map((mod) => {
                  const Icon = mod.icon;
                  const isChecked = selectedModules[mod.key];
                  return (
                    <div
                      key={mod.key}
                      onClick={() => toggleModule(mod.key)}
                      className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start gap-3.5 select-none ${
                        isChecked
                          ? "bg-white border-sky-600 shadow-xs"
                          : "bg-white/60 border-slate-200 hover:border-slate-300 opacity-75"
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition ${
                          isChecked ? "bg-sky-600 text-white shadow-2xs" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-slate-900">{mod.label}</h3>
                          <div
                            className={`w-5 h-5 rounded-md border flex items-center justify-center transition ${
                              isChecked
                                ? "bg-sky-600 border-sky-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </div>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">{mod.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-sky-600/30 cursor-pointer"
                >
                  <span>Next: Setup Initial Topology</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Setup Initial Topology */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900">
                  Initial Topography & Pass Types
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Customize the default gates, areas, passes, and counters for the modules you selected.
                </p>
              </div>

              {/* Pass Types */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                  Pass Types
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {initialPassTypes.map((pt, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-200 text-sky-800 rounded-lg text-xs font-bold"
                    >
                      {pt}
                      {initialPassTypes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setInitialPassTypes(initialPassTypes.filter((_, i) => i !== idx))}
                          className="hover:text-red-600 text-slate-400"
                        >
                          &times;
                        </button>
                      )}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="new-pass-input"
                    type="text"
                    placeholder="Add pass type (e.g. VIP, Media, Speaker)..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val && !initialPassTypes.includes(val)) {
                          setInitialPassTypes([...initialPassTypes, val]);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("new-pass-input") as HTMLInputElement;
                      if (input && input.value.trim() && !initialPassTypes.includes(input.value.trim())) {
                        setInitialPassTypes([...initialPassTypes, input.value.trim()]);
                        input.value = "";
                      }
                    }}
                    className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Gates (if module enabled) */}
              {selectedModules.gates && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                    Gates / Check-In Points
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {initialGates.map((gate, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-bold"
                      >
                        {gate}
                        {initialGates.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setInitialGates(initialGates.filter((_, i) => i !== idx))}
                            className="hover:text-red-600 text-slate-400"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="new-gate-input"
                      type="text"
                      placeholder="Add gate (e.g. VIP Gate, East Entrance)..."
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val && !initialGates.includes(val)) {
                            setInitialGates([...initialGates, val]);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("new-gate-input") as HTMLInputElement;
                        if (input && input.value.trim() && !initialGates.includes(input.value.trim())) {
                          setInitialGates([...initialGates, input.value.trim()]);
                          input.value = "";
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Areas (if module enabled) */}
              {selectedModules.areas && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                    Areas / Lounges
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {initialAreas.map((area, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 border border-purple-200 text-purple-800 rounded-lg text-xs font-bold"
                      >
                        {area}
                        {initialAreas.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setInitialAreas(initialAreas.filter((_, i) => i !== idx))}
                            className="hover:text-red-600 text-slate-400"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="new-area-input"
                      type="text"
                      placeholder="Add area (e.g. Backstage, Speaker Room)..."
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val && !initialAreas.includes(val)) {
                            setInitialAreas([...initialAreas, val]);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("new-area-input") as HTMLInputElement;
                        if (input && input.value.trim() && !initialAreas.includes(input.value.trim())) {
                          setInitialAreas([...initialAreas, input.value.trim()]);
                          input.value = "";
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              {/* Food Categories (if module enabled) */}
              {selectedModules.food && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs">
                  <label className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider">
                    Food & Catering Counters
                  </label>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {initialFoodCategories.map((food, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold"
                      >
                        {food}
                        {initialFoodCategories.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setInitialFoodCategories(initialFoodCategories.filter((_, i) => i !== idx))}
                            className="hover:text-red-600 text-slate-400"
                          >
                            &times;
                          </button>
                        )}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="new-food-input"
                      type="text"
                      placeholder="Add food counter (e.g. VIP Dinner, Coffee Bar)..."
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          const val = e.currentTarget.value.trim();
                          if (val && !initialFoodCategories.includes(val)) {
                            setInitialFoodCategories([...initialFoodCategories, val]);
                            e.currentTarget.value = "";
                          }
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const input = document.getElementById("new-food-input") as HTMLInputElement;
                        if (input && input.value.trim() && !initialFoodCategories.includes(input.value.trim())) {
                          setInitialFoodCategories([...initialFoodCategories, input.value.trim()]);
                          input.value = "";
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-5 py-2.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleFinalSubmit}
                  className="px-6 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm shadow-sky-600/30 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating Event...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Create & Launch Event</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
