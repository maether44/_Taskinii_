import { View, Text, Image, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { BASE_IMG } from "../services/exerciseService";

const C = {
  card: "#161230",
  border: "#1E1A35",
  text: "#FFFFFF",
  sub: "#6B5F8A",
  accent: "#9D85F5",
};

export default function ExerciseCard({ navigation, exercise, personalBest }) {
  const imagePath = exercise.images?.[0];
  const primaryMuscles = exercise.primaryMuscles?.join(", ") || "N/A";

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Text style={s.name}>{exercise.name}</Text>
            {personalBest?.isNew && (
              <View style={s.pbBadge}>
                <Ionicons name="trophy" size={10} color="#000" />
                <Text style={s.pbBadgeTxt}>PB {personalBest.score}%</Text>
              </View>
            )}
            {personalBest && !personalBest.isNew && personalBest.score >= 85 && (
              <View style={[s.pbBadge, s.pbBadgeOld]}>
                <Text style={[s.pbBadgeTxt, { color: "#C8F135" }]}>Best {personalBest.score}%</Text>
              </View>
            )}
          </View>
          <Text style={s.meta}>
            {exercise.level} · {exercise.category} · {exercise.equipment}
          </Text>
        </View>
      </View>

      {!!exercise.instructions && (
        <>
          <Text style={s.description} numberOfLines={2}>
            {exercise.instructions}
          </Text>
          <Pressable
            onPress={() => navigation.navigate("ExerciseInfo", { exercise })}
            style={s.seeMoreBtn}
          >
            <Text style={s.seeMoreText}>See More</Text>
          </Pressable>
        </>
      )}

      <Text style={s.muscles}>Muscles: {primaryMuscles}</Text>

      {!!imagePath && (
        <Image source={{ uri: BASE_IMG + imagePath }} style={s.image} resizeMode="cover" />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  name: { color: C.text, fontSize: 20, fontWeight: "700" },
  meta: {
    color: C.sub,
    fontSize: 13,
    marginTop: 2,
    textTransform: "capitalize",
  },
  description: { color: "#C9C2DF", fontSize: 14, lineHeight: 20, marginTop: 2 },
  seeMoreBtn: { alignSelf: "flex-start", marginTop: 6, paddingVertical: 4 },
  seeMoreText: { color: C.accent, fontSize: 13, fontWeight: "600" },
  muscles: { color: C.accent, fontSize: 12, marginTop: 8, marginBottom: 10 },
  pbBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#C8F135",
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  pbBadgeOld: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: "#C8F135",
    borderRadius: 6,
  },
  pbBadgeTxt: { fontSize: 10, fontWeight: "800", color: "#000" },
  image: {
    width: "100%",
    height: 170,
    borderRadius: 12,
    backgroundColor: C.border,
  },
});
