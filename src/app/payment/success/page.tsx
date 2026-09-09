import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatInr } from "@/lib/pricing";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ txnid?: string }> };

function purposeTarget(purpose: string | undefined, metadata: unknown) {
  const meta = (metadata ?? {}) as Record<string, unknown>;
  if (purpose === "GIG_WORK") return { href: "/artist/marketplace", label: "Go to marketplace" };
  if (purpose === "GIG_POST") return { href: "/organizer/gigs", label: "Go to my gigs" };
  if (purpose === "GIG_CONNECTION") return { href: "/artist/marketplace", label: "Go to marketplace" };
  if (typeof meta.eventId === "string") {
    return { href: `/organizer/${meta.eventId}`, label: "Go to event dashboard" };
  }
  return { href: "/", label: "Back to home" };
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const txnid = params.txnid;

  const payment = txnid
    ? await prisma.payment.findFirst({
        where: { merchantTransactionId: txnid },
        select: {
          amountPaise: true,
          currency: true,
          status: true,
          metadata: true,
          merchantTransactionId: true,
          providerPaymentId: true,
          payuPaymentId: true,
          payuVerifiedAt: true,
        },
      })
    : null;

  if (!payment) {
    return (
      <main className="min-h-screen bg-paper px-md py-section md:px-xl">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Payment</p>
        <h1 className="mt-lg font-display text-display-lg uppercase">Receipt not found</h1>
        <p className="mt-sm text-body-sm text-ink-muted">
          We couldn&apos;t find a matching payment for this transaction. If you just paid, give it a few seconds and contact support.
        </p>
        <Link href="/" className="mt-lg inline-block border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper">
          Back to home
        </Link>
      </main>
    );
  }

  const meta = (payment.metadata ?? {}) as Record<string, unknown>;
  const target = purposeTarget(meta.purpose as string | undefined, meta);

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Payment</p>
          <h1 className="font-display text-display-lg uppercase">Payment successful</h1>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-section border border-accent bg-accent/10 p-lg">
        <p className="font-display text-title-md uppercase text-accent">
          {formatInr(payment.amountPaise / 100)} {payment.currency} received ✓
        </p>
        <div className="mt-md font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-muted">
          {payment.status === "PAID" ? (
            <p>Status: confirmed</p>
          ) : (
            <p>Status: processing — this page will refresh once confirmed</p>
          )}
        </div>
      </section>

      <section className="mt-section border border-line bg-paper-soft p-lg">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Transaction details</p>
        <div className="mt-md space-y-sm text-body-sm">
          <div className="flex justify-between">
            <span className="text-ink-muted">Transaction ID</span>
            <span className="font-mono">{payment.merchantTransactionId ?? "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-muted">PayU reference</span>
            <span className="font-mono">{payment.payuPaymentId ?? payment.providerPaymentId ?? "—"}</span>
          </div>
          {payment.payuVerifiedAt ? (
            <div className="flex justify-between">
              <span className="text-ink-muted">Verified</span>
              <span className="font-mono">{payment.payuVerifiedAt.toLocaleString()}</span>
            </div>
          ) : null}
        </div>
      </section>

      <Link
        href={target.href}
        className="mt-lg block border border-accent bg-accent px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
      >
        {target.label}
      </Link>
    </main>
  );
}