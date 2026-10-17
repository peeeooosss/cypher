import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { ScoringConfigForm } from "@/components/scoring-config-form";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function EditScoringConfigPage({ params }: Props) {
  await requireAdmin();
  const { id } = await params;
  const config = await prisma.scoringConfig.findUnique({ where: { id } });
  if (!config) return notFound();
  return (
    <div className="space-y-section max-w-3xl">
      <div>
        <h2 className="font-display text-title-md uppercase">Edit Scoring Configuration</h2>
        <p className="mt-xs text-body-sm text-ink-muted">
          Update scoring criteria configuration.
        </p>
      </div>
      <ScoringConfigForm config={config} />
    </div>
  );
}
