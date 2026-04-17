import { createClient } from "@/lib/supabase/server";

export interface ProblemReport {
  id: string;
  user_id: string;
  issue_type: string;
  subject: string;
  details: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
  user_name: string;
}

export async function getProblemReports(
  status?: string,
  limit = 200,
): Promise<ProblemReport[]> {
  const supabase = createClient();

  let query = supabase
    .from("reports")
    .select("id, user_id, issue_type, subject, details, status, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;

  const reports = data ?? [];
  const userIds = Array.from(new Set(reports.map((row) => row.user_id).filter(Boolean)));

  let userNameById = new Map<string, string>();
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', userIds);

    userNameById = new Map(
      (profiles ?? []).map((profile) => [profile.id, profile.full_name ?? 'Unknown user']),
    );
  }

  return reports.map((row) => {
    return {
      id: row.id,
      user_id: row.user_id,
      issue_type: row.issue_type,
      subject: row.subject,
      details: row.details,
      status: row.status,
      created_at: row.created_at,
      user_name: userNameById.get(row.user_id) ?? "Unknown user",
    };
  });
}
