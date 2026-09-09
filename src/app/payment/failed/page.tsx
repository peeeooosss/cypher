import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatInr } from "@/lib/pricing";
import { SignOutButton } from "@/components/sign-out-button";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: Promise<{ txnid?: string; reason?: string }> };

export default async function PaymentFailedPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const txnid = params.txnid;
  const reason = params.reason ? decodeURIComponent(params.reason) : null;

  const payment = txnid
    ? await prisma.payment.findFirst({
        where: { merchantTransactionId: txnid },
        select: { amountPaise: true, currency: true, merchantTransactionId: true },
      })
    : null;

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <div className="flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Payment</p>
          <h1 className="font-display text-display-lg uppercase">Payment failed</h1>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-section border border-line bg-paper-soft p-lg">
        <p className="text-body-sm text-ink">
          {reason ? `Reason: ${reason}` : "The payment was not completed. No amount was charged."}
        </p>
        {payment ? (
          <p className="mt-sm text-body-sm text-ink-muted">
            Transaction {payment.merchantTransactionId} · {formatInr(payment.amountPaise / 100)} {payment.currency}
          </p>
        ) : null}
        <p className="mt-sm text-body-sm text-ink-muted">
          You can try again from your dashboard, or contact support if you believe this is a mistake.
        </p>
      </section>

      <div className="mt-lg flex flex-wrap gap-sm">
        <Link
          href="/"
          className="inline-block border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
        >
          Back to home
        </Link>
        <Link
          href="/login"
          className="inline-block border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:border-accent hover:text-accent"
        >
          Sign in to try again
        </Link>
      </div>
    </main>
  );
}