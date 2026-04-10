import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePedometer } from '../hooks/usePedometer';
import { useToday } from '../context/TodayContext';
import { DEFAULT_TARGETS } from '../constants/targets';

const C = {
  bg: '#0F0B1E',
  card: '#181430',
  border: '#251E42',
  purple: '#7C5CFC',
  lime: '#C8F135',
  text: '#fff',
  error: '#FF6B6B',
  success: '#51CF66',
};

export function StepCounter({ userId }) {
  const {
    stepCount,
    isAvailable,
    permissionStatus,
    syncError,
    isSyncing,
    manualSync,
  } = usePedometer(userId);

  const { goals } = useToday();
  const dailyGoal = goals?.steps_target ?? DEFAULT_TARGETS.steps_target;
  const percentage = Math.min((stepCount / dailyGoal) * 100, 100);

  if (!isAvailable) {
    return (
      <View style={s.errorCard}>
        <Ionicons name="alert-circle" size={24} color={C.error} />
        <Text style={s.errorTxt}>
          {syncError || 'Pedometer not available on this device'}
        </Text>
      </View>
    );
  }

  if (permissionStatus !== 'granted') {
    return (
      <View style={s.errorCard}>
        <Ionicons name="lock" size={24} color={C.error} />
        <Text style={s.errorTxt}>Enable location/health permissions to use step counter</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      {/* Header */}
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Steps Today</Text>
          <Text style={s.stepCount}>{stepCount.toLocaleString()}</Text>
          <Text style={s.goal}>{dailyGoal.toLocaleString()} goal</Text>
        </View>
        <Ionicons name="walk" size={40} color={C.purple} />
      </View>

      {/* Progress bar */}
      <View style={s.progressBar}>
        <View
          style={[
            s.progressFill,
            { width: `${percentage}%`, backgroundColor: percentage >= 100 ? C.lime : C.purple },
          ]}
        />
      </View>

      {/* Stats */}
      <View style={s.stats}>
        <Text style={s.progress}>{Math.round(percentage)}% complete</Text>
      </View>

      {/* Manual sync button (for testing) */}
      {syncError && (
        <View style={s.errorSection}>
          <Text style={s.errorMsg}>❌ {syncError}</Text>
          <TouchableOpacity
            style={s.syncBtn}
            onPress={manualSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <ActivityIndicator size={14} color={C.text} />
            ) : (
              <>
                <Ionicons name="cloud-upload" size={14} color={C.text} />
                <Text style={s.syncBtnTxt}>Manual Sync</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Success indicator */}
      {!syncError && (
        <View style={s.successSection}>
          <Ionicons name="checkmark-circle" size={16} color={C.success} />
          <Text style={s.successTxt}>Syncing automatically</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#8C80B1',
    marginBottom: 4,
  },
  stepCount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: C.text,
  },
  goal: {
    fontSize: 12,
    color: '#6B5F8A',
    marginTop: 2,
  },
  progressBar: {
    height: 8,
    backgroundColor: C.border,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  stats: {
    alignItems: 'center',
    marginBottom: 8,
  },
  progress: {
    fontSize: 12,
    color: '#8C80B1',
  },
  errorCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: C.error,
    alignItems: 'center',
    gap: 8,
  },
  errorTxt: {
    color: C.error,
    fontSize: 12,
    textAlign: 'center',
  },
  errorSection: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 8,
    padding: 8,
    gap: 8,
  },
  errorMsg: {
    color: C.error,
    fontSize: 11,
  },
  syncBtn: {
    backgroundColor: C.purple,
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  syncBtnTxt: {
    color: C.text,
    fontSize: 11,
    fontWeight: '600',
  },
  successSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  successTxt: {
    color: C.success,
    fontSize: 11,
  },
});
