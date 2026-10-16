"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SectionHeading } from "@/components/section-heading";
import { formatFee } from "@/lib/format";
import { whatsappLink } from "@/lib/payment";

export type PublicAudition = {
  id: string;
  mode: "OFFLINE" | "ONLINE";
  city: string | null;
  details: string | null;
  announcementText: string | null;
  whatsappNumber: string | null;
  category: {
    id: string;
    name: string;
    entryFee: number | null;
    entryCurrency: string;
  } | null;
};

export function EventAuditions({
  auditions,
  registerBase,
  organizerWhatsapp,
  organizerName,
}: {
  auditions: PublicAudition[];
  registerBase: string | null;
  organizerWhatsapp: string | null;
  organizerName: string | null;
}) {
  const offline = useMemo(() => auditions.filter((a) => a.mode === "OFFLINE"), [auditions]);
  const online = useMemo(() => auditions.filter((a) => a.mode === "ONLINE"), [auditions]);
  const [mode, setMode] = useState<"OFFLINE" | "ONLINE">(offline.length > 0 ? "OFFLINE" : "ONLINE");
  const [city, setCity] = useState<string>(offline[0]?.city ?? "");

  if (auditions.length === 0) return null;

  const cities = [...new Set(offline.map((a) => a.city).filter((c): c is string => Boolean(c)))];
  const selected = offline.find((a) => a.city === city) ?? offline[0] ?? null;
  const waNumber = selected?.whatsappNumber ?? organizerWhatsapp;

  return (
    <section id="auditions" aria-label="Auditions" className="scroll-mt-24">
      <SectionHeading
        eyebrow="First step"
        title="Auditions"
        description="Start here — pick a city audition or register online."
      />

      {offline.length > 0 && online.length > 0 ? (
        <div className="mb-md flex gap-sm">
          {(["OFFLINE", "ONLINE"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`border px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.1em] ${
                mode === m
                  ? "border-accent bg-accent text-paper"
                  : "border-line text-ink-muted hover:border-accent"
              }`}
            >
              {m === "OFFLINE" ? "Offline audition" : "Online audition"}
            </button>
          ))}
        </div>
      ) : null}

      {mode === "OFFLINE" ? (
        <div className="rounded-lg border border-line bg-paper-soft p-lg">
          <label className="block">
            <span className="font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted">
              Select city
            </span>
            <select
              value={selected?.city ?? ""}
              onChange={(e) => setCity(e.target.value)}
              className="mt-xs w-full max-w-sm border border-line bg-paper px-md py-sm text-body-md"
            >
              {cities.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          {selected ? (
            <div className="mt-md">
              {selected.details?.trim() ? (
                <p className="whitespace-pre-wrap text-body-md leading-relaxed">{selected.details}</p>
              ) : (
                <div className="border border-line bg-paper p-md">
                  <p className="font-display text-title-md uppercase">Details dropping soon</p>
                  <p className="mt-sm whitespace-pre-wrap text-body-sm text-ink-muted">
                    {selected.announcementText?.trim() ||
                      "Venue, date & instructions will be announced. Follow us on WhatsApp / Instagram for updates."}
                  </p>
                </div>
              )}
              {waNumber ? (
                <a
                  href={whatsappLink(
                    waNumber,
                    `Hi ${organizerName ?? "Organizer"}, I want to attend the offline audition${selected.city ? ` in ${selected.city}` : ""}. Please share the details.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-md inline-block border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
                >
                  Get updates on WhatsApp
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {mode === "ONLINE" && online.length > 0 ? (
        <ul className="space-y-md">
          {online.map((audition) => (
            <li key={audition.id} className="rounded-lg border border-line bg-paper-soft p-lg">
              <div className="flex flex-wrap items-center justify-between gap-md">
                <div className="min-w-0">
                  <p className="font-display text-title-md uppercase">
                    {audition.city ? `Online audition${audition.city ? ` — ${audition.city}` : ""}` : "Online audition"}
                  </p>
                  {audition.category ? (
                    <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
                      {audition.category.name} · {formatFee(audition.category.entryFee, audition.category.entryCurrency)}
                    </p>
                  ) : null}
                  {audition.details?.trim() ? (
                    <p className="mt-sm whitespace-pre-wrap text-body-sm text-ink-muted">{audition.details}</p>
                  ) : audition.announcementText?.trim() ? (
                    <p className="mt-sm whitespace-pre-wrap text-body-sm text-ink-muted">{audition.announcementText}</p>
                  ) : null}
                </div>
                {registerBase && audition.category ? (
                  <Link
                    href={`${registerBase}?audition=${audition.id}`}
                    className="shrink-0 border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
                  >
                    Register &amp; pay
                  </Link>
                ) : registerBase ? (
                  <Link
                    href={`${registerBase}?audition=${audition.id}`}
                    className="shrink-0 border border-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent hover:bg-accent hover:text-paper"
                  >
                    Continue
                  </Link>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
