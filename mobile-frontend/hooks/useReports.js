/**
 * mobile-frontend/hooks/useReports.js
 *
 * Fetches auto-generated reports (weekly, monthly, quarterly, biannual, yearly).
 * Reports are generated server-side by pg_cron — users only view and download.
 * Always fetches fresh signed URLs on download — never reuses stored ones.
 */
import { useCallback, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../context/AuthContext";
import { error as logError } from "../lib/logger";

const REPORT_TYPES = ["weekly", "monthly", "quarterly", "biannual", "yearly"];

export function useReports() {
  const { user } = useAuth();
  const [reports, setReports] = useState({
    weekly: null,
    monthly: null,
    quarterly: null,
    biannual: null,
    yearly: null,
  });
  const [loading, setLoading] = useState(false);

  const refreshReports = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const result = {};
      for (const type of REPORT_TYPES) {
        const { data, error } = await supabase
          .from("user_reports")
          .select("*")
          .eq("user_id", user.id)
          .eq("report_type", type)
          .eq("is_expired", false)
          .eq("status", "available")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Table doesn't exist yet — migration not applied. Stop querying.
        if (error?.code === "PGRST205" || error?.code === "42P01") break;
        if (error) {
          logError(`[useReports] fetch ${type}:`, error);
          result[type] = null;
        } else {
          result[type] = data;
        }
      }
      setReports(result);
    } catch (err) {
      logError("[useReports] refreshReports:", err);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const downloadReport = useCallback(async (report) => {
    if (!report?.storage_path) return null;
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("No session");

      // Always generate a fresh signed URL — never reuse stored ones
      const { data, error } = await supabase.storage
        .from("report-pdfs")
        .createSignedUrl(report.storage_path, 3600);

      if (error) throw error;
      return data.signedUrl;
    } catch (err) {
      logError("[useReports] downloadReport:", err);
      return null;
    }
  }, []);

  const getReportState = useCallback(
    (reportType) => {
      const report = reports[reportType];
      if (!report) return "not_available";
      if (report.is_expired || report.status === "expired") return "expired";
      if (report.status === "available") return "available";
      return "not_available";
    },
    [reports],
  );

  return {
    reports,
    loading,
    refreshReports,
    downloadReport,
    getReportState,
  };
}
