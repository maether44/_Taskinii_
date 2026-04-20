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

const TRUST_ITEMS = [
  {
    id: 'data',
    title: 'Data Handling',
    body: 'BodyQ stores account and activity data through Supabase and keeps local preferences on device when possible.',
    icon: 'shield-checkmark-outline',
  },
  {
    id: 'permissions',
    title: 'Permissions',
    body: 'The app only requests permissions it needs for health logging, media uploads, and notifications.',
    icon: 'lock-closed-outline',
  },
  {
    id: 'security',
    title: 'Security',
    body: 'Your information is transmitted securely. We recommend using a strong password and keeping your device updated.',
    icon: 'key-outline',
  },
  {
    id: 'support',
    title: 'Support & Reporting',
    body: 'If you notice a privacy issue, use Help Center or Report to contact the team and document the problem.',
    icon: 'chatbubbles-outline',
  },
];

function TrustCard({ item }) {
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

export default function TrustCenter() {
  const navigation = useNavigation();

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>
          <View style={s.headerTextWrap}>
            <Text style={s.title}>Trust Center</Text>
            <Text style={s.subtitle}>How BodyQ handles your privacy, security, and data.</Text>
          </View>
        </View>

        <View style={s.banner}>
          <Ionicons name="shield-checkmark" size={22} color={C.lime} />
          <View style={s.bannerTextWrap}>
            <Text style={s.bannerTitle}>Privacy-first by design</Text>
            <Text style={s.bannerBody}>
              BodyQ is built to help you track health data while keeping control over what you
              share.
            </Text>
          </View>
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>What We Protect</Text>
          <Text style={s.sectionSubtitle}>The main areas covered by BodyQ trust and safety.</Text>
          <View style={s.sectionBody}>
            {TRUST_ITEMS.map((item) => (
              <TrustCard key={item.id} item={item} />
            ))}
          </View>
        </View>

        <View style={s.sectionCard}>
          <Text style={s.sectionTitle}>Quick Actions</Text>
          <Text style={s.sectionSubtitle}>Open related help pages from here.</Text>
          <View style={s.actionRow}>
            <Pressable
              style={[s.actionBtn, s.actionBtnGhost]}
              onPress={() => navigation.navigate('HelpCenter')}
            >
              <Text style={s.actionBtnGhostText}>Open Help Center</Text>
            </Pressable>
            <Pressable
              style={[s.actionBtn, s.actionBtnPrimary]}
              onPress={() => navigation.navigate('TermsPolicies')}
            >
              <Text style={s.actionBtnPrimaryText}>Read Policies</Text>
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
