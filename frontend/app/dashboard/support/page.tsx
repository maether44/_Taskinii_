import { unstable_noStore as noStore } from "next/cache";
import PageHeader from "@/components/dashboard/PageHeader";
import ReportsTable from "@/components/dashboard/ReportsTable";
import { getProblemReports } from "@/lib/supabase/queries/reports";

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Record<string, string | undefined>;
}) {
  noStore();

  const status = searchParams.status;
  const reports = await getProblemReports(status, 250).catch(() => []);

  const openCount = reports.filter((r) => r.status === "open").length;
  const inProgressCount = reports.filter(
    (r) => r.status === "in_progress",
  ).length;
  const resolvedCount = reports.filter((r) => r.status === "resolved").length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader
        title="Reported Problems"
        description="Admin view of user-submitted issue reports"
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 12,
        }}
      >
        <MetricCard label="Total Reports" value={reports.length} />
        <MetricCard label="Open" value={openCount} accent="var(--bq-info)" />
        <MetricCard
          label="In Progress"
          value={inProgressCount}
          accent="var(--bq-warning)"
        />
        <MetricCard
          label="Resolved"
          value={resolvedCount}
          accent="var(--bq-success)"
        />
      </div>

      <div
        style={{
          background: "var(--bq-surface-2)",
          border: "1px solid var(--bq-border)",
          borderRadius: 12,
          padding: 20,
        }}
      >
        <ReportsTable reports={reports} />
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  accent = "var(--bq-text-1)",
}: {
  label: string;
  value: number;
  accent?: string;
}) {
  return (
    <div
      style={{
        background: "var(--bq-surface-2)",
        border: "1px solid var(--bq-border)",
        borderRadius: 10,
        padding: "14px 16px",
      }}
    >
      <p
        style={{
          margin: 0,
          fontFamily: "var(--font-inter)",
          fontSize: 12,
          color: "var(--bq-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </p>
      <p
        style={{
          margin: "8px 0 0",
          fontFamily: "var(--font-syne)",
          fontSize: 24,
          color: accent,
          fontWeight: 700,
        }}
      >
        {value.toLocaleString()}
      </p>
    </div>
  );
}
