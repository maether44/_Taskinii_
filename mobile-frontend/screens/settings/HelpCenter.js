import React, { useState } from "react";
import { FS } from "../../constants/typography";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { FAQ_ITEMS, QUICK_START_STEPS, PAYMENT_NOTES } from "../../data/faqProfile";

const C = {
  bg: "#0F0B1E",
  card: "#161230",
  border: "#1E1A35",
  purple: "#7C5CFC",
  lime: "#C8F135",
  text: "#FFFFFF",
  sub: "#9C91BE",
};

function FaqItem({ item, expanded, onPress }) {
  return (
    <View style={styles.faqCard}>
      <Pressable style={styles.faqHeader} onPress={onPress}>
        <Text style={styles.faqQuestion}>{item.question}</Text>
        <Ionicons
          name={expanded ? "chevron-up-outline" : "chevron-down-outline"}
          size={18}
          color={C.sub}
        />
      </Pressable>
      {expanded ? <Text style={styles.faqAnswer}>{item.answer}</Text> : null}
    </View>
  );
}

export default function HelpCenter() {
  const navigation = useNavigation();
  const [openFaqId, setOpenFaqId] = useState(FAQ_ITEMS[0].id);

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Help Center</Text>
            <Text style={styles.subtitle}>Find quick answers and usage tips.</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>How To Use BodyQ</Text>
          <Text style={styles.sectionSubtitle}>A simple daily routine to get better results.</Text>
          <View style={styles.sectionBody}>
            {QUICK_START_STEPS.map((step, index) => (
              <View key={step} style={styles.stepRow}>
                <View style={styles.stepBadge}>
                  <Text style={styles.stepBadgeText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Subscription & Payment</Text>
          <Text style={styles.sectionSubtitle}>How billing works inside the app stores.</Text>
          <View style={styles.sectionBody}>
            {PAYMENT_NOTES.map((note) => (
              <View key={note} style={styles.noteRow}>
                <Ionicons name="ellipse" size={7} color={C.lime} style={styles.dot} />
                <Text style={styles.noteText}>{note}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>FAQ</Text>
          <Text style={styles.sectionSubtitle}>Most common questions from BodyQ users.</Text>
          <View style={styles.sectionBody}>
            {FAQ_ITEMS.map((item) => (
              <FaqItem
                key={item.id}
                item={item}
                expanded={openFaqId === item.id}
                onPress={() => setOpenFaqId(openFaqId === item.id ? "" : item.id)}
              />
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 24, gap: 14 },
  headerRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  headerTextWrap: { flex: 1 },
  title: { color: C.text, fontSize: FS.screenTitle, fontWeight: "800", letterSpacing: -0.4 },
  subtitle: { color: C.sub, fontSize: FS.sub, marginTop: 4 },
  sectionCard: {
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  sectionTitle: { color: C.text, fontSize: FS.btnPrimary, fontWeight: "800" },
  sectionSubtitle: { color: C.sub, fontSize: FS.badge, marginTop: 5 },
  sectionBody: { marginTop: 12, gap: 10 },
  faqCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  faqHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  faqQuestion: { color: C.text, fontSize: FS.sub, fontWeight: "700", flex: 1 },
  faqAnswer: { color: C.sub, fontSize: FS.badge, lineHeight: 18, marginTop: 8 },
  stepRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: { color: C.text, fontSize: FS.badge, fontWeight: "800" },
  stepText: { color: C.text, fontSize: FS.sub, flex: 1, lineHeight: 18 },
  noteRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  dot: { marginTop: 5 },
  noteText: { color: C.text, fontSize: FS.badge, lineHeight: 18, flex: 1 },
});
