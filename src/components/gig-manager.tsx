"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate, formatExperience } from "@/lib/format";
import { SKILLS, SKILL_LABELS, skillLabel } from "@/lib/skills";
import { RazorpayCheckout } from "@/components/razorpay-checkout";
import { PaymentType } from "@/generated/prisma/enums";

type GigApplication = {
  id: string;
  status: string;
  message: string | null;
  createdAt: Date;
  artist: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
    style: string | null;
    crew: string | null;
    city: string | null;
    experience: string | null;
    socialHandle: string | null;
    skills: string[];
    minJudgingPricePerDay: number | null;
    minWorkshopPricePerDay: number | null;
    gigAvailability: { id: string; dateFrom: Date; dateTo: Date }[];
  };
  agreement: {
    id: string;
    status: string;
    offerAmount: number | null;
    paymentStatus: string;
  } | null;
};

type Gig = {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  location: string | null;
  budget: number | null;
  currency: string;
  startsAt: Date | null;
  status: string;
  feePaid: boolean;
  applications: GigApplication[];
};

export function GigManager({ gigs }: { gigs: Gig[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    const form = new FormData(event.currentTarget);
    const budget = Number(form.get("budget"));
    const startsAt = form.get("startsAt") as string;

    const res = await fetch("/api/gigs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: form.get("title"),
        description: form.get("description"),
        skillsRequired: selectedSkills,
        location: form.get("location") || undefined,
        budget: budget > 0 ? budget : undefined,
        currency: form.get("currency") || "INR",
        startsAt: startsAt ? new Date(startsAt).toISOString() : undefined,
      }),
    });

    setIsSubmitting(false);
    if (res.ok) {
      event.currentTarget.reset();
      setSelectedSkills([]);
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Failed to create gig.");
    }
  }

  async function updateGigStatus(gigId: string, status: string) {
    const res = await fetch(`/api/gigs/${gigId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) router.refresh();
  }

  async function rejectApplication(gigId: string, applicationId: string) {
    const res = await fetch(`/api/gigs/${gigId}/applications/${applicationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "REJECTED" }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="mt-section space-y-xl">
      <form className="border border-line bg-paper-soft p-lg" onSubmit={handleCreate}>
        <p className="font-display text-title-md uppercase">Post freelance work</p>
        <p className="mt-xs text-body-sm text-ink-muted">
          Create a gig and artists with matching skills can apply.
        </p>
        <div className="mt-lg grid gap-md md:grid-cols-2">
          <input required className="border border-line bg-paper px-md py-sm text-body-sm md:col-span-2" name="title" placeholder="Gig title — e.g. DJ for Saturday night" />
          <textarea required className="border border-line bg-paper px-md py-sm text-body-sm md:col-span-2" name="description" rows={4} placeholder="What does the gig involve? Details, date range, expectations." />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="location" placeholder="Location / city" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="startsAt" type="datetime-local" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="budget" placeholder="Budget / fee" type="number" min="0" />
          <input className="border border-line bg-paper px-md py-sm text-body-sm" name="currency" defaultValue="INR" placeholder="INR" />
        </div>
        <div className="mt-lg">
          <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Skills required</p>
          <div className="mt-xs flex flex-wrap gap-xs">
            {SKILLS.map((skill) => {
              const active = selectedSkills.includes(skill);
              return (
                <button
                  key={skill}
                  type="button"
                  onClick={() => toggleSkill(skill)}
                  className={`border px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] transition-colors ${
                    active
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-line text-ink-muted hover:border-accent"
                  }`}
                >
                  {SKILL_LABELS[skill]}
                </button>
              );
            })}
          </div>
          {selectedSkills.length === 0 ? (
            <p className="mt-sm text-body-sm text-accent">Select at least one skill.</p>
          ) : null}
        </div>
        {error ? <p className="mt-md text-body-sm text-accent">{error}</p> : null}
        <button
          className="mt-lg border border-accent bg-accent px-lg py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
          disabled={isSubmitting || selectedSkills.length === 0}
          type="submit"
        >
          {isSubmitting ? "Posting..." : "Post gig"}
        </button>
      </form>

      {gigs.length === 0 ? (
        <p className="border border-line p-lg text-body-sm text-ink-muted">No gigs posted yet.</p>
      ) : (
        gigs.map((gig) => (
          <article key={gig.id} className="border border-line bg-paper-soft p-lg">
            <div className="flex flex-wrap items-start justify-between gap-sm">
              <div>
                <h3 className="font-display text-title-md uppercase">{gig.title}</h3>
                <p className="mt-xs text-body-sm text-ink-muted">
                  {gig.location ?? "Location TBA"}
                  {gig.startsAt ? ` / ${formatDate(gig.startsAt)}` : ""} ·{" "}
                  <span className="text-accent">
                    {gig.budget && gig.budget > 0
                      ? gig.currency === "INR" ? `₹${gig.budget}` : `${gig.currency} ${gig.budget}`
                      : "Unpaid"}
                  </span>
                </p>
              </div>
              <div className="flex items-center gap-sm">
                {gig.feePaid ? (
                  <>
                    <span className="font-mono text-[0.65rem] uppercase text-ink-muted">{gig.status}</span>
                    {gig.status === "OPEN" ? (
                      <button
                        type="button"
                        className="border border-line px-sm py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent"
                        onClick={() => void updateGigStatus(gig.id, "CLOSED")}
                      >
                        Close
                      </button>
                    ) : null}
                  </>
                ) : (
                  <RazorpayCheckout
                    type={PaymentType.GIG_POST}
                    referenceId={gig.id}
                    label="Pay ₹149 to publish"
                    className="border border-accent bg-accent px-sm py-xs font-mono text-[0.65rem] uppercase text-paper"
                  />
                )}
              </div>
            </div>
            {!gig.feePaid ? (
              <p className="mt-sm text-body-sm text-accent">
                This gig is saved as a draft. Pay the ₹149 posting fee to publish it and let artists apply.
              </p>
            ) : null}
            <p className="mt-sm text-body-sm text-ink whitespace-pre-wrap">{gig.description}</p>
            <div className="mt-sm flex flex-wrap gap-xs">
              {gig.skillsRequired.map((skill) => (
                <span key={skill} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                  {skillLabel(skill)}
                </span>
              ))}
            </div>

            <div className="mt-lg border-t border-line pt-md">
              <p className="font-mono text-[0.7rem] uppercase text-ink-muted">
                Applicants ({gig.applications.length})
              </p>
              {gig.applications.length === 0 ? (
                <p className="mt-sm text-body-sm text-ink-muted">No applications yet.</p>
              ) : (
                <div className="mt-sm space-y-sm">
                  {gig.applications.map((application) => (
                    <div key={application.id} className="border border-line bg-paper p-md">
                      <div className="flex flex-wrap items-start justify-between gap-sm">
                        <div>
                          <div className="flex items-center gap-sm">
                            {application.artist.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={application.artist.avatarUrl}
                                alt={application.artist.name ?? "Artist"}
                                className="h-10 w-10 rounded-full border border-line object-cover"
                              />
                            ) : (
                              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-paper-soft font-display text-sm uppercase text-ink-muted">
                                {application.artist.name?.charAt(0) ?? "?"}
                              </div>
                            )}
                            <Link
                              href={`/artist/directory/${application.artist.id}`}
                              className="font-display text-title-sm uppercase hover:text-accent"
                            >
                              {application.artist.name ?? "Unnamed artist"}
                            </Link>
                          </div>
                          <p className="mt-xs text-body-sm text-ink-muted">
                            {[application.artist.style, application.artist.crew, application.artist.city, formatExperience(application.artist.experience)]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                          <div className="mt-sm flex flex-wrap gap-xs">
                            {application.artist.skills.map((skill) => (
                              <span key={skill} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                                {skillLabel(skill)}
                              </span>
                            ))}
                          </div>
                          {application.message ? (
                            <p className="mt-sm text-body-sm text-ink-muted">“{application.message}”</p>
                          ) : null}
                          {(application.artist.minJudgingPricePerDay != null ||
                            application.artist.minWorkshopPricePerDay != null) && (
                            <p className="mt-sm text-body-sm text-ink-muted">
                              Rates:{" "}
                              {application.artist.minJudgingPricePerDay != null
                                ? `Judging ₹${application.artist.minJudgingPricePerDay}/day`
                                : null}
                              {application.artist.minJudgingPricePerDay != null &&
                              application.artist.minWorkshopPricePerDay != null
                                ? " · "
                                : null}
                              {application.artist.minWorkshopPricePerDay != null
                                ? `Workshop ₹${application.artist.minWorkshopPricePerDay}/day`
                                : null}
                            </p>
                          )}
                          {application.artist.gigAvailability.length > 0 ? (
                            <p className="mt-xs text-body-sm text-ink-muted">
                              Available:{" "}
                              {application.artist.gigAvailability
                                .map((a) => `${formatDate(a.dateFrom)}–${formatDate(a.dateTo)}`)
                                .join(", ")}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex flex-col items-end gap-sm">
                          <span className={`font-mono text-[0.65rem] uppercase ${application.status === "ACCEPTED" ? "text-accent" : application.status === "REJECTED" ? "text-red-500" : "text-ink-muted"}`}>
                            {application.status}
                          </span>
                          {application.status === "PENDING" ? (
                            <div className="flex items-center gap-sm">
                              <OfferButton gig={gig} application={application} />
                              <button
                                type="button"
                                className="border border-line px-sm py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent"
                                onClick={() => void rejectApplication(gig.id, application.id)}
                              >
                                Reject
                              </button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                      {application.agreement ? (
                        <AgreementStatus application={application} />
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </article>
        ))
      )}
    </div>
  );
}

function OfferButton({ gig, application }: { gig: Gig; application: GigApplication }) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        className="border border-accent bg-accent px-sm py-xs font-mono text-[0.65rem] uppercase text-paper"
        onClick={() => setOpen(true)}
      >
        Send offer
      </button>
    );
  }

  return <OfferForm gig={gig} applicationId={application.id} onClose={() => setOpen(false)} />;
}

function OfferForm({
  gig,
  applicationId,
  onClose,
}: {
  gig: Gig;
  applicationId: string;
  onClose: () => void;
}) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSending(true);
    setNotice("");
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get("offerAmount"));
    const workDate = form.get("workDate") as string;

    const res = await fetch(`/api/gigs/${gig.id}/applications/${applicationId}/offer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offerAmount: amount > 0 ? amount : undefined,
        workDate: workDate ? new Date(workDate).toISOString() : undefined,
        location: form.get("location") || undefined,
        scope: form.get("scope") || undefined,
        deliverables: form.get("deliverables") || undefined,
        paymentTerms: form.get("paymentTerms") || undefined,
        cancellationTerms: form.get("cancellationTerms") || undefined,
      }),
    });
    setSending(false);
    if (res.ok) {
      router.refresh();
    } else {
      const body = await res.json().catch(() => null);
      setNotice(body?.error ?? "Failed to send offer.");
    }
  }

  return (
    <form
      className="mt-md space-y-sm border border-line bg-paper-soft p-md"
      onSubmit={submit}
    >
      <p className="font-mono text-[0.65rem] uppercase text-ink-muted">
        Work offer & agreement
      </p>
      <div className="grid gap-sm sm:grid-cols-2">
        <input className="border border-line bg-paper px-md py-sm text-body-sm" name="offerAmount" type="number" min={1} placeholder="Final fee (₹)" defaultValue={gig.budget ?? undefined} />
        <input className="border border-line bg-paper px-md py-sm text-body-sm" name="workDate" type="datetime-local" />
        <input className="border border-line bg-paper px-md py-sm text-body-sm sm:col-span-2" name="location" placeholder="Location / city" defaultValue={gig.location ?? undefined} />
      </div>
      <textarea className="w-full border border-line bg-paper px-md py-sm text-body-sm" name="scope" rows={2} placeholder="Scope of work" />
      <textarea className="w-full border border-line bg-paper px-md py-sm text-body-sm" name="deliverables" rows={2} placeholder="Deliverables" />
      <textarea className="w-full border border-line bg-paper px-md py-sm text-body-sm" name="paymentTerms" rows={2} placeholder="Payment terms (e.g. paid after event)" />
      <textarea className="w-full border border-line bg-paper px-md py-sm text-body-sm" name="cancellationTerms" rows={2} placeholder="Cancellation terms" />
      {notice ? <p className="text-body-sm text-accent">{notice}</p> : null}
      <div className="flex gap-sm">
        <button
          type="submit"
          className="border border-accent bg-accent px-md py-sm font-mono text-[0.65rem] font-bold uppercase tracking-[0.15em] text-paper disabled:opacity-60"
          disabled={sending}
        >
          {sending ? "Sending..." : "Send offer & sign agreement"}
        </button>
        <button
          type="button"
          className="border border-line px-md py-sm font-mono text-[0.65rem] uppercase tracking-[0.15em] text-ink-muted"
          onClick={onClose}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function AgreementStatus({ application }: { application: GigApplication }) {
  const router = useRouter();
  const agreement = application.agreement!;
  const label = agreementLabel(agreement.status);

  async function confirmPaid() {
    const res = await fetch(`/api/agreements/${agreement.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "CONFIRM_PAID" }),
    });
    if (res.ok) router.refresh();
  }

  return (
    <div className="mt-md border-t border-line pt-md">
      <p className="font-mono text-[0.65rem] uppercase text-accent">{label}</p>
      {agreement.offerAmount ? (
        <p className="mt-xs text-body-sm text-ink-muted">
          Agreed ₹{agreement.offerAmount} · Payment status {agreement.paymentStatus}
        </p>
      ) : null}
      {["ACTIVE", "COMPLETED"].includes(agreement.status) && agreement.paymentStatus !== "PAID" ? (
        <button
          type="button"
          className="mt-sm border border-line px-sm py-xs font-mono text-[0.65rem] uppercase text-ink-muted hover:border-accent hover:text-accent"
          onClick={() => void confirmPaid()}
        >
          Confirm payment sent
        </button>
      ) : null}
    </div>
  );
}

function agreementLabel(status: string): string {
  switch (status) {
    case "PENDING_ARTIST":
      return "Offer sent — awaiting artist acceptance";
    case "CONNECTION_PENDING":
      return "Artist accepted — awaiting connection fee";
    case "ACTIVE":
      return "Connected — chat unlocked";
    case "COMPLETED":
      return "Work completed";
    case "CANCELLED":
      return "Cancelled";
    case "EXPIRED":
      return "Expired";
    default:
      return status;
  }
}
