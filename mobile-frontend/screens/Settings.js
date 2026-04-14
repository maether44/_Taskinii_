import React, { useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const C = {
  bg: '#0F0B1E',
  card: '#161230',
  border: '#1E1A35',
  purple: '#7C5CFC',
  lime: '#C8F135',
  accent: '#9D85F5',
  text: '#FFFFFF',
  sub: '#6B5F8A',
};

export default function Settings() {
  const navigation = useNavigation();
  const [termsVisible, setTermsVisible] = useState(false);

  const options = useMemo(
    () => [
      {
        key: 'account',
        title: 'Account',
        subtitle: 'Edit your profile details',
        icon: 'person-outline',
        onPress: () => navigation.navigate('EditProfile'),
      },
      {
        key: 'help',
        title: 'Help Center',
        subtitle: 'Open the BodyQ guide',
        icon: 'help-circle-outline',
        onPress: () => navigation.navigate('HelpCenter'),
      },
      {
        key: 'report',
        title: 'Report',
        subtitle: 'Send a bug report or issue',
        icon: 'bug-outline',
        onPress: () => navigation.navigate('Report'),
      },
      {
        key: 'terms',
        title: 'Terms & Policies',
        subtitle: 'Read the app rules and privacy notes',
        icon: 'document-text-outline',
        onPress: () => setTermsVisible(true),
      },
    ],
    [navigation],
  );

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <Text style={s.title}>Settings</Text>
          <Text style={s.subtitle}>Manage your account and get help.</Text>
        </View>

        <View style={s.card}>
          {options.map((option, index) => (
            <Pressable
              key={option.key}
              style={[s.row, index < options.length - 1 && s.rowBorder]}
              onPress={option.onPress}
            >
              <View style={s.rowLeft}>
                <View style={s.iconWrap}>
                  <Ionicons name={option.icon} size={20} color={C.lime} />
                </View>
                <View style={s.rowText}>
                  <Text style={s.rowTitle}>{option.title}</Text>
                  <Text style={s.rowSubtitle}>{option.subtitle}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={C.sub} />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal
        visible={termsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setTermsVisible(false)}
      >
        <View style={s.modalBackdrop}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Terms & Policies</Text>
            <Text style={s.modalBody}>
              BodyQ currently keeps notification preferences on-device and uses Supabase for account
              and activity data. If you need more detail, please review the project README or report
              an issue.
            </Text>

            <View style={s.modalActions}>
              <Pressable
                style={[s.modalBtn, s.modalBtnSecondary]}
                onPress={() => setTermsVisible(false)}
              >
                <Text style={s.modalBtnSecondaryText}>Close</Text>
              </Pressable>
              <Pressable
                style={[s.modalBtn, s.modalBtnPrimary]}
                onPress={() => {
                  setTermsVisible(false);
                  navigation.navigate('HelpCenter');
                }}
              >
                <Text style={s.modalBtnPrimaryText}>Open Help Center</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 24 },
  header: { marginBottom: 18 },
  title: { color: C.text, fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  subtitle: { color: C.sub, fontSize: 13, marginTop: 6 },
  card: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 12 },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowTitle: { color: C.text, fontSize: 15, fontWeight: '700' },
  rowSubtitle: { color: C.sub, fontSize: 12, marginTop: 3 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: C.border,
  },
  modalTitle: { color: C.text, fontSize: 20, fontWeight: '800', marginBottom: 10 },
  modalBody: { color: C.sub, fontSize: 13, lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  modalBtnPrimary: { backgroundColor: C.purple },
  modalBtnSecondary: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  modalBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  modalBtnSecondaryText: { color: C.text, fontSize: 14, fontWeight: '700' },
});
