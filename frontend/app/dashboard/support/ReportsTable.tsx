"use client";

import DataTable, { Column } from "@/components/dashboard/DataTable";
import StatusBadge from "@/components/dashboard/StatusBadge";
import { ProblemReport } from "@/lib/supabase/queries/reports";

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function truncate(value: string, length = 90): string {
  if (value.length <= length) return value;
  return `${value.slice(0, length - 1)}...`;
}

const columns: Column<ProblemReport>[] = [
  {
    key: "created_at",
    header: "Submitted",
    sortable: true,
    render: (report) => (
      <span
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: 13,
          color: "var(--bq-text-2)",
        }}
      >
        {formatDateTime(report.created_at)}
      </span>
    ),
  },
  {
    key: "status",
    header: "Status",
    render: (report) => <StatusBadge status={report.status} />,
  },
  {
    key: "issue_type",
    header: "Issue Type",
    render: (report) => (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          background: "rgba(124,92,252,0.12)",
          color: "var(--bq-purple)",
          borderRadius: 6,
          padding: "2px 8px",
          fontFamily: "var(--font-inter)",
          fontSize: 12,
          fontWeight: 600,
          textTransform: "capitalize",
        }}
      >
        {report.issue_type.replace("_", " ")}
      </span>
    ),
  },
  {
    key: "subject",
    header: "Subject",
    render: (report) => (
      <span
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: 13,
          color: "var(--bq-text-1)",
          fontWeight: 600,
        }}
      >
        {truncate(report.subject, 70)}
      </span>
    ),
  },
  {
    key: "details",
    header: "Details",
    render: (report) => (
      <span
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: 13,
          color: "var(--bq-muted)",
        }}
      >
        {truncate(report.details.replace(/\s+/g, " "), 100)}
      </span>
    ),
  },
  {
    key: "user_name",
    header: "Reported By",
    render: (report) => (
      <span
        style={{
          fontFamily: "var(--font-inter)",
          fontSize: 13,
          color: "var(--bq-text-2)",
        }}
      >
        {report.user_name}
      </span>
    ),
  },
];

export default function ReportsTable({
  reports,
}: {
  reports: ProblemReport[];
}) {
  return (
    <DataTable
      columns={columns}
      data={reports}
      rowKey={(report) => report.id}
      emptyTitle="No reports yet"
      emptyDescription="User-submitted issues will appear here."
    />
  );
}
