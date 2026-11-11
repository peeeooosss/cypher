"use client";

import { useState } from "react";
import {
  getQualifierCities,
  getCityQualifiers,
  type AuditionQualifier,
} from "@/lib/audition-qualifiers";

function QualifierTable({ title, rows }: { title: string; rows: AuditionQualifier[] }) {
  if (rows.length === 0) return null;
  return (
    <div className="mt-sm">
      <p className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-muted">
        {title}
      </p>
      <div className="mt-sm overflow-x-auto rounded-lg border border-line bg-paper-soft">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-line">
              <th className="w-14 px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink-muted">
                Sl. No.
              </th>
              <th className="px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink-muted">
                Name
              </th>
              <th className="px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink-muted">
                Category
              </th>
              <th className="px-sm py-xs font-mono text-[0.6rem] font-bold uppercase tracking-[0.1em] text-ink-muted">
                Academy Name
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, index) => (
              <tr key={`${row.name}-${index}`} className="border-b border-line last:border-b-0">
                <td className="px-sm py-sm font-mono text-[0.65rem] tabular-nums text-ink-muted">
                  {index + 1}
                </td>
                <td className="px-sm py-sm text-body-sm font-bold uppercase leading-tight">
                  {row.name}
                </td>
                <td className="whitespace-nowrap px-sm py-sm font-mono text-[0.6rem] uppercase tracking-[0.08em] text-ink-muted">
                  {row.category}
                </td>
                <td className="px-sm py-sm text-body-sm leading-tight text-ink-muted">
                  {row.academy}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AuditionQualifiers() {
  const cities = getQualifierCities();
  const [city, setCity] = useState(cities[0] ?? "");

  if (cities.length === 0) return null;

  const cityData = getCityQualifiers(city);

  return (
    <div>
      <label
        htmlFor="audition-city-select"
        className="font-mono text-[0.65rem] font-bold uppercase tracking-[0.2em] text-ink-muted"
      >
        Audition city
      </label>
      <select
        id="audition-city-select"
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="mt-sm w-full max-w-sm appearance-none rounded-md border border-line bg-paper-soft px-sm py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.1em] text-ink outline-none transition-colors hover:border-accent focus:border-accent"
      >
        {cities.map((optionCity) => (
          <option key={optionCity} value={optionCity}>
            {optionCity}
          </option>
        ))}
      </select>

      {cityData ? (
        <div className="mt-lg">
          <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.2em] text-accent">
            {city} audition — qualified for finals
          </p>
          <QualifierTable title="Solo qualifiers" rows={cityData.solos} />
          <QualifierTable title="Group qualifiers" rows={cityData.groups} />
        </div>
      ) : null}
    </div>
  );
}
