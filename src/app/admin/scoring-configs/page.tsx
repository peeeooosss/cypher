import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import type { ScoringCriterion } from "@/lib/scoring-config";

export const dynamic = "force-dynamic";

export default async function ScoringConfigsPage() {
  await requireAdmin();
  const configs = await prisma.scoringConfig.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-section">
      <div className="flex items-center justify-between gap-md">
        <div>
          <h2 className="font-display text-title-md uppercase">Scoring Configurations</h2>
          <p className="mt-xs text-body-sm text-ink-muted">
            Configure scoring criteria for different event types and contexts.
          </p>
        </div>
        <Link
          href="/admin/scoring-configs/new"
          className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper transition-opacity hover:opacity-80"
        >
          New Config
        </Link>
      </div>

      {configs.length === 0 ? (
        <div className="border border-line p-lg">
          <p className="text-body-sm text-ink-muted">No scoring configurations found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border border-line text-body-sm">
            <thead>
              <tr className="border-b border-line bg-paper-soft text-left">
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Name</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Applies To</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Criteria</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Total Max</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Default</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Active</th>
                <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Actions</th>
              </tr>
            </thead>
            <tbody>
              {configs.map((config) => {
                const criteria = Array.isArray(config.criteria) ? (config.criteria as unknown as ScoringCriterion[]) : [];
                const criteriaText = criteria.map((c) => c.label).join(", ") || "—";
                return (
                  <tr key={config.id} className="border-b border-line">
                    <td className="px-md py-sm">
                      <Link href={`/admin/scoring-configs/${config.id}`} className="font-bold uppercase hover:text-accent">
                        {config.name}
                      </Link>
                    </td>
                    <td className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">
                      {config.appliesTo}
                      {config.appliesToValue ? ` (${config.appliesToValue})` : ""}
                    </td>
                    <td className="px-md py-sm text-ink-muted">{criteriaText.length > 60 ? criteriaText.slice(0, 60) + "..." : criteriaText}</td>
                    <td className="px-md py-sm">{config.totalMax}</td>
                    <td className="px-md py-sm">{config.isDefault ? "Yes" : "No"}</td>
                    <td className="px-md py-sm">{config.isActive ? "Yes" : "No"}</td>
                    <td className="px-md py-sm">
                      <Link href={`/admin/scoring-configs/${config.id}`} className="text-accent hover:underline">
                        Edit
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
