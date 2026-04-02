/**
 * hooks/useSleep.js
 * Reads today's sleep data from daily_activity and provides logSleep().
 * Table: daily_activity (user_id, date, sleep_hours, sleep_quality)
 */
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useSleep() {
    const [sleepHours,   setSleepHours]   = useState(null);
    const [sleepQuality, setSleepQuality] = useState(null);
    const [loading,      setLoading]      = useState(true);
    const [userId,       setUserId]       = useState(null);

    // Resolve user once
    useEffect(() => {
        supabase.auth.getUser().then(({ data }) => {
            if (data?.user) setUserId(data.user.id);
            else setLoading(false);
        });
    }, []);

    const TODAY = new Date().toISOString().split('T')[0];

    const load = useCallback(async () => {
        if (!userId) return;
        setLoading(true);
        try {
            const { data } = await supabase
                .from('daily_activity')
                .select('sleep_hours, sleep_quality')
                .eq('user_id', userId)
                .eq('date', TODAY)
                .maybeSingle();
            setSleepHours(data?.sleep_hours ?? null);
            setSleepQuality(data?.sleep_quality ?? null);
        } catch (e) {
            console.error('[useSleep] load error:', e);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => { load(); }, [load]);

    /**
     * logSleep({ hours, quality, bedtime, wakeTime })
     * Upserts into daily_activity. Returns true on success.
     */
    const logSleep = useCallback(async ({ hours, quality }) => {
        if (!userId) return false;
        // Optimistic update
        setSleepHours(hours);
        setSleepQuality(quality ?? null);
        try {
            const { error } = await supabase
                .from('daily_activity')
                .upsert(
                    {
                        user_id:       userId,
                        date:          TODAY,
                        sleep_hours:   hours,
                        sleep_quality: quality ?? null,
                    },
                    { onConflict: 'user_id,date' }
                );
            if (error) {
                console.error('[useSleep] upsert error:', error);
                load(); // revert optimistic update
                return false;
            }
            return true;
        } catch (e) {
            console.error('[useSleep] logSleep error:', e);
            load();
            return false;
        }
    }, [userId, load]);

    return {
        loading,
        sleepHours,
        sleepQuality,
        logSleep,
        refresh: load,
    };
}
