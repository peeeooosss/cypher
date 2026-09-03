"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatDate } from "@/lib/format";
import { SKILLS, SKILL_LABELS } from "@/lib/skills";
import { GIG_CONNECTION_FEE, GIG_WORK_FEE, formatInr } from "@/lib/pricing";
import { ManualPayment } from "@/components/manual-payment";
import { MessagesPanel } from "@/components/messages-panel";
import { BILL_WHATSAPP_NUMBER, whatsappLink } from "@/lib/payment";
import { responseError } from "@/lib/client-error";

type GigView = {
  id: string;
  title: string;
  description: string;
  skillsRequired: string[];
  location: string | null;
  budget: number | null;
  currency: string;
  startsAt: string | null;
  status: string;
  organizer: { name: string | null };
};

type AgreementView = {
  id: string;
  status: string;
  offerAmount: number | null;
  currency: string;
  scope: string | null;
  deliverables: string | null;
  workDate: string | null;
  location: string | null;
  cancellationTerms: string | null;
  paymentTerms: string | null;
  organizerSignedAt: string | null;
  artistSignedAt: string | null;
  connectionPaidAt: string | null;
  connectionPaymentStatus: string;
  connectionPaymentSentAt: string | null;
  workCompletedAt: string | null;
  paymentStatus: string;
  createdAt: string;
};

type ApplicationView = {
  id: string;
  status: string;
  message: string | null;
  createdAt: string;
  gig: {
    id: string;
    title: string;
    description: string;
    budget: number | null;
    currency: string;
    location: string | null;
    startsAt: string | null;
    status: string;
    skillsRequired: string[];
  };
  agreement: AgreementView | null;
};

type Tab = "browse" | "applications" | "offers" | "active" | "completed" | "earnings" | "messages";

const TABS: { key: Tab; label: string }[] = [
  { key: "browse", label: "Browse gigs" },
  { key: "applications", label: "Applications" },
  { key: "offers", label: "Offers" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "earnings", label: "Earnings" },
  { key: "messages", label: "Messages" },
];

