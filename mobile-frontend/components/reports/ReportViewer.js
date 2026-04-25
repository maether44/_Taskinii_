import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { saveReportAsPdf } from '../../services/reportService';

export default function ReportViewer({ visible, html, onClose }) {
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!html || saving) return;
    setSaving(true);
    try {
      await saveReportAsPdf(html);
    } catch {}
    setSaving(false);
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={st.root}>
        <View style={st.bar}>
          <TouchableOpacity onPress={onClose} style={st.barBtn}>
            <Text style={st.closeTxt}>Close</Text>
          </TouchableOpacity>
          <Text style={st.barTitle}>Performance Report</Text>
          <TouchableOpacity onPress={handleSave} style={st.barBtn} disabled={saving}>
            {saving ? (
              <ActivityIndicator size="small" color="#6F4BF2" />
            ) : (
              <Text style={st.saveTxt}>Save PDF</Text>
            )}
          </TouchableOpacity>
        </View>
        {html ? (
          <WebView
            originWhitelist={['*']}
            source={{ html }}
            style={st.web}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={st.loading}>
            <ActivityIndicator size="large" color="#6F4BF2" />
          </View>
        )}
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#fff' },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 54,
    paddingBottom: 12,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EDE9F7',
  },
  barBtn: { minWidth: 70 },
  barTitle: { fontSize: 15, fontWeight: '700', color: '#1a1a2e' },
  closeTxt: { fontSize: 15, color: '#6F4BF2', fontWeight: '600' },
  saveTxt: { fontSize: 15, color: '#6F4BF2', fontWeight: '600', textAlign: 'right' },
  web: { flex: 1 },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
