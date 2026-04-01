import { StyleSheet, Text, View } from 'react-native';

/**
 * StatCard
 * Props:
 *   icon    string  — emoji
 *   label   string  — bottom label
 *   value   string  — big number/text
 *   sub     string  — small text below value (optional)
 *   delta   string  — e.g. "+12%" (optional)
 *   up      bool    — delta direction for color
 *   color   string  — icon bg tint
 *   style   object  — extra container styles
 */
export default function StatCard({ icon, label, value, sub, delta, up, color = '#7C5CFC', style }) {
  return (
    <View style={[styles.card, style]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '20' }]}>
        <Text style={styles.icon}>{icon}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      {sub && <Text style={styles.sub}>{sub}</Text>}
      <Text style={styles.label}>{label}</Text>
      {delta !== undefined && (
        <View style={[styles.delta, up ? styles.deltaUp : styles.deltaDown]}>
          <Text style={[styles.deltaText, up ? styles.deltaTextUp : styles.deltaTextDown]}>
            {up ? '↑' : '↓'} {delta}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#181430',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: '#251E42',
    alignItems: 'flex-start',
  },
  iconWrap: {
    width: 36, height: 36, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 10,
  },
  icon:  { fontSize: 18 },
  value: { color: '#fff', fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  sub:   { color: '#9D85F5', fontSize: 11, marginTop: 1 },
  label: { color: '#6B5F8A', fontSize: 11, marginTop: 4 },
  delta: { borderRadius: 8, paddingHorizontal: 7, paddingVertical: 2, marginTop: 6 },
  deltaUp:       { backgroundColor: '#34C75920' },
  deltaDown:     { backgroundColor: '#FF3B3020' },
  deltaText:     { fontSize: 10, fontWeight: '700' },
  deltaTextUp:   { color: '#34C759' },
  deltaTextDown: { color: '#FF3B30' },
});