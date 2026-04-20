"use client";
import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { TableSkeleton } from "./LoadingSkeleton";
import EmptyState from "./EmptyState";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  total?: number;
  page?: number;
  perPage?: number;
  onPageChange?: (page: number) => void;
  onSort?: (key: string, dir: "asc" | "desc") => void;
  onRowClick?: (row: T) => void;
  rowKey: (row: T) => string;
  selectable?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  stickyHeader?: boolean;
  stickyHeaderTop?: number;
}

export default function DataTable<T>({
  columns,
  data,
  loading,
  total = 0,
  page = 1,
  perPage = 25,
  onPageChange,
  onSort,
  onRowClick,
  rowKey,
  selectable,
  emptyTitle,
  emptyDescription,
  stickyHeader = true,
  stickyHeaderTop = 60,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function handleSort(key: string) {
    const dir = sortKey === key && sortDir === "desc" ? "asc" : "desc";
    setSortKey(key);
    setSortDir(dir);
    onSort?.(key, dir);
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const totalPages = Math.ceil(total / perPage);

  if (loading) return <TableSkeleton rows={8} />;
  if (!data.length)
    return <EmptyState title={emptyTitle} description={emptyDescription} />;

  return (
    <div style={{ overflowX: "auto" }} className="dash-scroll">
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontFamily: "var(--font-inter)",
        }}
      >
        <thead
          style={
            stickyHeader
              ? {
                  position: "sticky",
                  top: stickyHeaderTop,
                  zIndex: 2,
                  background: "var(--bq-surface-1)",
                }
              : undefined
          }
        >
          <tr>
            {selectable && (
              <th
                style={{ width: 40, padding: "10px 12px", textAlign: "center" }}
              >
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setSelected(
                      e.target.checked ? new Set(data.map(rowKey)) : new Set(),
                    )
                  }
                  checked={selected.size === data.length && data.length > 0}
                  style={{ accentColor: "var(--bq-purple)" }}
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                style={{
                  padding: "10px 16px",
                  textAlign: "left",
                  fontSize: 12,
                  fontWeight: 500,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--bq-text-3)",
                  whiteSpace: "nowrap",
                  cursor: col.sortable ? "pointer" : "default",
                  userSelect: "none",
                  width: col.width,
                }}
                onClick={() => col.sortable && handleSort(col.key)}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {col.header}
                  {col.sortable &&
                    sortKey === col.key &&
                    (sortDir === "asc" ? (
                      <ChevronUp size={12} />
                    ) : (
                      <ChevronDown size={12} />
                    ))}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => {
            const id = rowKey(row);
            return (
              <tr
                key={id}
                onClick={() => onRowClick?.(row)}
                style={{
                  borderTop: "1px solid var(--bq-border)",
                  background: selected.has(id)
                    ? "var(--bq-purple-08)"
                    : "transparent",
                  borderLeft: selected.has(id)
                    ? "2px solid var(--bq-purple)"
                    : "2px solid transparent",
                  cursor: onRowClick ? "pointer" : "default",
                  transition: "background 100ms, border-left-color 100ms",
                }}
                onMouseEnter={(e) => {
                  if (!selected.has(id))
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "var(--bq-surface-3)";
                }}
                onMouseLeave={(e) => {
                  if (!selected.has(id))
                    (e.currentTarget as HTMLTableRowElement).style.background =
                      "transparent";
                }}
              >
                {selectable && (
                  <td
                    style={{ padding: "12px", textAlign: "center" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleRow(id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected.has(id)}
                      onChange={() => toggleRow(id)}
                      style={{ accentColor: "var(--bq-purple)" }}
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td
                    key={col.key}
                    style={{
                      padding: "12px 16px",
                      fontSize: 14,
                      color: "var(--bq-text-1)",
                      verticalAlign: "middle",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {col.render
                      ? col.render(row)
                      : String((row as Record<string, unknown>)[col.key] ?? "")}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "12px 16px",
            borderTop: "1px solid var(--bq-border)",
          }}
        >
          <span style={{ fontSize: 13, color: "var(--bq-text-3)" }}>
            {(page - 1) * perPage + 1}–{Math.min(page * perPage, total)} of{" "}
            {total}
          </span>
          <div style={{ display: "flex", gap: 4 }}>
            <PagBtn
              onClick={() => onPageChange?.(page - 1)}
              disabled={page <= 1}
              icon={<ChevronLeft size={14} />}
              label="Previous"
            />
            {Array.from(
              { length: Math.min(totalPages, 7) },
              (_, i) => i + 1,
            ).map((p) => (
              <PagBtn
                key={p}
                onClick={() => onPageChange?.(p)}
                active={p === page}
                label={String(p)}
              />
            ))}
            <PagBtn
              onClick={() => onPageChange?.(page + 1)}
              disabled={page >= totalPages}
              icon={<ChevronRight size={14} />}
              label="Next"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PagBtn({
  onClick,
  disabled,
  active,
  icon,
  label,
}: {
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      style={{
        width: 30,
        height: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: active ? "var(--bq-purple)" : "transparent",
        border: "1px solid",
        borderColor: active ? "var(--bq-purple)" : "var(--bq-border)",
        borderRadius: 6,
        color: active ? "#fff" : "var(--bq-text-2)",
        fontSize: 12,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        fontFamily: "var(--font-inter)",
      }}
    >
      {icon ?? label}
    </button>
  );
}
