import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'
import { AppEvents, on } from '../lib/eventBus'
import { error as logError } from '../lib/logger'

const MILESTONES = [
  { type: 'weekly', streak: 7, label: 'Weekly', icon: '7', xp: 100 },
  { type: 'monthly', streak: 30, label: 'Monthly', icon: '30', xp: 300 },
  { type: 'quarterly', streak: 90, label: 'Quarterly', icon: '90', xp: 500 },
  { type: 'biannual', streak: 180, label: '6-Month', icon: '180', xp: 800 },
  { type: 'yearly', streak: 365, label: 'Yearly', icon: '365', xp: 1500 },
]

const MilestoneContext = createContext()

export function MilestoneProvider({ children }) {
  const { user } = useAuth()
  const [unlocks, setUnlocks] = useState([])
  const [currentStreak, setCurrentStreak] = useState(0)
  const [pendingCelebration, setPendingCelebration] = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchUnlocks = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('milestone_unlocks')
        .select('*')
        .eq('user_id', user.id)
        .order('streak_required', { ascending: true })

      if (error?.code === 'PGRST205' || error?.code === '42P01') return
      if (error) throw error
      setUnlocks(data ?? [])
    } catch (err) {
      logError('[MilestoneContext] fetchUnlocks:', err)
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  const checkMilestones = useCallback(async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase.rpc('check_milestone_unlocks', {
        p_user_id: user.id,
      })

      if (error?.code === 'PGRST205' || error?.code === '42P01') return
      if (error) throw error

      setCurrentStreak(data?.current_streak ?? 0)

      const newMilestones = Array.isArray(data?.new_milestones) ? data.new_milestones : []
      if (newMilestones.length > 0) {
        setPendingCelebration(newMilestones[0])
        await fetchUnlocks()
      }
    } catch (err) {
      logError('[MilestoneContext] checkMilestones:', err)
    }
  }, [user?.id, fetchUnlocks])

  const claimMilestone = useCallback(async (milestoneType, skipped = false) => {
    if (!user?.id) return null
    try {
      const { data, error } = await supabase.rpc('claim_milestone', {
        p_user_id: user.id,
        p_milestone_type: milestoneType,
        p_skipped: skipped,
      })

      if (error?.code === 'PGRST205' || error?.code === '42P01') {
        setPendingCelebration(null)
        return null
      }
      if (error) throw error
      setPendingCelebration(null)
      await fetchUnlocks()
      return data
    } catch (err) {
      logError('[MilestoneContext] claimMilestone:', err)
      return null
    }
  }, [user?.id, fetchUnlocks])

  const dismissCelebration = useCallback(() => {
    setPendingCelebration(null)
  }, [])

  const isUnlocked = useCallback((milestoneType) => {
    return unlocks.some((row) => row.milestone_type === milestoneType)
  }, [unlocks])

  const isClaimed = useCallback((milestoneType) => {
    return unlocks.some((row) => row.milestone_type === milestoneType && row.claimed_at != null)
  }, [unlocks])

  const getProgress = useCallback(() => {
    return MILESTONES.map((milestone) => ({
      ...milestone,
      unlocked: isUnlocked(milestone.type),
      claimed: isClaimed(milestone.type),
      progress: Math.min(1, currentStreak / milestone.streak),
    }))
  }, [currentStreak, isUnlocked, isClaimed])

  useEffect(() => {
    if (user?.id) fetchUnlocks()
  }, [user?.id, fetchUnlocks])

  useEffect(() => {
    const unsub = on(AppEvents.STREAK_MILESTONE, (payload) => {
      if (payload?.milestone_type) {
        setPendingCelebration(payload)
        fetchUnlocks()
      }
    })
    return unsub
  }, [fetchUnlocks])

  return (
    <MilestoneContext.Provider
      value={{
        milestones: MILESTONES,
        unlocks,
        currentStreak,
        loading,
        pendingCelebration,
        fetchUnlocks,
        checkMilestones,
        claimMilestone,
        dismissCelebration,
        isUnlocked,
        isClaimed,
        getProgress,
      }}
    >
      {children}
    </MilestoneContext.Provider>
  )
}

export function useMilestones() {
  const context = useContext(MilestoneContext)
  if (!context) throw new Error('useMilestones must be inside MilestoneProvider')
  return context
}
