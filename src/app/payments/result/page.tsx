import Link from "next/link";
import { getCurrentUser } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";

type PageProps = { searchParams: Promise<{ status?: string; paymentId?: string; error?: string }> };

export const dynamic = "force-dynamic";

export default async function PaymentResultPage({ searchParams }: PageProps) {
  const query = await searchParams;
  const user = await getCurrentUser();
  const payment = user && query.paymentId
    ? await prisma.payment.findFirst({
        where: { id: query.paymentId, payerId: user.id },
        select: { status: true, type: true, providerStatus: true },
      })
    : null;

  const status = payment?.status === "PAID" ? "success" : payment?.status === "FAILED" ? "failure" : query.status ?? "pending";
  const title = status === "success" ? "Payment successful" : status === "failure" ? "Payment failed" : "Payment pending";
  const message = status === "success"
    ? "Your CYPHR payment has been confirmed and the related feature is now active."
    : status === "failure"
      ? query.error ?? "The payment was not completed. You can return and try again."
      : "PayU is still processing this payment. Refresh the relevant dashboard in a moment.";

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <div className="mx-auto max-w-xl border border-line bg-paper-soft p-xl text-center">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.18em] text-accent">CYPHR payments</p>
        <h1 className="mt-lg font-display text-display-lg uppercase">{title}</h1>
        <p className="mt-md text-body-md text-ink-muted">{message}</p>
        {payment?.type ? <p className="mt-md font-mono text-[0.65rem] uppercase text-ink-muted">{payment.type}</p> : null}
        <Link href={user?.role === "ORGANIZER" ? "/organizer" : "/artist"} className="mt-lg inline-block border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper">
          Return to dashboard
        </Link>
      </div>
    </main>
  );
}
