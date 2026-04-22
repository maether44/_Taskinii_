import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const C = {
  bg: '#0F0B1E',
  card: '#161230',
  border: '#1E1A35',
  purple: '#7C5CFC',
  lime: '#C8F135',
  text: '#FFFFFF',
  sub: '#6B5F8A',
};

const POLICY_ITEMS = [
  {
    id: 'privacy',
    title: 'Privacy Settings',
    body: 'BodyQ keeps notification preferences on-device and uses your profile data only to power app features you choose to use.',
    icon: 'lock-closed-outline',
  },
  {
    id: 'data',
    title: 'How Data Is Used',
    body: 'We use your health, workout, and nutrition inputs to generate estimates, charts, and progress summaries inside the app.',
    icon: 'analytics-outline',
  },
  {
    id: 'sources',
    title: 'Information Sources',
    body: 'Estimation logic may rely on your profile inputs, activity logs, and internal calculation rules to keep guidance consistent.',
    icon: 'document-text-outline',
  },
  {
    id: 'support',
    title: 'Questions or Changes',
    body: 'If you want clarification about policies or data handling, you can open Help Center or Trust Center from the settings area.',
    icon: 'help-circle-outline',
  },
];

function PolicyCard({ item }) {
  return (
    <View style={s.cardItem}>
      <View style={s.cardIcon}>
        <Ionicons name={item.icon} size={20} color={C.lime} />
      </View>
      <View style={s.cardTextWrap}>
        <Text style={s.cardTitle}>{item.title}</Text>
        <Text style={s.cardBody}>{item.body}</Text>
      </View>
    </View>
  );
}

export default function TermsPolicies() {
  const navigation = useNavigation();

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>
          <View style={s.headerTextWrap}>
            <Text style={s.title}>Terms & Policies</Text>
            <Text style={s.subtitle}>Read how BodyQ uses your data and settings.</Text>
          </View>
        </View>

        <View style={s.banner}>
          <Ionicons name="document-lock-outline" size={22} color={C.lime} />
          <View style={s.bannerTextWrap}>
            <Text style={s.bannerTitle}>Clear, app-specific policy notes</Text>
            <Text style={s.bannerBody}>
              These notes explain how BodyQ treats personal data, app preferences, and estimation
              inputs.
            </Text>
          </View>
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Policy Summary</Text>
          <Text style={s.sectionSubtitle}>Core points for privacy and usage.</Text>
          <View style={s.sectionBody}>
            {POLICY_ITEMS.map((item) => (
              <PolicyCard key={item.id} item={item} />
            ))}
          </View>
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <Text style={s.sectionSubtitle}>Jump to related help pages.</Text>
          <View style={s.actionRow}>
            <Pressable
              style={[s.actionBtn, s.actionBtnGhost]}
              onPress={() => navigation.navigate('TrustCenter')}
            >
              <Text style={s.actionBtnGhostText}>Open Trust Center</Text>
            </Pressable>
            <Pressable
              style={[s.actionBtn, s.actionBtnPrimary]}
              onPress={() => navigation.navigate('HelpCenter')}
            >
              <Text style={s.actionBtnPrimaryText}>Open Help Center</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 24, gap: 14 },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTextWrap: { flex: 1 },
  title: { color: C.text, fontSize: 26, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { color: C.sub, fontSize: 13, marginTop: 4 },
  banner: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#1B1735',
    padding: 16,
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  bannerTextWrap: { flex: 1 },
  bannerTitle: { color: C.text, fontSize: 15, fontWeight: '800' },
  bannerBody: { color: C.sub, fontSize: 12, lineHeight: 18, marginTop: 4 },
  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 14,
  },
  sectionTitle: { color: C.text, fontSize: 16, fontWeight: '800' },
  sectionSubtitle: { color: C.sub, fontSize: 12, marginTop: 5 },
  sectionBody: { marginTop: 12, gap: 10 },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: { flex: 1 },
  cardTitle: { color: C.text, fontSize: 14, fontWeight: '800' },
  cardBody: { color: C.sub, fontSize: 12, lineHeight: 18, marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: { flex: 1, borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  actionBtnGhost: { backgroundColor: C.bg, borderWidth: 1, borderColor: C.border },
  actionBtnPrimary: { backgroundColor: C.purple },
  actionBtnGhostText: { color: C.text, fontSize: 14, fontWeight: '700' },
  actionBtnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
});
