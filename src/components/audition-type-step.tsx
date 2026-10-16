"use client";

import { useState } from "react";
import { CUSTOM_AUDITION_CITIES, type CustomAuditionMode } from "@/lib/audition-events";

export function AuditionTypeStep({
  onSelect,
}: {
  onSelect: (mode: CustomAuditionMode, city: string | null) => void;
}) {
  const [mode, setMode] = useState<CustomAuditionMode | null>(null);
  const [city, setCity] = useState<string>(CUSTOM_AUDITION_CITIES[0]);
  const [error, setError] = useState("");

  function choose(next: CustomAuditionMode) {
    setError("");
    setMode(next);
    if (next === "online") {
      onSelect("online", null);
    }
  }

  function confirmOffline() {
    if (!city) {
      setError("Select a city to continue.");
      return;
    }
    onSelect("offline", city);
  }

  return (
    <div className="mt-section border border-line">
      <div className="border-b border-line bg-paper-soft px-lg py-md">
        <p className="font-display text-title-md uppercase">Select audition type</p>
        <p className="mt-xs text-body-sm text-ink-muted">
          This event starts with an audition. Pick how you want to audition.
        </p>
      </div>
      <div className="grid gap-sm p-lg sm:grid-cols-2">
        {(["offline", "online"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => choose(m)}
            className={`border px-lg py-md text-left transition-colors ${
              mode === m ? "border-accent bg-accent/5" : "border-line hover:border-accent"
            }`}
          >
            <p className="font-display text-title-md uppercase">
              {m === "offline" ? "Offline audition" : "Online audition"}
            </p>
            <p className="mt-xs text-body-sm text-ink-muted">
              {m === "offline"
                ? "Attend a city audition — Guwahati, Dibrugarh or Tezpur."
                : "Submit online and pay the category fee."}
            </p>
          </button>
        ))}
      </div>
      {mode === "offline" ? (
        <div className="border-t border-line p-lg">
          <label className="block max-w-sm">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
              Select city
            </span>
            <select
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-xs w-full border border-line bg-paper px-md py-sm text-body-md"
            >
              {CUSTOM_AUDITION_CITIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {error ? <p className="mt-sm text-body-sm text-accent">{error}</p> : null}
          <button
            type="button"
            onClick={confirmOffline}
            className="mt-md border border-accent bg-accent px-lg py-sm text-button-md font-bold uppercase text-paper"
          >
            Continue with {city}
          </button>
        </div>
      ) : null}
    </div>
  );
}
