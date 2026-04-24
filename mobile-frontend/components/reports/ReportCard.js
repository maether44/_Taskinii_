import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const TYPE_LABELS = {
  weekly: 'Weekly',
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  biannual: '6-Month',
  yearly: 'Yearly',
};

export default function ReportCard({ reportType, state, periodLabel, onDownload }) {
  return (
    <View style={st.row}>
      <View style={st.info}>
        <Text style={st.typeLabel}>{TYPE_LABELS[reportType]}</Text>
        <Text style={st.periodLabel}>{periodLabel}</Text>
      </View>

      {state === 'available' ? (
        <View style={st.rightCol}>
          <View style={[st.badge, st.badgeGreen]}>
            <Text style={[st.badgeText, st.badgeTextGreen]}>Ready</Text>
          </View>
          <TouchableOpacity style={st.downloadBtn} onPress={onDownload} activeOpacity={0.7}>
            <Text style={st.downloadText}>Export PDF</Text>
          </TouchableOpacity>
        </View>
      ) : periodLabel === 'Locked' ? (
        <View style={st.rightCol}>
          <View style={[st.badge, st.badgeLocked]}>
            <Text style={st.badgeTextLocked}>Locked</Text>
          </View>
        </View>
      ) : (
        <View style={st.rightCol}>
          <View style={[st.badge, st.badgePending]}>
            <Text style={st.badgeTextPending}>Pending</Text>
          </View>
        </View>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(61, 47, 122, 0.5)',
  },
  info: { flex: 1 },
  typeLabel: { color: '#fff', fontSize: 13, fontWeight: '700' },
  periodLabel: { color: '#7A6AAA', fontSize: 10, marginTop: 2 },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  badgeGreen: { backgroundColor: 'rgba(205, 242, 126, 0.15)' },
  badgeTextGreen: { color: '#CDF27E', fontSize: 10, fontWeight: '700' },
  badgePending: { backgroundColor: 'rgba(122, 106, 170, 0.15)' },
  badgeTextPending: { color: '#7A6AAA', fontSize: 10, fontWeight: '700' },
  badgeLocked: { backgroundColor: 'rgba(74, 66, 104, 0.2)' },
  badgeTextLocked: { color: '#4A4268', fontSize: 10, fontWeight: '700' },
  badgeText: { fontSize: 10, fontWeight: '700' },
  downloadBtn: {
    backgroundColor: 'rgba(111, 75, 242, 0.2)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#6F4BF2',
  },
  downloadText: { color: '#A38DF2', fontSize: 11, fontWeight: '700' },
});
