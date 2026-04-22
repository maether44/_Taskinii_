/**
 * Fetches streak-unlocked performance reports shown on the Insights screen.
 */
import { useCallback, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { error as logError } from '../lib/logger'

const REPORT_TYPES = ['weekly', 'monthly', 'quarterly', 'biannual', 'yearly']

function isExpired(report) {
  if (!report) return false
  if (report.is_expired || report.status === 'expired') return true
  if (!report.expires_at) return false
  return new Date(report.expires_at).getTime() <= Date.now()
}

export function useReports() {
  const { user } = useAuth()
  const [reports, setReports] = useState({
    weekly: null,
    monthly: null,
    quarterly: null,
    biannual: null,
    yearly: null,
  })
  const [loading, setLoading] = useState(false)

  const refreshReports = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const next = {
        weekly: null,
        monthly: null,
        quarterly: null,
        biannual: null,
        yearly: null,
      }

      for (const type of REPORT_TYPES) {
        const { data, error } = await supabase
          .from('user_reports')
          .select('*')
          .eq('user_id', user.id)
          .eq('report_type', type)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        if (error?.code === 'PGRST205' || error?.code === '42P01') break
        if (error) {
          logError(`[useReports] fetch ${type}:`, error)
          next[type] = null
        } else {
          next[type] = data
        }
      }

      setReports(next)
    } catch (err) {
      logError('[useReports] refreshReports:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const downloadReport = useCallback(async (report) => {
    if (!report?.storage_path) return null
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('No session')

      const { data, error } = await supabase.storage
        .from('report-pdfs')
        .createSignedUrl(report.storage_path, 3600)

      if (error) throw error
      return data.signedUrl
    } catch (err) {
      logError('[useReports] downloadReport:', err)
      return null
    }
  }, [])

  const getReportState = useCallback((reportType) => {
    const report = reports[reportType]
    if (!report) return 'not_available'
    if (report.status === 'pending') return 'pending'
    if (report.status === 'failed') return 'not_available'
    if (isExpired(report)) return 'expired'
    if (report.status === 'available') return 'available'
    return 'not_available'
  }, [reports])

  return {
    reports,
    loading,
    refreshReports,
    downloadReport,
    getReportState,
  }
}
