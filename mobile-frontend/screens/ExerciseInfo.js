import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_IMG } from "../services/exerciseService";
import { FS } from '../constants/typography';


const C = {
  bg: "#0F0B1E",
  card: "#161230",
  border: "#1E1A35",
  purple: "#7C5CFC",
  text: "#FFFFFF",
  sub: "#6B5F8A",
  accent: "#9D85F5",
  muted: "#4A4160",
};

export default function ExerciseInfo({ route, navigation }) {
  const { exercise } = route.params;

  const primaryMuscles = exercise.primaryMuscles?.join(", ") || "N/A";
  const secondaryMuscles = exercise.secondaryMuscles?.join(", ") || "None";

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Exercise Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Exercise Name */}
        <Text style={s.name}>{exercise.name}</Text>

        {/* Meta Info */}
        <View style={s.metaRow}>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Level</Text>
            <Text style={s.metaValue}>{exercise.level}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Category</Text>
            <Text style={s.metaValue}>{exercise.category}</Text>
          </View>
          <View style={s.metaItem}>
            <Text style={s.metaLabel}>Equipment</Text>
            <Text style={s.metaValue}>{exercise.equipment}</Text>
          </View>
        </View>

        {/* Images */}
        {(exercise.images || []).length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Visual Guide</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={s.imageScroll}
            >
              {(exercise.images || []).map((img, i) => (
                <Image
                  key={i}
                  source={{ uri: BASE_IMG + img }}
                  style={s.image}
                  resizeMode="cover"
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Muscles */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Target Muscles</Text>
          <View style={s.muscleCard}>
            <View style={s.muscleRow}>
              <Text style={s.muscleLabel}>Primary:</Text>
              <Text style={s.musclePrimary}>{primaryMuscles}</Text>
            </View>
            <View style={s.muscleRow}>
              <Text style={s.muscleLabel}>Secondary:</Text>
              <Text style={s.muscleSecondary}>{secondaryMuscles}</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        {exercise.instructions && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Instructions</Text>
            <Text style={s.instructions}>{exercise.instructions}</Text>
          </View>
        )}

        {/* Force & Mechanic */}
        {(exercise.force || exercise.mechanic) && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Additional Info</Text>
            <View style={s.infoCard}>
              {exercise.force && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Force:</Text>
                  <Text style={s.infoValue}>{exercise.force}</Text>
                </View>
              )}
              {exercise.mechanic && (
                <View style={s.infoRow}>
                  <Text style={s.infoLabel}>Mechanic:</Text>
                  <Text style={s.infoValue}>{exercise.mechanic}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Sticky Footer Action */}
      <View style={s.footer}>
        <TouchableOpacity
          style={s.mainActionBtn}
          onPress={() => navigation.navigate('WorkoutActive', { exerciseKey: exercise.name.toLowerCase() })}
        >
          <Text style={s.mainActionTxt}>START AI POSTURE COACH</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 16,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { color: C.text, fontSize: FS.cardTitle, fontWeight: "700" },
  scroll: { padding: 16 },
  name: {
    color: C.text,
    fontSize: FS.screenTitle,
    fontWeight: "900",
    letterSpacing: -0.6,
    marginBottom: 16,
  },
  metaRow: { flexDirection: "row", gap: 12, marginBottom: 24 },
  metaItem: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  metaLabel: { color: C.sub, fontSize: FS.sub, fontWeight: "600", marginBottom: 4 },
  metaValue: {
    color: C.text,
    fontSize: FS.btnPrimary,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  section: { marginBottom: 24 },
  sectionTitle: {
    color: C.text,
    fontSize: FS.cardTitle,
    fontWeight: "800",
    marginBottom: 12,
  },
  imageScroll: { marginHorizontal: -16 },
  image: {
    width: 280,
    height: 220,
    borderRadius: 16,
    marginLeft: 16,
    backgroundColor: C.border,
  },
  muscleCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  muscleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  muscleLabel: { color: C.sub, fontSize: FS.body, fontWeight: "600", width: 80 },
  musclePrimary: {
    color: C.accent,
    fontSize: FS.btnPrimary,
    fontWeight: "700",
    flex: 1,
    textTransform: "capitalize",
  },
  muscleSecondary: {
    color: C.text,
    fontSize: FS.btnPrimary,
    flex: 1,
    textTransform: "capitalize",
  },
  instructions: { color: "#C9C2DF", fontSize: FS.bodyLarge, lineHeight: 24 },
  infoCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoLabel: { color: C.sub, fontSize: FS.body, fontWeight: "600", width: 80 },
  infoValue: {
    color: C.text,
    fontSize: FS.btnPrimary,
    textTransform: "capitalize",
    flex: 1,
  },
  footer: {
    padding: 20,
    backgroundColor: C.bg,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  mainActionBtn: {
    backgroundColor: '#C8F135',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#C8F135',
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  mainActionTxt: { color: '#000', fontWeight: '900', fontSize: FS.bodyLarge, letterSpacing: 1 },
});
