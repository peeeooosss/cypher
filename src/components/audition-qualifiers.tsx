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
  if (cities.length === 0) return null;
  return (
    <div className="space-y-xl">
      {cities.map((city) => {
        const cityData = getCityQualifiers(city);
        if (!cityData) return null;
        return (
          <div key={city}>
            <p className="font-mono text-[0.7rem] font-bold uppercase tracking-[0.2em] text-accent">
              {city} audition — qualified for finals
            </p>
            <QualifierTable title="Solo qualifiers" rows={cityData.solos} />
            <QualifierTable title="Group qualifiers" rows={cityData.groups} />
          </div>
        );
      })}
    </div>
  );
}
