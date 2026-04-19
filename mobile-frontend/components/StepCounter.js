import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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

export function StepCounter() {
  const { steps, goals, pedometerAvailable, pedometerPermission } = useToday();
  const dailyGoal = goals?.steps_target ?? DEFAULT_TARGETS.steps_target;
  const percentage = Math.min((steps / dailyGoal) * 100, 100);

  if (!pedometerAvailable) {
    return (
      <View style={s.errorCard}>
        <Ionicons name="alert-circle" size={24} color={C.error} />
        <Text style={s.errorTxt}>Pedometer not available on this device</Text>
      </View>
    );
  }

  if (pedometerPermission && pedometerPermission !== 'granted') {
    return (
      <View style={s.errorCard}>
        <Ionicons name="lock" size={24} color={C.error} />
        <Text style={s.errorTxt}>Enable motion/health permissions to count steps</Text>
      </View>
    );
  }

  return (
    <View style={s.card}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>Steps Today</Text>
          <Text style={s.stepCount}>{steps.toLocaleString()}</Text>
          <Text style={s.goal}>{dailyGoal.toLocaleString()} goal</Text>
        </View>
        <Ionicons name="walk" size={40} color={C.purple} />
      </View>

      <View style={s.progressBar}>
        <View
          style={[
            s.progressFill,
            { width: `${percentage}%`, backgroundColor: percentage >= 100 ? C.lime : C.purple },
          ]}
        />
      </View>

      <View style={s.stats}>
        <Text style={s.progress}>{Math.round(percentage)}% complete</Text>
      </View>

      <View style={s.successSection}>
        <Ionicons name="checkmark-circle" size={16} color={C.success} />
        <Text style={s.successTxt}>Syncing automatically</Text>
      </View>
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
