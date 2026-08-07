import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { COMMISSION_RATE, formatInr, isEventFlatFeePaid } from "@/lib/pricing";
import { PaymentMethods } from "@/components/payment-methods";
import { SendBillButton } from "@/components/send-bill-button";
import { SignOutButton } from "@/components/sign-out-button";
import {
  BILL_WHATSAPP_NUMBER,
  PAYMENT_NAME,
  PAYMENT_UPI_ID,
  whatsappLink,
} from "@/lib/payment";
import type { PaymentStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ eventId: string }> };

export default async function EventBillPage({ params }: PageProps) {
  const { eventId } = await params;
  const user = await requireRole("ORGANIZER");

  const event = await prisma.event.findFirst({
    where: { id: eventId, organizerId: user.id },
    select: {
      id: true,
      title: true,
      status: true,
      categoryCount: true,
      flatFee: true,
      flatFeePaid: true,
      flatFeePaidAt: true,
      flatFeePaymentStatus: true,
      flatFeePaymentMethod: true,
      flatFeePaymentSentAt: true,
      commissionPaid: true,
      commissionPaidAt: true,
      commissionPaymentStatus: true,
      commissionPaymentMethod: true,
      commissionPaymentSentAt: true,
      _count: { select: { categories: true } },
    },
  });

  if (!event) {
    notFound();
  }

  const categories = await prisma.category.findMany({
    where: { eventId },
    select: {
      id: true,
      name: true,
      registrations: {
        where: { status: "CONFIRMED" },
        select: { entryFee: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const commissionBreakdown = categories.map((category) => {
    const entryFeeSum = category.registrations.reduce((sum, r) => sum + (r.entryFee ?? 0), 0);
    return {
      id: category.id,
      name: category.name,
      registrations: category.registrations.length,
      entryFeeSum,
      commission: Math.round(entryFeeSum * COMMISSION_RATE),
    };
  });
  const commissionDue = commissionBreakdown.reduce((sum, c) => sum + c.commission, 0);

  const feePaid = isEventFlatFeePaid(event);
  const flatAmount = event.flatFee ?? 0;
  const flatStatus = event.flatFeePaymentStatus as PaymentStatus | null;
  const commStatus = event.commissionPaymentStatus as PaymentStatus | null;

  return (
    <main className="min-h-screen bg-paper px-md py-section md:px-xl">
      <Link href="/organizer" className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent">
        &larr; Back to events
      </Link>

      <div className="mt-lg flex flex-wrap items-end justify-between gap-md">
        <div>
          <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Event bill</p>
          <h1 className="font-display text-display-lg uppercase">{event.title}</h1>
          <p className="mt-sm text-body-sm text-ink-muted">
            {event.categoryCount ?? event._count.categories} categories · {event.status}
          </p>
        </div>
        <SignOutButton />
      </div>

      <section className="mt-section border border-line bg-paper-soft p-lg">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Billing</p>
        <div className="mt-md space-y-sm text-body-sm">
          <div className="flex justify-between">
            <span>Flat fee</span>
            {feePaid ? (
              <span className="font-mono text-accent">{formatInr(flatAmount)} paid</span>
            ) : (
              <span className="font-mono text-accent">
                <Link href="#flat-fee" className="underline">{formatInr(flatAmount)} — pay</Link>
              </span>
            )}
          </div>
          <div className="flex justify-between border-t border-line pt-sm">
            <span>Commission</span>
            {event.commissionPaid ? (
              <span className="font-mono text-accent">{formatInr(commissionDue)} paid</span>
            ) : commissionDue > 0 ? (
              <span className="font-mono text-accent">
                <Link href="#commission" className="underline">{formatInr(commissionDue)} — pay</Link>
              </span>
            ) : (
              <span className="font-mono text-ink-muted">1.5% at completion</span>
            )}
          </div>
        </div>
      </section>

      {!feePaid ? (
        <div id="flat-fee" className="mt-section grid gap-lg lg:grid-cols-2 scroll-mt-24">
          <div className="border border-line bg-paper-soft p-lg">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Flat fee to activate your event</p>
            <div className="mt-md space-y-sm text-body-sm">
              <div className="flex justify-between">
                <span>Categories</span>
                <span className="font-mono text-accent">{event.categoryCount ?? event._count.categories}</span>
              </div>
              <div className="flex justify-between">
                <span>Flat fee</span>
                <span className="font-mono text-accent">{flatAmount ? formatInr(flatAmount) : "—"}</span>
              </div>
              <div className="flex justify-between border-t border-line pt-sm">
                <span>Total due now</span>
                <span className="font-mono text-accent">{formatInr(flatAmount)}</span>
              </div>
            </div>
            <p className="mt-md text-body-sm text-ink-muted">
              Paid once at creation. Later, just 1.5% per confirmed entry fee — settled at event completion.
            </p>
          </div>

          <div className="border border-line p-lg">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Payment</p>
            <div className="mt-md">
              {feePaid ? (
                <p className="border border-accent bg-accent/10 px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
                  Payment verified
                </p>
              ) : flatStatus === "PENDING" ? (
                <div className="space-y-md">
                  <div className="border border-accent bg-paper p-md">
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
                      Payment sent — waiting for confirmation
                    </p>
                    <p className="mt-xs text-body-sm text-ink-muted">
                      We&apos;re verifying your transfer
                      {event.flatFeePaymentSentAt ? ` sent ${event.flatFeePaymentSentAt.toLocaleString()}` : ""}.
                      This usually takes a few minutes. Refresh this page later.
                    </p>
                  </div>
                  <a
                    href={whatsappLink(
                      BILL_WHATSAPP_NUMBER,
                      `Hi CYPHR, I've sent ${formatInr(flatAmount)} for the flat fee on "${event.title}". Attaching the payment screenshot for verification.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink hover:border-accent hover:text-accent"
                  >
                    Resend screenshot on WhatsApp
                  </a>
                </div>
              ) : (
                <div className="space-y-md">
                  <PaymentMethods
                    amount={flatAmount}
                    upiId={PAYMENT_UPI_ID}
                    payeeName={PAYMENT_NAME}
                    note={`CYPHR event flat fee - ${event.title}`}
                  />
                  <div className="border-t border-line pt-md">
                    <a
                      href={whatsappLink(
                        BILL_WHATSAPP_NUMBER,
                        `Hi CYPHR, I've sent ${formatInr(flatAmount)} for the flat fee on "${event.title}". Attaching the payment screenshot for verification.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink hover:border-accent hover:text-accent"
                    >
                      Send screenshot on WhatsApp
                    </a>
                    <SendBillButton eventId={event.id} mode="FLAT_FEE" />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div id="flat-fee" className="mt-section border border-accent bg-accent/10 p-lg scroll-mt-24">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
            Flat fee verified — event activated
            {event.flatFeePaidAt ? ` · ${event.flatFeePaidAt.toLocaleString()}` : ""}
          </p>
        </div>
      )}

      <section id="commission" className="mt-section border border-line p-lg scroll-mt-24">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Commission</p>
        <h2 className="mt-sm font-display text-title-md uppercase">Settle the 1.5% commission</h2>
        <p className="mt-sm text-body-sm text-ink-muted">
          Charged on confirmed entry fees and due before the event can be marked Completed.
        </p>

        {commissionDue > 0 ? (
          <div className="mt-lg grid gap-lg lg:grid-cols-2">
            <div className="space-y-sm text-body-sm">
              {commissionBreakdown.map((category) => (
                <div key={category.id} className="border border-line bg-paper-soft px-md py-sm">
                  <div className="flex flex-wrap items-center justify-between gap-sm">
                    <span className="font-bold uppercase">{category.name}</span>
                    <span className="font-mono text-accent">{formatInr(category.commission)}</span>
                  </div>
                  <p className="mt-xs text-body-sm text-ink-muted">
                    {category.registrations} entries · {formatInr(category.entryFeeSum)} entry fees × 1.5%
                  </p>
                </div>
              ))}
              <div className="flex justify-between border-t border-line pt-sm font-bold">
                <span>Total commission due</span>
                <span className="font-mono text-accent">{formatInr(commissionDue)}</span>
              </div>
            </div>

            <div>
              {event.commissionPaid ? (
                <div className="space-y-md">
                  <p className="border border-accent bg-accent/10 px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
                    Commission verified
                    {event.commissionPaidAt ? ` · ${event.commissionPaidAt.toLocaleString()}` : ""}
                  </p>
                  <Link
                    href={`/organizer/${event.id}`}
                    className="block border border-accent bg-accent px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
                  >
                    Continue to event dashboard
                  </Link>
                </div>
              ) : commStatus === "PENDING" ? (
                <div className="space-y-md">
                  <div className="border border-accent bg-paper p-md">
                    <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
                      Payment sent — waiting for confirmation
                    </p>
                    <p className="mt-xs text-body-sm text-ink-muted">
                      We&apos;re verifying your transfer
                      {event.commissionPaymentSentAt ? ` sent ${event.commissionPaymentSentAt.toLocaleString()}` : ""}.
                      This usually takes a few minutes. Refresh this page later.
                    </p>
                  </div>
                  <a
                    href={whatsappLink(
                      BILL_WHATSAPP_NUMBER,
                      `Hi CYPHR, I've sent ${formatInr(commissionDue)} for the commission on "${event.title}". Attaching the payment screenshot for verification.`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block border border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink hover:border-accent hover:text-accent"
                  >
                    Resend screenshot on WhatsApp
                  </a>
                </div>
              ) : (
                <div className="space-y-md">
                  <PaymentMethods
                    amount={commissionDue}
                    upiId={PAYMENT_UPI_ID}
                    payeeName={PAYMENT_NAME}
                    note={`CYPHR event commission - ${event.title}`}
                  />
                  <div className="border-t border-line pt-md">
                    <a
                      href={whatsappLink(
                        BILL_WHATSAPP_NUMBER,
                        `Hi CYPHR, I've sent ${formatInr(commissionDue)} for the commission on "${event.title}". Attaching the payment screenshot for verification.`,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block border border-line px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-ink hover:border-accent hover:text-accent"
                    >
                      Send screenshot on WhatsApp
                    </a>
                    <SendBillButton eventId={event.id} mode="COMMISSION" />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <p className="mt-lg border border-line p-lg text-body-sm text-ink-muted">
            No commission due yet — it&apos;s 1.5% of confirmed entry fees, settled when the event completes.
          </p>
        )}
      </section>

      <div className="mt-lg border border-line p-lg">
        <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">Next steps</p>
        <ol className="mt-md space-y-sm text-body-sm">
          <li>Pay the flat fee above to activate the event.</li>
          <li>Add categories, rounds, judges and prize pools.</li>
          <li>Publish the event so artists can register.</li>
          <li>At the end, settle the 1.5% commission and complete the event.</li>
        </ol>
      </div>
    </main>
  );
}
