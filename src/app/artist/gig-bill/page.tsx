import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { formatInr, getPricingConfig } from "@/lib/pricing";
import { PayUCheckout } from "@/components/payu-checkout";
import { PendingVerification } from "@/components/pending-verification";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

export default async function ArtistGigBillPage() {
  const user = await requireRole("ARTIST");

  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      username: true,
      gigWorkPaymentStatus: true,
      gigWorkPaidAt: true,
      gigWorkExpiresAt: true,
    },
  });

  const sender = [me?.name, me?.username].filter(Boolean).join(" ") || undefined;

  const gigWorkFee = (await getPricingConfig()).gigWorkFee;

  const verified =
    me?.gigWorkPaymentStatus === "VERIFIED" || me?.gigWorkPaidAt != null;
  const pending = me?.gigWorkPaymentStatus === "PENDING" && !verified;

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
        </div>
        <SignOutButton />
      </div>

      {verified ? (
        <section className="mt-section border border-accent bg-accent/10 p-lg">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
            Marketplace access active
          </p>
          {me?.gigWorkExpiresAt ? (
            <p className="mt-xs text-body-sm text-ink-muted">
              Expires{" "}
              {me.gigWorkExpiresAt.toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          ) : null}
          <Link
            href="/artist/marketplace"
            className="mt-lg inline-block border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
          >
            Go to marketplace
          </Link>
        </section>
      ) : pending ? (
        <section className="mt-section border border-accent bg-accent/10 p-lg">
          <PendingVerification
            label={formatInr(gigWorkFee)}
            context="Gig Work marketplace access"
            sender={sender}
          />
        </section>
      ) : (
        <section className="mt-section grid gap-lg lg:grid-cols-2">
          <div className="border border-line bg-paper-soft p-lg">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
              Marketplace access
            </p>
            <p className="mt-sm text-body-sm text-ink-muted">
              Pay {formatInr(gigWorkFee)} once for 3 months of marketplace access — browse
              gigs, send proposals, receive offers, and chat with organizers.
            </p>
            <div className="mt-md space-y-sm text-body-sm">
              <div className="flex justify-between">
                <span>Gig work fee</span>
                <span className="font-mono text-accent">{formatInr(gigWorkFee)}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-sm">
                <span>Total due now</span>
                <span className="font-mono text-accent">{formatInr(gigWorkFee)}</span>
              </div>
            </div>
          </div>
          <div className="border border-line p-lg">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
              Payment
            </p>
            <div className="mt-md">
              <PayUCheckout
                purpose="GIG_WORK"
                amountInr={gigWorkFee}
                productInfo="Gig Work marketplace access — 3 months"
                buttonLabel={`Pay ${formatInr(gigWorkFee)} with PayU`}
                fullWidth
              />
            </div>
          </div>
        </section>
      )}
    </main>
  );
}