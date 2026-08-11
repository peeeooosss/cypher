import QRCode from "qrcode";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatFee } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { CartCategoryList } from "@/components/cart-claim";

export const dynamic = "force-dynamic";

type CartSearchParams = Promise<{ ids?: string }>;

function buildUpiUrl({
  upiId,
  name,
  amount,
  note,
}: {
  upiId: string;
  name: string;
  amount: number;
  note: string;
}) {
  const params = new URLSearchParams({
    pa: upiId,
    pn: name,
    am: String(amount),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

export default async function CartPage({ searchParams }: { searchParams: CartSearchParams }) {
  const { ids } = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const idList = ids
    ? ids.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  const registrations =
    idList.length > 0
      ? await prisma.registration.findMany({
          where: { id: { in: idList }, userId: user.id },
          include: {
            category: {
              select: {
                id: true,
                name: true,
                entryFee: true,
                entryCurrency: true,
                format: true,
                event: {
                  select: {
                    id: true,
                    title: true,
                    organizer: { select: { name: true, email: true, upiId: true } },
                  },
                },
              },
            },
            members: { include: { user: { select: { name: true, username: true } } } },
          },
          orderBy: { createdAt: "asc" },
        })
      : [];

  if (registrations.length === 0) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-paper px-sm py-section">
        <div className="w-full max-w-lg border border-line bg-paper-soft p-xl text-center">
          <p className="font-display text-title-md uppercase">Nothing to pay yet</p>
          <p className="mt-sm text-body-sm text-ink-muted">
            No pending registrations found for your account.
          </p>
          <Link
            href="/events"
            className="mt-lg inline-block border border-accent px-lg py-md text-body-sm font-bold uppercase text-accent"
          >
            Browse events
          </Link>
        </div>
      </main>
    );
  }

  const event = registrations[0].category.event;
  const total = registrations.reduce((sum, registration) => sum + (registration.category.entryFee ?? 0), 0);
  const rosterPending = registrations.some((registration) => registration.members.some((member) => member.status !== "ACCEPTED"));
  const organizer = event.organizer;

  let qrDataUrl: string | null = null;
  let upiLink: string | null = null;
  if (organizer.upiId) {
    upiLink = buildUpiUrl({
      upiId: organizer.upiId,
      name: organizer.name ?? "CYPHR Organizer",
      amount: total,
      note: `${event.title} entry`,
    });
    qrDataUrl = await QRCode.toDataURL(upiLink, { width: 280, margin: 1 });
  }

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-5xl px-md py-section md:px-xl">
        <p className="font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Checkout</p>
        <h1 className="mt-sm font-display text-display-xl uppercase">Pay your entry</h1>

        <div className="mt-section grid gap-section lg:grid-cols-[1fr_0.8fr]">
          <section className="border border-line">
            <div className="border-b border-line bg-paper-soft px-lg py-md">
              <p className="font-display text-title-md uppercase">{event.title}</p>
            </div>
            <CartCategoryList
              registrations={registrations.map((registration) => ({
                id: registration.id,
                name: registration.category.name,
                entryFee: registration.category.entryFee,
                entryCurrency: registration.category.entryCurrency,
                format: registration.category.format,
                teamName: registration.teamName,
                members: registration.members.map((member) => ({ name: member.user.name, username: member.user.username, status: member.status })),
                allMembersAccepted: registration.members.every((member) => member.status === "ACCEPTED"),
                paid: registration.paid,
                paidClaimedAt: registration.paidClaimedAt?.toISOString() ?? null,
              }))}
            />
            <div className="flex items-center justify-between gap-sm border-t border-line bg-paper-soft px-lg py-md">
              <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                Total
              </span>
              <span className="font-display text-display-lg uppercase text-accent">
                {formatFee(total, "INR")}
              </span>
            </div>
          </section>

          <aside className="border border-accent bg-paper-soft p-lg text-center">
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent">
              Scan to pay the organizer
            </p>
            {qrDataUrl && upiLink ? (
              <>
                <img
                  src={qrDataUrl}
                  alt={`UPI payment QR for ${organizer.name ?? event.title}`}
                  className="mx-auto mt-lg border border-line bg-white p-sm"
                  width={280}
                  height={280}
                />
                <p className="mt-lg font-display text-title-md uppercase">
                  {organizer.name ?? "Organizer"}
                </p>
                <p className="mt-xs font-mono text-[0.65rem] uppercase text-ink-muted">
                  {organizer.upiId}
                </p>
                <p className="mt-lg font-mono text-body-sm uppercase text-accent">
                  {formatFee(total, "INR")}
                </p>
                <a
                  href={upiLink}
                  className="mt-lg block border border-accent px-md py-sm text-body-sm font-bold uppercase text-accent hover:bg-accent hover:text-paper"
                >
                  Open UPI app
                </a>
                <p className="mt-lg text-body-sm leading-relaxed text-ink-muted">
                {rosterPending ? "Wait for every invited team member to accept before reporting payment." : <>Pay the exact amount above, tap{" "}
                  <span className="font-bold uppercase text-ink">I have paid</span> for each
                  category, then send your payment screenshot to{" "}
                  <span className="font-bold uppercase text-ink">{organizer.name ?? "the organizer"}</span>.
                  The organizer approves your entry.</>}
                </p>
              </>
            ) : (
              <div className="mt-lg border border-line p-lg">
                <p className="font-display text-title-md uppercase text-ink-muted">
                  Payment QR not set yet
                </p>
                <p className="mt-sm text-body-sm text-ink-muted">
                  The organizer has not added a payment UPI ID yet. Contact them to pay for
                  your entry.
                </p>
                <p className="mt-md font-mono text-body-sm uppercase text-accent">
                  {organizer.email}
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
