export type ReportType = "weekly" | "monthly" | "quarterly" | "biannual" | "yearly";

export type ReportStatus = "generating" | "available" | "failed" | "expired";

export interface UserReport {
  id: string;
  user_id: string;
  report_type: ReportType;
  period_start: string;
  period_end: string;
  storage_path: string;
  narrative: string | null;
  status: ReportStatus;
  is_expired: boolean;
  expires_at: string;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export type ReportCardState = "not_available" | "available" | "expired";

export interface ReportCardProps {
  reportType: ReportType;
  report: UserReport | null;
  state: ReportCardState;
  periodLabel: string;
  onDownload: () => void;
}

export interface ReportDataPayload {
  activity: {
    avg_steps: number;
    avg_sleep_hours: number;
    avg_water_ml: number;
    active_days: number;
  };
  nutrition: {
    avg_calories: number;
    avg_protein_g: number;
    avg_carbs_g: number;
    avg_fat_g: number;
    logged_days: number;
  };
  workouts: {
    session_count: number;
    total_calories_burned: number;
    avg_duration_min: number;
    exercises_performed: number;
  };
  body_metrics: {
    weight_start_kg: number | null;
    weight_end_kg: number | null;
    weight_delta_kg: number | null;
    body_fat_start_pct: number | null;
    body_fat_end_pct: number | null;
  };
  ai_insights: Array<{
    insight_type: string;
    message: string;
    created_at: string;
  }>;
  period: {
    type: ReportType;
    start: string;
    end: string;
  };
}