export function MarketplaceDashboard({
  gigs,
  applications,
  gigWorkEnabled,
  gigWorkStatus = "NONE",
  gigWorkExpiresAt = null,
  unreadMessages = 0,
}: {
  gigs: GigView[];
  applications: ApplicationView[];
  gigWorkEnabled: boolean;
  gigWorkStatus?: "NONE" | "PENDING" | "VERIFIED";
  gigWorkExpiresAt?: string | null;
  unreadMessages?: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("browse");
  const [selectedSkills, setSelectedSkills] = useState<string[]>([]);
  const [applyingTo, setApplyingTo] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const appliedGigIds = useMemo(
    () => new Set(applications.map((a) => a.gig.id)),
    [applications],
  );

  const filtered = useMemo(() => {
    if (selectedSkills.length === 0) return gigs;
    return gigs.filter((gig) =>
      gig.skillsRequired.some((skill) => selectedSkills.includes(skill)),
    );
  }, [gigs, selectedSkills]);

  const offers = useMemo(
    () => applications.filter((a) => a.agreement && a.agreement.status === "PENDING_ARTIST"),
    [applications],
  );

  const pendingConnectionFees = useMemo(
    () =>
      applications.filter(
        (a) =>
          a.agreement &&
          a.agreement.status === "CONNECTION_PENDING" &&
          a.agreement.connectionPaymentStatus !== "VERIFIED",
      ),
    [applications],
  );

  const active = useMemo(
    () => applications.filter((a) => a.agreement && ["CONNECTION_PENDING", "ACTIVE"].includes(a.agreement.status)),
    [applications],
  );

  const completed = useMemo(
    () => applications.filter((a) => a.agreement && ["COMPLETED", "CANCELLED"].includes(a.agreement.status)),
    [applications],
  );

  const earnings = useMemo(() => {
    let totalAgreed = 0;
    let reported = 0;
    let confirmed = 0;
    for (const a of applications) {
      const amount = a.agreement?.offerAmount ?? 0;
      if (a.agreement && ["ACTIVE", "COMPLETED"].includes(a.agreement.status)) {
        totalAgreed += amount;
      }
      if (a.agreement && ["ARTIST_REPORTED", "PAID"].includes(a.agreement.paymentStatus)) {
        reported += amount;
      }
      if (a.agreement?.paymentStatus === "PAID") {
        confirmed += amount;
      }
    }
    return { totalAgreed, reported, confirmed };
  }, [applications]);

  function toggleSkill(skill: string) {
    setSelectedSkills((prev) =>
      prev.includes(skill) ? prev.filter((s) => s !== skill) : [...prev, skill],
    );
  }

  async function handleApply(gigId: string) {
    setNotice("");
    setBusyAction(`apply:${gigId}`);
    try {
      const res = await fetch(`/api/gigs/${gigId}/apply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim() || null }),
      });
      if (!res.ok) {
        setNotice(await responseError(res, "Failed to apply."));
        return;
      }
      setApplyingTo(null);
      setMessage("");
      router.refresh();
    } catch {
      setNotice("Network error. Please try again.");
    } finally {
      setBusyAction(null);
    }
  }

  async function runAgreement(agreementId: string, path: "accept" | "decline") {
    setNotice("");
    setBusyAction(`${path}:${agreementId}`);
    try {
      const res = await fetch(`/api/agreements/${agreementId}/${path}`, { method: "POST" });
      if (!res.ok) {
        setNotice(await responseError(res, "Action failed."));
        return;
      }
      if (path === "accept") setTab("active");
      router.refresh();
    } catch {
      setNotice("Network error. Please try again.");
    } finally {
      setBusyAction(null);
    }
  }

  async function updateStatus(agreementId: string, action: string) {
    setNotice("");
    setBusyAction(`${action}:${agreementId}`);
    try {
      const res = await fetch(`/api/agreements/${agreementId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        setNotice(await responseError(res, "Action failed."));
        return;
      }
      router.refresh();
    } catch {
      setNotice("Network error. Please try again.");
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <div className="mt-section">
      <div className="flex flex-wrap gap-sm border-b border-line pb-sm">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`border px-md py-xs font-mono text-[0.7rem] uppercase tracking-[0.15em] transition-colors ${
              tab === t.key ? "border-accent bg-accent/10 text-accent" : "border-line text-ink-muted hover:border-accent"
            }`}
          >
        {t.label}
        {t.key === "offers" && offers.length > 0 ? ` (${offers.length})` : ""}
        {t.key === "active" && pendingConnectionFees.length > 0 ? ` (${pendingConnectionFees.length})` : ""}
        {t.key === "messages" && unreadMessages > 0 ? ` (${unreadMessages})` : ""}
          </button>
        ))}
      </div>

      {notice ? <p className="mt-md text-body-sm text-accent">{notice}</p> : null}

      {!gigWorkEnabled && gigWorkStatus === "PENDING" ? (
        <div className="mt-lg flex flex-wrap items-center justify-between gap-md border border-accent bg-accent/10 p-lg">
          <div>
            <p className="font-display text-title-sm uppercase">Marketplace access — under review</p>
            <p className="mt-xs text-body-sm text-ink-muted">
              We received your payment and are verifying it. Your dashboard unlocks once confirmed.
            </p>
          </div>
          <div className="flex flex-wrap gap-sm">
            <Link href="/artist/gig-bill" className="border border-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent hover:bg-accent hover:text-paper">
              View bill
            </Link>
            <a
              href={whatsappLink(
                BILL_WHATSAPP_NUMBER,
                `Hi CYPHR, I've sent ${formatInr(GIG_WORK_FEE)} for Gig Work access. Attaching the payment screenshot for verification.`,
              )}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:border-accent hover:text-accent"
            >
              Send screenshot
            </a>
          </div>
        </div>
      ) : !gigWorkEnabled ? (
        <div className="mt-lg flex flex-wrap items-center justify-between gap-md border border-accent bg-accent/10 p-lg">
          <div>
            <p className="font-display text-title-sm uppercase">Unlock the Marketplace</p>
            <p className="mt-xs text-body-sm text-ink-muted">
              Pay {formatInr(GIG_WORK_FEE)} once for 3 months of marketplace access — browse gigs, send proposals, receive offers, and chat with organizers.
            </p>
          </div>
          <Link href="/artist/gig-bill" className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper">
            Unlock — {formatInr(GIG_WORK_FEE)} / 3 mo
          </Link>
        </div>
      ) : gigWorkExpiresAt ? (
        <div className="mt-lg border border-accent/40 bg-accent/5 p-lg">
          <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
            Marketplace access active
          </p>
          <p className="mt-xs text-body-sm text-ink-muted">
            Expires {new Date(gigWorkExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
      ) : null}

      {tab === "browse" && (
        <BrowseTab
          filtered={filtered}
          selectedSkills={selectedSkills}
          appliedGigIds={appliedGigIds}
           gigWorkEnabled={gigWorkEnabled}
           busyAction={busyAction}
          applyingTo={applyingTo}
          message={message}
          toggleSkill={toggleSkill}
          setApplyingTo={setApplyingTo}
          setMessage={setMessage}
          handleApply={handleApply}
        />
      )}

      {tab === "applications" && (
        <div className="mt-lg space-y-md">
          {applications.length === 0 ? (
            <p className="border border-line p-lg text-body-sm text-ink-muted">You haven&apos;t applied to any gigs yet.</p>
          ) : (
            applications.map((app) => (
              <article key={app.id} className="border border-line bg-paper-soft p-lg">
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <div>
                    <h3 className="font-display text-title-md uppercase">{app.gig.title}</h3>
                    <p className="mt-xs text-body-sm text-ink-muted">
                      {app.gig.location ?? "Location TBA"} · {formatFee(app.gig.budget, app.gig.currency)}
                    </p>
                  </div>
                  <span className={`font-mono text-[0.65rem] uppercase ${app.status === "ACCEPTED" ? "text-accent" : app.status === "REJECTED" ? "text-red-500" : "text-ink-muted"}`}>
                    {app.agreement ? app.agreement.status : app.status}
                  </span>
                </div>
                {app.message ? <p className="mt-sm text-body-sm text-ink-muted">Note: {app.message}</p> : null}
              </article>
            ))
          )}
        </div>
      )}

      {tab === "offers" && (
        <div className="mt-lg space-y-md">
          {offers.length === 0 ? (
            <p className="border border-line p-lg text-body-sm text-ink-muted">No offers waiting for your response.</p>
          ) : (
            offers.map((app) => (
              <article key={app.id} className="border border-line bg-paper-soft p-lg">
                <AgreementDetails agreement={app.agreement!} gigTitle={app.gig.title} />
                <div className="mt-lg flex flex-wrap gap-sm border-t border-line pt-md">
                  <button
                    type="button"
                    className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
                     disabled={busyAction !== null}
                     onClick={() => void runAgreement(app.agreement!.id, "accept")}
                  >
                    Accept offer
                  </button>
                  <button
                    type="button"
                    className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:border-accent hover:text-accent"
                     disabled={busyAction !== null}
                     onClick={() => void runAgreement(app.agreement!.id, "decline")}
                  >
                    Decline
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {tab === "active" && (
        <div className="mt-lg space-y-md">
          {active.length === 0 ? (
            <p className="border border-line p-lg text-body-sm text-ink-muted">No active work yet.</p>
          ) : (
            active.map((app) => (
              <article key={app.id} className="border border-line bg-paper-soft p-lg">
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <h3 className="font-display text-title-md uppercase">{app.gig.title}</h3>
                  <span className="font-mono text-[0.65rem] uppercase text-accent">{app.agreement!.status}</span>
                </div>
                <p className="mt-xs text-body-sm text-ink-muted">
                  Agreed {formatFee(app.agreement!.offerAmount, app.agreement!.currency)} · Payment {app.agreement!.paymentStatus}
                </p>
                {app.agreement!.status === "CONNECTION_PENDING" ? (
                  app.agreement!.connectionPaymentStatus === "PENDING" ? (
                    <div className="mt-md border border-accent bg-accent/10 p-md">
                      <p className="font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">
                        Payment sent — waiting for confirmation
                      </p>
                      <p className="mt-xs text-body-sm text-ink-muted">
                        We&apos;re verifying your connection fee transfer. Your private chat unlocks once confirmed.
                      </p>
                    </div>
                  ) : (
                    <div className="mt-md border border-accent bg-accent/10 p-md">
                      <p className="text-body-sm">
                        Pay the connection fee to unlock your private chat with the organizer.
                      </p>
                      <div className="mt-md">
                        <ManualPayment
                          amount={GIG_CONNECTION_FEE}
                          note={`Connection fee — ${app.gig.title}`}
                          submitUrl={`/api/agreements/${app.agreement!.id}/connection/submit`}
                          submitBody={{ method: "UPI" }}
                          buttonLabel={`I've paid ${formatInr(GIG_CONNECTION_FEE)} — send for verification`}
                        />
                      </div>
                    </div>
                  )
                ) : (
                  <div className="mt-md flex flex-wrap gap-sm border-t border-line pt-md">
                    <button
                      type="button"
                      className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:border-accent hover:text-accent"
                       disabled={busyAction !== null}
                       onClick={() => void updateStatus(app.agreement!.id, "WORK_COMPLETE")}
                    >
                      Mark work completed
                    </button>
                    <button
                      type="button"
                      className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:border-accent hover:text-accent"
                       disabled={busyAction !== null}
                       onClick={() => void updateStatus(app.agreement!.id, "REPORT_PAID")}
                    >
                      Report payment received
                    </button>
                  </div>
                )}
              </article>
            ))
          )}
        </div>
      )}

      {tab === "completed" && (
        <div className="mt-lg space-y-md">
          {completed.length === 0 ? (
            <p className="border border-line p-lg text-body-sm text-ink-muted">No completed work yet.</p>
          ) : (
            completed.map((app) => (
               <article key={app.id} className="border border-line bg-paper-soft p-lg">
                 <div className="flex flex-wrap items-start justify-between gap-sm">
                   <h3 className="font-display text-title-md uppercase">{app.gig.title}</h3>
                   <span className="font-mono text-[0.65rem] uppercase text-ink-muted">{app.agreement!.status}</span>
                 </div>
                 <p className="mt-xs text-body-sm text-ink-muted">
                   Agreed {formatFee(app.agreement!.offerAmount, app.agreement!.currency)} · Payment{" "}
                   {app.agreement!.paymentStatus === "PAID" ? (
                     <span className="font-bold text-accent">PAID ✓</span>
                   ) : app.agreement!.paymentStatus === "ARTIST_REPORTED" ? (
                     <span className="font-bold text-accent">Reported — awaiting organizer confirmation</span>
                   ) : (
                     <span className="text-ink-muted">Not reported</span>
                   )}
                 </p>
               </article>
            ))
          )}
        </div>
      )}

      {tab === "earnings" && (
        <div className="mt-lg grid grid-cols-2 gap-md sm:grid-cols-3">
          <Stat value={formatInr(earnings.totalAgreed)} label="Total agreed value" />
          <Stat value={formatInr(earnings.reported)} label="Payment reported" />
          <Stat value={formatInr(earnings.confirmed)} label="Payment confirmed" />
          <p className="col-span-full mt-sm text-body-sm text-ink-muted">
            Work payments are settled directly between you and the organizer. CYPHR does not hold or guarantee these payments.
          </p>
        </div>
      )}

      {tab === "messages" && <MessagesPanel role="ARTIST" />}
    </div>
  );
}

function BrowseTab(props: {
  filtered: GigView[];
  selectedSkills: string[];
  appliedGigIds: Set<string>;
  gigWorkEnabled: boolean;
  busyAction: string | null;
  applyingTo: string | null;
  message: string;
  toggleSkill: (s: string) => void;
  setApplyingTo: (id: string | null) => void;
  setMessage: (m: string) => void;
  handleApply: (id: string) => void;
}) {
  const { filtered, selectedSkills, appliedGigIds, gigWorkEnabled, busyAction, applyingTo, message, toggleSkill, setApplyingTo, setMessage, handleApply } = props;

  return (
    <>
      <div className="mt-lg">
        <p className="font-mono text-[0.7rem] uppercase text-ink-muted">Filter by skill</p>
        <div className="mt-sm flex flex-wrap gap-xs">
          {SKILLS.map((skill) => {
            const active = selectedSkills.includes(skill);
            return (
              <button
                key={skill}
                type="button"
                onClick={() => toggleSkill(skill)}
                className={`border px-sm py-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] transition-colors ${
                  active ? "border-accent bg-accent/10 text-accent" : "border-line text-ink-muted hover:border-accent"
                }`}
              >
                {SKILL_LABELS[skill]}
              </button>
            );
          })}
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="mt-lg border border-line p-xl text-body-sm text-ink-muted">
          No gigs match your filters. Try adding more skills or clearing the filter.
        </p>
      ) : (
        <div className="mt-lg grid gap-md lg:grid-cols-2">
          {filtered.map((gig) => {
            const applied = appliedGigIds.has(gig.id);
            return (
              <article key={gig.id} className="flex flex-col border border-line bg-paper-soft p-lg">
                <div className="flex flex-wrap items-start justify-between gap-sm">
                  <h3 className="font-display text-title-md uppercase">{gig.title}</h3>
                  <span className="font-mono text-[0.65rem] uppercase text-accent">{formatFee(gig.budget, gig.currency)}</span>
                </div>
                <p className="mt-sm text-body-sm text-ink-muted">
                  {gig.location ?? "Location TBA"}
                  {gig.startsAt ? ` / ${formatDate(new Date(gig.startsAt))}` : ""}
                </p>
                <div className="mt-sm flex flex-wrap gap-xs">
                  {gig.skillsRequired.map((skill) => (
                    <span key={skill} className="border border-line px-sm py-xs font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                      {SKILL_LABELS[skill as keyof typeof SKILL_LABELS] ?? skill}
                    </span>
                  ))}
                </div>
                <p className="mt-md text-body-sm text-ink whitespace-pre-wrap">{gig.description}</p>
                <p className="mt-md font-mono text-[0.6rem] uppercase tracking-[0.1em] text-ink-muted">
                  Posted by {gig.organizer.name ?? "Anonymous"} · {gig.status}
                </p>
                <div className="mt-auto pt-md">
                  {applied ? (
                    <p className="border border-accent bg-accent/10 px-md py-sm text-center font-mono text-[0.7rem] uppercase tracking-[0.15em] text-accent">Applied</p>
                  ) : applyingTo === gig.id ? (
                    <div className="space-y-sm">
                      <textarea
                        className="w-full border border-line bg-paper px-md py-sm text-body-sm"
                        rows={3}
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Short note to the organizer (optional)"
                      />
                      <div className="flex gap-sm">
                        <button
                           type="button"
                           className="border border-accent bg-accent px-md py-sm font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-paper"
                           disabled={busyAction === `apply:${gig.id}`}
                           onClick={() => void handleApply(gig.id)}
                         >
                           {busyAction === `apply:${gig.id}` ? "Submitting..." : "Submit proposal"}
                        </button>
                        <button
                          type="button"
                          className="border border-line px-md py-sm font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted"
                          onClick={() => {
                            setApplyingTo(null);
                            setMessage("");
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : !gigWorkEnabled ? (
                    <Link href="/artist/gig-bill" className="block border border-line px-md py-sm text-center font-mono text-[0.7rem] uppercase tracking-[0.15em] text-ink-muted hover:border-accent hover:text-accent">
                      Unlock Marketplace to apply
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className="block w-full border border-accent px-md py-sm text-center font-mono text-[0.7rem] font-bold uppercase tracking-[0.15em] text-accent transition-colors hover:bg-accent hover:text-paper"
                      onClick={() => setApplyingTo(gig.id)}
                    >
                      Apply to this gig
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}

function AgreementDetails({ agreement, gigTitle }: { agreement: AgreementView; gigTitle: string }) {
  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-sm">
        <h3 className="font-display text-title-md uppercase">{gigTitle}</h3>
        <span className="font-mono text-[0.65rem] uppercase text-accent">
          {formatFee(agreement.offerAmount, agreement.currency)}
        </span>
      </div>
      {agreement.workDate ? (
        <p className="mt-xs text-body-sm text-ink-muted">Work date: {formatDate(new Date(agreement.workDate))}</p>
      ) : null}
      {agreement.location ? <p className="mt-xs text-body-sm text-ink-muted">Location: {agreement.location}</p> : null}
      {agreement.scope ? (
        <div className="mt-md">
          <p className="font-mono text-[0.65rem] uppercase text-ink-muted">Scope</p>
          <p className="mt-xs text-body-sm whitespace-pre-wrap">{agreement.scope}</p>
        </div>
      ) : null}
      {agreement.deliverables ? (
        <div className="mt-md">
          <p className="font-mono text-[0.65rem] uppercase text-ink-muted">Deliverables</p>
          <p className="mt-xs text-body-sm whitespace-pre-wrap">{agreement.deliverables}</p>
        </div>
      ) : null}
      {agreement.paymentTerms ? (
        <div className="mt-md">
          <p className="font-mono text-[0.65rem] uppercase text-ink-muted">Payment terms</p>
          <p className="mt-xs text-body-sm whitespace-pre-wrap">{agreement.paymentTerms}</p>
        </div>
      ) : null}
      {agreement.cancellationTerms ? (
        <div className="mt-md">
          <p className="font-mono text-[0.65rem] uppercase text-ink-muted">Cancellation terms</p>
          <p className="mt-xs text-body-sm whitespace-pre-wrap">{agreement.cancellationTerms}</p>
        </div>
      ) : null}
      <p className="mt-md border-t border-line pt-md text-body-sm text-ink-muted">
        By accepting this offer you agree to the CYPHR work terms. CYPHR only provides the connection — final payment is settled directly between you and the organizer.
      </p>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="border border-line bg-paper-soft p-lg">
      <p className="font-display text-title-md text-accent">{value}</p>
      <p className="mt-xs font-mono text-[0.65rem] uppercase tracking-[0.1em] text-ink-muted">{label}</p>
    </div>
  );
}

function formatFee(budget: number | null, currency: string) {
  if (!budget || budget <= 0) return "Unpaid";
  return currency === "INR" ? `₹${budget}` : `${currency} ${budget}`;
}
