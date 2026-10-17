import { requireAdmin } from "@/lib/admin";
import { ScoringConfigForm } from "@/components/scoring-config-form";

export const dynamic = "force-dynamic";

export default async function NewScoringConfigPage() {
  await requireAdmin();
  return (
    <div className="space-y-section max-w-3xl">
      <div>
        <h2 className="font-display text-title-md uppercase">New Scoring Configuration</h2>
        <p className="mt-xs text-body-sm text-ink-muted">
          Create a new scoring criteria configuration.
        </p>
      </div>
      <ScoringConfigForm />
    </div>
  );
}
