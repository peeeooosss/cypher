import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatInr, GIG_WORK_FEE } from "@/lib/pricing";
import { PayuCheckout } from "@/components/payu-checkout";
import { CancelPaymentButton } from "@/components/cancel-payment-button";
import { SignOutButton } from "@/components/sign-out-button";
import type { PaymentStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

export default async function ArtistGigBillPage() {
  const user = await requireRole("ARTIST");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      gigWorkPaymentStatus: true,
      gigWorkPaymentMethod: true,
      gigWorkPaymentSentAt: true,
      gigWorkPaidAt: true,
      gigWorkExpiresAt: true,
    },
  });

  const status = (me?.gigWorkPaymentStatus ?? "NONE") as PaymentStatus;
  const paidAt = me?.gigWorkPaidAt ?? null;
  const expiresAt = me?.gigWorkExpiresAt ?? null;
  const amount = GIG_WORK_FEE;

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <Link
        href="/artist/marketplace"
        className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
      >
        &larr; Back to marketplace
      </Link>

      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Gig work bill</p>
          <h1 className="font-display text-display-lg uppercase">Unlock the marketplace</h1>
          <p className="mt-sm text-body-sm text-ink-muted">
            Pay {formatInr(amount)} once for 3 months of access to freelance gigs.
          </p>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-section grid gap-lg lg:grid-cols-2">
        <div className="border border-line bg-paper-soft p-lg">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Gig work access</p>
          <div className="mt-md space-y-sm text-body-sm">
            <div className="flex justify-between">
              <span>Access period</span>
              <span className="font-mono text-accent">3 months</span>
            </div>
            <div className="flex justify-between">
              <span>Gig work fee</span>
              <span className="font-mono text-accent">{formatInr(amount)}</span>
            </div>
            <div className="flex justify-between border-t border-line pt-sm">
              <span>Total due now</span>
              <span className="font-mono text-accent">{formatInr(amount)}</span>
            </div>
          </div>
          <p className="mt-md text-body-sm text-ink-muted">
             Pay securely through PayU. After successful payment your access is enabled
             immediately and lasts 3 months from the payment date.
          </p>
        </div>

        <div className="border border-line p-lg">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Payment</p>
          <div className="mt-md">
            {status === "VERIFIED" ? (
              <div className="space-y-md">
                <div className="border border-accent bg-accent/10 px-md py-sm">
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
                    Payment verified — Gig Work enabled
                    {paidAt ? ` · ${paidAt.toLocaleString()}` : ""}
                  </p>
                  {expiresAt ? (
                    <p className="mt-xs text-body-sm text-ink-muted">
                      Your access runs until {expiresAt.toLocaleString()}. Apply to gigs anytime.
                    </p>
                  ) : null}
                </div>
                <Link
                  href="/artist/marketplace"
                  className="block border border-accent bg-accent px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
                >
                  Browse the marketplace
                </Link>
              </div>
            ) : status === "PENDING" ? (
              <div className="space-y-md">
                <div className="border border-accent bg-paper p-md">
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
                    PayU payment processing
                  </p>
                  <p className="mt-xs text-body-sm text-ink-muted">
                    Your marketplace access will activate automatically after PayU confirms the payment.
                  </p>
                </div>
                <CancelPaymentButton />
              </div>
            ) : (
              <PayuCheckout
                type="GIG_WORK"
                referenceId={user.id}
                label={`Pay ${formatInr(amount)} with PayU`}
              />
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
