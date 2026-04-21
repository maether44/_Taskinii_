import React, { useMemo, useState } from "react";
import { FS } from "../../constants/typography";
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../context/AuthContext";

const C = {
  bg: "#0F0B1E",
  card: "#161230",
  border: "#1E1A35",
  purple: "#7C5CFC",
  lime: "#C8F135",
  text: "#FFFFFF",
  sub: "#9C91BE",
  danger: "#FF6B6B",
};

const ISSUE_TYPES = [
  { id: "bug", label: "Bug" },
  { id: "ui", label: "UI Problem" },
  { id: "performance", label: "Performance" },
  { id: "payment", label: "Payment" },
  { id: "other", label: "Other" },
];

export default function Report() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [issueType, setIssueType] = useState("bug");
  const [issueTypeOpen, setIssueTypeOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedIssueType = useMemo(() => {
    return ISSUE_TYPES.find((type) => type.id === issueType) || ISSUE_TYPES[0];
  }, [issueType]);

  const canSubmit = useMemo(() => {
    return !isSubmitting && subject.trim().length >= 4 && details.trim().length >= 12;
  }, [subject, details, isSubmitting]);

  const onSubmit = async () => {
    const trimmedSubject = subject.trim();
    const trimmedDetails = details.trim();
    const trimmedEmail = email.trim();

    if (trimmedSubject.length < 4) {
      Alert.alert("Subject too short", "Please add a clear title (at least 4 characters).");
      return;
    }

    if (trimmedDetails.length < 12) {
      Alert.alert("More details needed", "Please describe the issue in more detail.");
      return;
    }

    if (!user?.id) {
      Alert.alert("Not signed in", "Please sign in to submit a report.");
      return;
    }

    const detailsToSave = trimmedEmail
      ? `${trimmedDetails}\n\nContact email: ${trimmedEmail}`
      : trimmedDetails;

    try {
      setIsSubmitting(true);
      const { error } = await supabase.from("reports").insert({
        user_id: user.id,
        issue_type: issueType,
        subject: trimmedSubject,
        details: detailsToSave,
        status: "open",
      });

      if (error) {
        throw error;
      }

      setSubject("");
      setDetails("");
      setEmail("");
      setIssueType("bug");
      setIssueTypeOpen(false);
      Alert.alert("Report submitted", "Thanks, your report has been saved.", [
        {
          text: "OK",
          onPress: () => navigation.navigate("Settings"),
        },
      ]);
    } catch {
      Alert.alert("Submission failed", "We could not save your report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={20} color={C.text} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <Text style={styles.title}>Report A Problem</Text>
            <Text style={styles.subtitle}>Tell us what happened so we can improve BodyQ.</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Issue Type</Text>
          <View style={styles.dropdownAnchor}>
            <Pressable
              style={styles.dropdownTrigger}
              onPress={() => setIssueTypeOpen((prev) => !prev)}
            >
              <Text style={styles.dropdownTriggerText}>{selectedIssueType.label}</Text>
              <Ionicons
                name={issueTypeOpen ? "chevron-up-outline" : "chevron-down-outline"}
                size={18}
                color={C.sub}
              />
            </Pressable>

            {issueTypeOpen ? (
              <View style={styles.dropdownMenu}>
                {ISSUE_TYPES.map((type, index) => {
                  const active = issueType === type.id;
                  return (
                    <Pressable
                      key={type.id}
                      style={({ hovered, pressed }) => [
                        styles.dropdownOption,
                        (hovered || pressed) && styles.dropdownOptionHover,
                        index < ISSUE_TYPES.length - 1 && styles.dropdownBorder,
                      ]}
                      onPress={() => {
                        setIssueType(type.id);
                        setIssueTypeOpen(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.dropdownOptionText,
                          active && styles.dropdownOptionTextActive,
                        ]}
                      >
                        {type.label}
                      </Text>
                      {active ? <Ionicons name="checkmark" size={16} color={C.lime} /> : null}
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Subject</Text>
          <TextInput
            value={subject}
            onChangeText={setSubject}
            placeholder="Short title for this problem"
            placeholderTextColor={C.sub}
            style={styles.input}
            maxLength={80}
          />

          <Text style={[styles.sectionTitle, styles.withTopSpace]}>Details</Text>
          <TextInput
            value={details}
            onChangeText={setDetails}
            placeholder="What happened? What did you expect?"
            placeholderTextColor={C.sub}
            style={[styles.input, styles.textArea]}
            multiline
            textAlignVertical="top"
            maxLength={1200}
          />

          <Text style={styles.note}>Your report is sent directly to our support system.</Text>

          <Pressable
            style={[styles.submitBtn, !canSubmit && styles.submitBtnDisabled]}
            onPress={onSubmit}
            disabled={!canSubmit}
          >
            <Ionicons name="send" size={16} color="#fff" />
            <Text style={styles.submitBtnText}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Text>
          </Pressable>

          {!canSubmit ? (
            <Text style={styles.validation}>Add a subject and enough details to continue.</Text>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  scroll: { paddingHorizontal: 16, paddingTop: 52, paddingBottom: 28, gap: 14 },
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
    paddingBottom: 14,
  },
  sectionTitle: { color: C.text, fontSize: FS.btnSecondary, fontWeight: "800", marginBottom: 8 },
  dropdownAnchor: { position: "relative", zIndex: 20 },
  dropdownTrigger: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    backgroundColor: C.bg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dropdownTriggerText: { color: C.text, fontSize: FS.sub, fontWeight: "700" },
  dropdownMenu: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: "#1A1635",
    overflow: "hidden",
    zIndex: 30,
    elevation: 6,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 11,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#221D43",
    borderWidth: 1,
    borderColor: "#3A2F69",
  },
  dropdownOptionHover: { backgroundColor: "#3F3378" },
  dropdownBorder: { borderBottomWidth: 1, borderBottomColor: C.border },
  dropdownOptionText: { color: C.text, fontSize: FS.sub },
  dropdownOptionTextActive: { color: C.lime, fontWeight: "700" },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    backgroundColor: C.bg,
    color: C.text,
    fontSize: FS.sub,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  textArea: { minHeight: 130, lineHeight: 19 },
  withTopSpace: { marginTop: 14 },
  note: { color: C.sub, fontSize: FS.badge, lineHeight: 17, marginTop: 12 },
  submitBtn: {
    marginTop: 14,
    backgroundColor: C.purple,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { color: "#fff", fontSize: FS.btnSecondary, fontWeight: "800" },
  validation: { color: C.danger, fontSize: FS.badge, marginTop: 10 },
});
