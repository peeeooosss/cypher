"use client";

import { useState, type ComponentProps } from "react";
import { AuditionTypeStep } from "@/components/audition-type-step";
import { RegistrationForm } from "@/components/registration-form";
import type { CustomAuditionMode } from "@/lib/audition-events";

type FlowProps = Omit<ComponentProps<typeof RegistrationForm>, "auditionMode" | "auditionCity">;

export function AuditionRegisterFlow(props: FlowProps) {
  const [mode, setMode] = useState<CustomAuditionMode | null>(null);
  const [city, setCity] = useState<string | null>(null);

  if (!mode) {
    return (
      <AuditionTypeStep
        onSelect={(m, c) => {
          setMode(m);
          setCity(c);
        }}
      />
    );
  }

  return (
    <>
      <div className="mt-lg flex flex-wrap items-center justify-between gap-sm border border-accent bg-paper-soft p-md">
        <p className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-accent">
          {mode === "offline" ? "Offline audition" : "Online audition"}
          {mode === "offline" && city ? ` — ${city}` : ""}
        </p>
        <button
          type="button"
          onClick={() => {
            setMode(null);
            setCity(null);
          }}
          className="font-mono text-[0.65rem] uppercase text-ink-muted hover:text-accent"
        >
          Change
        </button>
      </div>
      <RegistrationForm {...props} auditionMode={mode} auditionCity={city} />
    </>
  );
}
