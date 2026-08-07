import Link from "next/link";
import { getAdminGigPayments, getAdminPayments, requireAdmin } from "@/lib/admin";
import { formatInr, GIG_WORK_FEE } from "@/lib/pricing";
import { AdminPaymentActions } from "@/components/admin-payment-actions";
import type { PaymentStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

type PaymentRow = {
  key: string;
  type: "FLAT_FEE" | "COMMISSION" | "GIG";
  targetId: string;
  title: string;
  subjectName: string | null;
  amount: number;
  method: string | null;
  sentAt: Date | null;
  status: PaymentStatus;
  verifiedBy: string | null;
  paidAt: Date | null;
  regs: number;
  cats: number;
};

function toRows(events: Awaited<ReturnType<typeof getAdminPayments>>): PaymentRow[] {
  const rows: PaymentRow[] = [];

  for (const p of events) {
    const regs = p.categories.reduce((sum, c) => sum + c._count.registrations, 0);

    if (p.flatFeePaymentStatus === "PENDING" || p.flatFeePaid) {
      rows.push({
        key: `${p.id}-flat-fee`,
        type: "FLAT_FEE",
        targetId: p.id,
        title: p.title,
        subjectName: p.organizer.name,
        amount: p.flatFee ?? 0,
        method: p.flatFeePaymentMethod,
        sentAt: p.flatFeePaymentSentAt,
        status: p.flatFeePaid ? "VERIFIED" : (p.flatFeePaymentStatus as PaymentStatus),
        verifiedBy: p.flatFeePaymentVerifiedBy,
        paidAt: p.flatFeePaidAt,
        regs,
        cats: p._count.categories,
      });
    }

    if (p.commissionPaymentStatus === "PENDING" || p.commissionPaid) {
      rows.push({
        key: `${p.id}-commission`,
        type: "COMMISSION",
        targetId: p.id,
        title: p.title,
        subjectName: p.organizer.name,
        amount: p.commissionDue ?? 0,
        method: p.commissionPaymentMethod,
        sentAt: p.commissionPaymentSentAt,
        status: p.commissionPaid ? "VERIFIED" : (p.commissionPaymentStatus as PaymentStatus),
        verifiedBy: p.commissionPaymentVerifiedBy,
        paidAt: p.commissionPaidAt,
        regs,
        cats: p._count.categories,
      });
    }
  }

  return rows;
}

function gigRows(artists: Awaited<ReturnType<typeof getAdminGigPayments>>): PaymentRow[] {
  return artists.map((artist) => ({
    key: `${artist.id}-gig`,
    type: "GIG",
    targetId: artist.id,
    title: "Gig Work access",
    subjectName: artist.name,
    amount: GIG_WORK_FEE,
    method: artist.gigWorkPaymentMethod,
    sentAt: artist.gigWorkPaymentSentAt,
    status: artist.gigWorkPaidAt
      ? "VERIFIED"
      : ((artist.gigWorkPaymentStatus ?? "NONE") as PaymentStatus),
    verifiedBy: artist.gigWorkPaymentVerifiedBy,
    paidAt: artist.gigWorkPaidAt,
    regs: 0,
    cats: 0,
  }));
}

function typeLabel(type: PaymentRow["type"]) {
  switch (type) {
    case "COMMISSION":
      return "Commission";
    case "GIG":
      return "Gig work";
    default:
      return "Flat fee";
  }
}

function typeColor(type: PaymentRow["type"]) {
  return type === "FLAT_FEE" ? "text-ink-muted" : "text-accent";
}

function RowTitle({ row }: { row: PaymentRow }) {
  if (row.type === "GIG") {
    return (
      <Link className="font-bold uppercase hover:text-accent" href={`/admin/artists/${row.targetId}`}>
        {row.title}
      </Link>
    );
  }
  return (
    <Link className="font-bold uppercase hover:text-accent" href={`/organizer/${row.targetId}`}>
      {row.title}
    </Link>
  );
}

function RowSub({ row }: { row: PaymentRow }) {
  if (row.type === "GIG") {
    return <span className="ml-sm text-ink-muted">3-month artist access</span>;
  }
  return (
    <span className="ml-sm text-ink-muted">
      ({row.cats} cat · {row.regs} regs)
    </span>
  );
}

export default async function AdminPaymentsPage() {
  await requireAdmin();
  const [events, artists] = await Promise.all([getAdminPayments(), getAdminGigPayments()]);
  const rows = [...toRows(events), ...gigRows(artists)].sort((a, b) => {
    const aTime = (a.sentAt ?? a.paidAt)?.getTime() ?? 0;
    const bTime = (b.sentAt ?? b.paidAt)?.getTime() ?? 0;
    return bTime - aTime;
  });

  const pending = rows.filter((r) => r.status === "PENDING");
  const verified = rows.filter((r) => r.status === "VERIFIED");

  return (
    <div className="space-y-section">
      <div>
        <h2 className="font-display text-title-md uppercase">Pending verification</h2>
        {pending.length === 0 ? (
          <p className="mt-md border border-line p-lg text-ink-muted">No payments waiting for verification.</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full border border-line text-body-sm">
              <thead>
                <tr className="border-b border-line bg-paper-soft text-left">
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Type</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Subject</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Payer</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Amount</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Method</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Sent</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((row) => (
                  <tr key={row.key} className="border-b border-line">
                    <td className="px-md py-sm">
                      <span className={`font-mono text-[0.7rem] uppercase ${typeColor(row.type)}`}>
                        {typeLabel(row.type)}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <RowTitle row={row} />
                      <RowSub row={row} />
                    </td>
                    <td className="px-md py-sm">{row.subjectName ?? "—"}</td>
                    <td className="px-md py-sm font-mono text-accent">{formatInr(row.amount)}</td>
                    <td className="px-md py-sm">{row.method ?? "—"}</td>
                    <td className="px-md py-sm">{row.sentAt ? row.sentAt.toLocaleString() : "—"}</td>
                    <td className="px-md py-sm">
                      <AdminPaymentActions
                        id={row.targetId}
                        status={row.status}
                        type={row.type}
                        scope={row.type === "GIG" ? "gig-work" : "event"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div>
        <h2 className="font-display text-title-md uppercase">Verified payments</h2>
        {verified.length === 0 ? (
          <p className="mt-md border border-line p-lg text-ink-muted">No verified payments yet.</p>
        ) : (
          <div className="mt-md overflow-x-auto">
            <table className="w-full border border-line text-body-sm">
              <thead>
                <tr className="border-b border-line bg-paper-soft text-left">
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Type</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Subject</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Payer</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Amount</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Paid</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Verified by</th>
                  <th className="px-md py-sm font-mono text-[0.7rem] uppercase text-ink-muted">Actions</th>
                </tr>
              </thead>
              <tbody>
                {verified.map((row) => (
                  <tr key={row.key} className="border-b border-line">
                    <td className="px-md py-sm">
                      <span className={`font-mono text-[0.7rem] uppercase ${typeColor(row.type)}`}>
                        {typeLabel(row.type)}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <RowTitle row={row} />
                      <RowSub row={row} />
                    </td>
                    <td className="px-md py-sm">{row.subjectName ?? "—"}</td>
                    <td className="px-md py-sm font-mono text-accent">{formatInr(row.amount)}</td>
                    <td className="px-md py-sm">{row.paidAt ? row.paidAt.toLocaleString() : "—"}</td>
                    <td className="px-md py-sm">{row.verifiedBy ?? "—"}</td>
                    <td className="px-md py-sm">
                      <AdminPaymentActions
                        id={row.targetId}
                        status={row.status}
                        type={row.type}
                        scope={row.type === "GIG" ? "gig-work" : "event"}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
