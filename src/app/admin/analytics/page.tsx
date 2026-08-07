import { getAdminAnalytics, requireAdmin } from "@/lib/admin";
import { formatInr } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function AdminAnalyticsPage() {
  await requireAdmin();
  const analytics = await getAdminAnalytics();

  return (
    <div className="space-y-section">
      <div className="grid gap-md lg:grid-cols-2">
        <div>
          <h2 className="font-display text-title-md uppercase">Registrations by month</h2>
          <BarChart
            data={analytics.registrationsByMonth.map((d) => ({ label: d.month, value: d.count }))}
            formatValue={(v) => String(v)}
            height={180}
          />
        </div>
        <div>
          <h2 className="font-display text-title-md uppercase">Events created by month</h2>
          <BarChart
            data={analytics.eventsByMonth.map((d) => ({ label: d.month, value: d.count }))}
            formatValue={(v) => String(v)}
            height={180}
          />
        </div>
      </div>

      <div className="grid gap-md lg:grid-cols-2">
        <div>
          <h2 className="font-display text-title-md uppercase">Flat fee revenue by month</h2>
          <BarChart
            data={analytics.revenueByMonth.map((d) => ({ label: d.month, value: d.revenue }))}
            formatValue={(v) => formatInr(v)}
            height={200}
          />
        </div>
        <div>
          <h2 className="font-display text-title-md uppercase">Commission revenue by month</h2>
          <BarChart
            data={analytics.commissionRevenueByMonth.map((d) => ({ label: d.month, value: d.revenue }))}
            formatValue={(v) => formatInr(v)}
            height={200}
          />
        </div>
      </div>

      <div className="grid gap-md lg:grid-cols-2">
        <div>
          <h2 className="font-display text-title-md uppercase">Gig work revenue by month</h2>
          <BarChart
            data={analytics.gigWorkRevenueByMonth.map((d) => ({ label: d.month, value: d.revenue }))}
            formatValue={(v) => formatInr(v)}
            height={200}
          />
        </div>
        <div>
          <h2 className="font-display text-title-md uppercase">Gigs posted by month</h2>
          <BarChart
            data={analytics.gigsByMonth.map((d) => ({ label: d.month, value: d.count }))}
            formatValue={(v) => String(v)}
            height={200}
          />
        </div>
      </div>

      <div>
        <h2 className="font-display text-title-md uppercase">Registrations by status</h2>
        <div className="mt-md grid gap-md sm:grid-cols-2 lg:grid-cols-4">
          {Object.entries(analytics.registrationsByStatus).length === 0 ? (
            <p className="border border-line p-lg text-ink-muted">No registrations yet.</p>
          ) : (
            Object.entries(analytics.registrationsByStatus).map(([status, count]) => (
              <div key={status} className="border border-line bg-paper-soft p-lg">
                <p className="font-display text-title-md text-accent">{count}</p>
                <p className="mt-xs font-mono text-[0.7rem] uppercase tracking-[0.1em] text-ink-muted">{status}</p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="grid gap-md lg:grid-cols-2">
        <div>
          <h2 className="font-display text-title-md uppercase">Categories by registrations</h2>
          <BarChart
            data={analytics.categoryDistribution.map((d) => ({ label: d.name, value: d.count }))}
            formatValue={(v) => String(v)}
            height={200}
          />
        </div>

        <div>
          <h2 className="font-display text-title-md uppercase">Recent events</h2>
          <div className="mt-md border border-line">
            {analytics.topEvents.length === 0 ? (
              <p className="p-lg text-ink-muted">No events yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {analytics.topEvents.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-md px-md py-sm text-body-sm">
                    <span className="font-bold uppercase">{event.title}</span>
                    <span className="text-ink-muted">
                      {event.registrations} regs · {event.categories} cats · {event.status}
                      {event.flatFeePaid ? " · flat paid" : " · flat unpaid"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function BarChart({
  data,
  formatValue,
  height,
}: {
  data: Array<{ label: string; value: number }>;
  formatValue: (value: number) => string;
  height: number;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  const width = Math.max(data.length * 64, 320);
  const chartHeight = height;
  const barMaxHeight = chartHeight - 40;
  const barWidth = 32;

  return (
    <div className="mt-md overflow-x-auto border border-line bg-paper-soft p-lg">
      {data.length === 0 ? (
        <p className="text-ink-muted">No data yet.</p>
      ) : (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} role="img" className="block">
          <line x1={0} y1={chartHeight - 30} x2={width} y2={chartHeight - 30} stroke="currentColor" strokeOpacity={0.2} />
          {data.map((d, i) => {
            const barHeight = Math.max(2, (d.value / max) * barMaxHeight);
            const x = i * 64 + 16;
            const y = chartHeight - 30 - barHeight;
            return (
              <g key={d.label}>
                <rect x={x} y={y} width={barWidth} height={barHeight} className="fill-accent" />
                <text x={x + barWidth / 2} y={chartHeight - 14} textAnchor="middle" fontSize={11} className="fill-ink-muted" fontFamily="monospace">
                  {d.label}
                </text>
                <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize={11} className="fill-ink" fontFamily="monospace">
                  {formatValue(d.value)}
                </text>
              </g>
            );
          })}
        </svg>
      )}
    </div>
  );
}
