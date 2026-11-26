import QRCode from "qrcode";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { formatFee } from "@/lib/format";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/rbac";
import { formatLabel } from "@/lib/event-types";
import { whatsappLink, displayName, BILL_WHATSAPP_NUMBER } from "@/lib/payment";
import { isCustomAuditionEvent, buildStructuredVerifyMessage } from "@/lib/audition-events";
import { CategoryFormat } from "@/generated/prisma/enums";
import { CartCategoryList } from "@/components/cart-claim";
import { CartSubmit } from "@/components/cart-submit";
import { UpiButtons } from "@/components/upi-buttons";

export const dynamic = "force-dynamic";

type CartSearchParams = Promise<{
  ids?: string;
  cats?: string;
  event?: string;
  team?: string;
  choreo?: string;
  addr?: string;
  age?: string;
  city?: string;
  musicUrl?: string;
  musicKey?: string;
  musicName?: string;
  musicSize?: string;
  musicType?: string;
  members?: string;
}>;

function resolveFormat(format: CategoryFormat | string | null, eventType: string | null) {
  if (format) return format;
  return eventType === "UNDERGROUND_BATTLE" ? CategoryFormat.BATTLE_1V1 : CategoryFormat.SOLO;
}

async function PaymentAside({
  organizerName,
  organizerEmail,
  organizerUpiId,
  organizerWhatsapp,
  eventTitle,
  total,
  note,
  sender,
  messageExtra,
  customMessage,
  children,
}: {
  organizerName: string | null;
  organizerEmail: string | null;
  organizerUpiId: string | null;
  organizerWhatsapp: string | null | undefined;
  eventTitle: string;
  total: number;
  note: string;
  sender?: string | null;
  messageExtra?: string | null;
  customMessage?: string | null;
  children?: ReactNode;
}) {
  let qrDataUrl: string | null = null;
  let upiId: string | null = null;
  if (organizerUpiId) {
    upiId = organizerUpiId;
    const upiParams = new URLSearchParams({
      pa: organizerUpiId,
      pn: organizerName ?? "CYPHR Organizer",
      am: String(total),
      cu: "INR",
      tn: `${eventTitle} entry`,
    });
    try {
      qrDataUrl = await QRCode.toDataURL(`upi://pay?${upiParams.toString()}`, { width: 280, margin: 1 });
    } catch (error) {
      console.error(error);
      qrDataUrl = null;
      upiId = null;
    }
  }

  return (
    <aside className="border border-accent bg-paper-soft p-lg text-center">
      <p className="font-mono text-[0.7rem] uppercase tracking-[0.2em] text-accent">
        Scan to pay the organizer
      </p>
      {qrDataUrl && upiId ? (
        <>
          <img
            src={qrDataUrl}
            alt={`UPI payment QR for ${organizerName ?? eventTitle}`}
            className="mx-auto mt-lg border border-line bg-white p-sm"
            width={280}
            height={280}
          />
          <p className="mt-lg font-display text-title-md uppercase">
            {organizerName ?? "Organizer"}
          </p>
          <p className="mt-lg font-mono text-body-sm uppercase text-accent">
            {formatFee(total, "INR")}
          </p>
          <UpiButtons
            upiId={upiId}
            payeeName={organizerName ?? "CYPHR Organizer"}
            amount={total}
            note={`${eventTitle} entry`}
          />
          <p className="mt-lg text-body-sm leading-relaxed text-ink-muted">{note}</p>
          {children}
          {!children && organizerWhatsapp ? (
            <Link
              href={whatsappLink(
                organizerWhatsapp,
                customMessage ??
                  `Hi ${organizerName ?? "Organizer"}, I'm ${sender ?? "a participant"}. I've paid ${formatFee(total, "INR")} for ${eventTitle} entry.${messageExtra ? ` ${messageExtra}` : ""} Sharing my payment screenshot for verification.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-lg block w-full border border-accent px-md py-sm text-body-sm font-bold uppercase text-accent hover:bg-accent hover:text-paper"
            >
              Open WhatsApp
            </Link>
          ) : null}
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
            {organizerEmail}
          </p>
        </div>
      )}
    </aside>
  );
}

export default async function CartPage({ searchParams }: { searchParams: CartSearchParams }) {
  const params = await searchParams;
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const draftCategoryIds = params.cats
    ? params.cats.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  const idList = params.ids
    ? params.ids.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  if (draftCategoryIds.length > 0) {
    if (!params.event) {
      redirect("/events");
    }
    const [event, memberUsers, captain] = await Promise.all([
      prisma.event.findUnique({
        where: { id: params.event },
        select: {
          id: true,
          slug: true,
          title: true,
          eventType: true,
          organizer: { select: { name: true, studioName: true, email: true, upiId: true, whatsappNumber: true } },
          categories: {
            where: { id: { in: draftCategoryIds } },
            select: {
              id: true,
              name: true,
              entryFee: true,
              entryCurrency: true,
              format: true,
              minMembers: true,
              maxMembers: true,
            },
          },
        },
      }),
      params.members
        ? prisma.user.findMany({
            where: { id: { in: params.members.split(",").map((id) => id.trim()).filter(Boolean) } },
            select: { id: true, name: true, username: true },
          })
        : Promise.resolve([]),
      prisma.user.findUnique({
        where: { id: user.id },
        select: { name: true, username: true },
      }),
    ]);

    if (!event || event.categories.length === 0) {
      redirect("/events");
    }

    const total = event.categories.reduce((sum, category) => sum + (category.entryFee ?? 0), 0);
    const organizer = event.organizer;
    const teamName = params.team?.trim();
    const choreographerName = params.choreo?.trim();
    const address = params.addr?.trim();
    const age = params.age ? Number(params.age) : undefined;
    const auditionCity = params.city?.trim();
    const musicFileUrl = params.musicUrl?.trim();
    const musicFileKey = params.musicKey?.trim();
    const musicFileName = params.musicName?.trim();
    const musicFileSize = params.musicSize ? Number(params.musicSize) : undefined;
    const musicMimeType = params.musicType?.trim();
    const messageExtra = [teamName ? `Team: ${teamName}.` : null].filter(Boolean).join(" ");

    const senderName = displayName(captain?.name, captain?.username) ?? "a participant";
    const customMessage = isCustomAuditionEvent(event.slug)
      ? buildStructuredVerifyMessage({
          studio: organizer.studioName ?? organizer.name ?? "Organizer",
          sender: senderName,
          age: Number.isFinite(age) ? age : null,
          city: auditionCity || null,
          team: teamName || null,
          choreographer: choreographerName || null,
          categories: event.categories.map((c) => c.name).join(", "),
          payment: formatFee(total, "INR"),
          musicFileName: musicFileName || null,
          musicFileUrl: musicFileUrl || null,
        })
      : null;
    const verifyHref = whatsappLink(
      organizer.whatsappNumber ?? BILL_WHATSAPP_NUMBER,
      customMessage ?? `Hi ${organizer.name ?? "Organizer"}, I'm ${senderName}. I've paid ${formatFee(total, "INR")} for ${event.title} entry.${messageExtra ? ` ${messageExtra}` : ""} Sharing my payment screenshot for verification.`,
    );

    return (
      <main className="min-h-screen bg-paper">
        <div className="mx-auto max-w-5xl px-md py-section md:px-xl">
          <Link
            href={`/events/${event.slug}/register`}
            className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
          >
            &larr; Go back
          </Link>
          <p className="mt-lg font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Checkout</p>
          <h1 className="mt-sm font-display text-display-xl uppercase">Pay your entry</h1>

          <div className="mt-section grid gap-section lg:grid-cols-[1fr_0.8fr]">
            <section className="border border-line">
              <div className="border-b border-line bg-paper-soft px-lg py-md">
                <p className="font-display text-title-md uppercase">{event.title}</p>
                {teamName ? <p className="mt-xs font-mono text-[0.7rem] uppercase tracking-[0.1em] text-accent">{teamName}</p> : null}
                {Number.isFinite(age) ? <p className="mt-xs font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-muted">Age: {age}</p> : null}
                {auditionCity ? <p className="mt-xs font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-muted">City: {auditionCity}</p> : null}
                {choreographerName ? <p className="mt-xs font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-muted">Choreographer: {choreographerName}</p> : null}
                {musicFileName ? <p className="mt-xs font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-muted">Music: {musicFileName}</p> : null}
              </div>
              <ul className="divide-y divide-line">
                {event.categories.map((category) => (
                  <li key={category.id} className="flex items-center justify-between gap-md px-lg py-md">
                    <div>
                      <p className="font-display text-title-md uppercase">{category.name}</p>
                      <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-accent">
                        {formatLabel(resolveFormat(category.format, event.eventType))} ·{" "}
                        {category.minMembers === category.maxMembers
                          ? category.minMembers
                          : `${category.minMembers}–${category.maxMembers}`}{" "}
                        members
                      </p>
                    </div>
                    <span className="font-mono text-body-sm uppercase text-accent">
                      {formatFee(category.entryFee, category.entryCurrency)}
                    </span>
                  </li>
                ))}
              </ul>
              {memberUsers.length > 0 ? (
                <div className="border-t border-line px-lg py-md">
                  <p className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-muted">
                    Roster
                  </p>
                  <div className="mt-sm space-y-xs">
                    <div className="flex items-center justify-between text-body-sm">
                      <span>
                        You — captain{" "}
                        {captain?.name ?? (captain?.username ? `@${captain.username}` : null)}
                      </span>
                      <span className="font-mono text-[0.65rem] uppercase text-accent">Accepted</span>
                    </div>
                    {memberUsers.map((member) => (
                      <div className="flex items-center justify-between text-body-sm" key={member.id}>
                        <span>
                          {member.name ?? "Unnamed"}{" "}
                          {member.username ? (
                            <span className="font-mono text-[0.65rem] text-ink-muted">@{member.username}</span>
                          ) : null}
                        </span>
                        <span className="font-mono text-[0.65rem] uppercase text-ink-muted">Invited</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-sm border-t border-line bg-paper-soft px-lg py-md">
                <span className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted">
                  Total
                </span>
                <span className="font-display text-display-lg uppercase text-accent">
                  {formatFee(total, "INR")}
                </span>
              </div>
            </section>

            {await PaymentAside({
              organizerName: organizer.name,
              organizerEmail: organizer.email,
              organizerUpiId: organizer.upiId,
              organizerWhatsapp: organizer.whatsappNumber,
              eventTitle: event.title,
              total,
              sender: displayName(captain?.name, captain?.username),
              messageExtra: messageExtra || null,
              customMessage,
              note: isCustomAuditionEvent(event.slug)
                ? "Pay the exact amount above, then tap Paid & Verify Now. This reports your payment to the organizer dashboard and opens WhatsApp so you can send your screenshot."
                : "Pay the exact amount above, then tap Paid & Verify Now. This reports your payment to the organizer dashboard and opens WhatsApp so you can send your screenshot.",
              children: (
                <CartSubmit
                  eventId={event.id}
                  categoryIds={event.categories.map((category) => category.id)}
                  teamName={teamName ?? undefined}
                  choreographerName={choreographerName ?? undefined}
                  address={address || undefined}
                  age={Number.isFinite(age) ? age : undefined}
                  auditionCity={auditionCity || undefined}
                  musicFileUrl={musicFileUrl || undefined}
                  musicFileKey={musicFileKey || undefined}
                  musicFileName={musicFileName || undefined}
                  musicFileSize={Number.isFinite(musicFileSize) ? musicFileSize : undefined}
                  musicMimeType={musicMimeType || undefined}
                  memberIds={memberUsers.map((member) => member.id)}
                  total={total}
                  verifyHref={verifyHref}
                />
              ),
            })}
          </div>
        </div>
      </main>
    );
  }

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
                    slug: true,
                    title: true,
          organizer: { select: { name: true, studioName: true, email: true, upiId: true, whatsappNumber: true } },
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
        <div className="w-full max-w-2xl border border-line bg-paper-soft p-xl text-center">
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
  const me = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, username: true },
  });
  const sender = displayName(me?.name, me?.username);

  const idsCustomMessage = isCustomAuditionEvent(event.slug)
    ? buildStructuredVerifyMessage({
        studio: organizer.studioName ?? organizer.name ?? "Organizer",
        sender: sender ?? "a participant",
        age: registrations.map((r) => r.age).find((v) => v != null) ?? null,
        city: registrations.map((r) => r.auditionCity).find(Boolean) ?? null,
        team: registrations.map((r) => r.teamName).find(Boolean) ?? null,
        choreographer: registrations.map((r) => r.choreographerName).find(Boolean) ?? null,
        categories: [...new Set(registrations.map((r) => r.category.name))].join(", "),
        payment: formatFee(total, "INR"),
        musicFileName: registrations.map((r) => r.musicFileName).find(Boolean) ?? null,
        musicFileUrl: registrations.map((r) => r.musicFileUrl).find(Boolean) ?? null,
      })
    : null;

  return (
    <main className="min-h-screen bg-paper">
      <div className="mx-auto max-w-5xl px-md py-section md:px-xl">
        <Link
          href={`/events/${event.slug}/register`}
          className="font-mono text-body-sm uppercase text-ink-muted hover:text-accent"
        >
          &larr; Go back
        </Link>
        <p className="mt-lg font-mono text-body-sm uppercase tracking-[0.18em] text-accent">Checkout</p>
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
                choreographerName: registration.choreographerName,
                age: registration.age,
                auditionCity: registration.auditionCity,
                musicFileName: registration.musicFileName,
                musicFileUrl: registration.musicFileUrl,
                members: registration.members.map((member) => ({ name: member.user.name, username: member.user.username, status: member.status })),
                allMembersAccepted: registration.members.every((member) => member.status === "ACCEPTED"),
                paid: registration.paid,
                paidClaimedAt: registration.paidClaimedAt?.toISOString() ?? null,
              }))}
              eventTitle={event.title}
              total={total}
              organizerWhatsapp={organizer.whatsappNumber}
              organizerName={organizer.name}
              organizerStudioName={organizer.studioName}
              eventSlug={event.slug}
              sender={sender}
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

          {await PaymentAside({
            organizerName: organizer.name,
            organizerEmail: organizer.email,
            organizerUpiId: organizer.upiId,
            organizerWhatsapp: organizer.whatsappNumber,
            eventTitle: event.title,
            total,
            sender,
            customMessage: idsCustomMessage,
            note: rosterPending
              ? "Wait for every invited team member to accept before reporting payment."
              : "Pay the exact amount above, tap Paid & Verify Now for each category. This reports payment to the organizer dashboard and opens WhatsApp for your screenshot.",
          })}
        </div>
      </div>
    </main>
  );
}
