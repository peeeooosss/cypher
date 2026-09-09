import { requireAdmin } from "@/lib/admin";
import { getPricingConfig } from "@/lib/pricing";
import { PricingSettings, type PricingFormValues } from "@/components/pricing-settings";

export const dynamic = "force-dynamic";

export default async function AdminPricingPage() {
  await requireAdmin();
  const pricing = await getPricingConfig();

  const values: PricingFormValues = {
    workshopFee: pricing.eventTypeFees.WORKSHOP,
    undergroundBattleFee: pricing.eventTypeFees.UNDERGROUND_BATTLE,
    danceCompetitionFee: pricing.eventTypeFees.DANCE_COMPETITION,
    musicCompetitionFee: pricing.eventTypeFees.MUSIC_COMPETITION,
    commissionBps: pricing.commissionBps,
    gigFlatFee: pricing.gigFlatFee,
    gigWorkFee: pricing.gigWorkFee,
    gigConnectionFee: pricing.gigConnectionFee,
  };

  return (
    <div className="max-w-3xl">
      <div>
        <h2 className="font-display text-title-md uppercase">Pricing</h2>
        <p className="mt-sm text-body-sm text-ink-muted">
          Fees are charged in INR and propagated everywhere — new events, gig postings, marketplace
          access, connection unlocks, and commission calculations. Existing paid events keep the fee
          they were billed at.
        </p>
      </div>
      <div className="mt-section">
        <PricingSettings initial={values} />
      </div>
    </div>
  );
}