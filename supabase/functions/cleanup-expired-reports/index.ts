/**
 * supabase/functions/cleanup-expired-reports/index.ts
 *
 * Scheduled daily — deletes storage files for expired reports and flips is_expired.
 * Never deletes user_reports rows.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_KEY') ?? ''

const sbAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify service role authorization
    const authHeader = req.headers.get('authorization') ?? ''
    const token = authHeader.replace('Bearer ', '')
    const body = await req.json().catch(() => ({}))

    if (token !== SERVICE_ROLE_KEY && body.adminKey !== Deno.env.get('ADMIN_SECRET')) {
      return json({ error: 'Unauthorized — service role or admin key required' }, 401)
    }

    // Find all non-expired reports that have passed their expires_at
    const { data: expiredReports, error: fetchErr } = await sbAdmin
      .from('user_reports')
      .select('id, storage_path')
      .eq('is_expired', false)
      .lte('expires_at', new Date().toISOString())

    if (fetchErr) throw fetchErr

    if (!expiredReports?.length) {
      return json({ success: true, processed: 0, message: 'No expired reports found' })
    }

    let deletedFiles = 0
    let updatedRows = 0

    for (const report of expiredReports) {
      // Delete storage file
      const { error: deleteErr } = await sbAdmin.storage
        .from('report-pdfs')
        .remove([report.storage_path])

      if (deleteErr) {
        console.error(`Failed to delete storage file ${report.storage_path}:`, deleteErr)
      } else {
        deletedFiles++
      }

      // Flip is_expired and status regardless of storage deletion outcome
      const { error: updateErr } = await sbAdmin
        .from('user_reports')
        .update({ is_expired: true, status: 'expired' })
        .eq('id', report.id)

      if (updateErr) {
        console.error(`Failed to update report ${report.id}:`, updateErr)
      } else {
        updatedRows++
      }
    }

    return json({
      success: true,
      processed: expiredReports.length,
      deletedFiles,
      updatedRows,
    })
  } catch (err: any) {
    console.error('cleanup-expired-reports error:', err)
    return json({ error: err.message }, 500)
  }
})
