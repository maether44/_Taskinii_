import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Image,
  TextInput,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const BASE_IMG =
  "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/";

const C = {
  bg: "#0F0B1E",
  card: "#161230",
  border: "#1E1A35",
  purple: "#7C5CFC",
  lime: "#C8F135",
  accent: "#9D85F5",
  text: "#FFFFFF",
  sub: "#6B5F8A",
  red: "#FF3B30",
};

const ExerciseCard = ({ exercise }) => {
  const imagePath = exercise.images?.[0];
  const primaryMuscles = exercise.primaryMuscles?.join(", ") || "N/A";

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.exerciseName}>{exercise.name}</Text>
          <Text style={styles.metaText}>
            {exercise.level} · {exercise.category} · {exercise.equipment}
          </Text>
        </View>
      </View>

      {!!exercise.instructions && (
        <Text style={styles.description} numberOfLines={2}>
          {exercise.instructions}
        </Text>
      )}

      <Text style={styles.muscles}>Muscles: {primaryMuscles}</Text>

      {!!imagePath && (
        <Image
          source={{ uri: BASE_IMG + imagePath }}
          style={styles.exerciseImage}
          resizeMode="cover"
        />
      )}
    </View>
  );
};

export default function ExerciseList() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const fetchExercises = useCallback(async () => {
    try {
      setError("");
      const res = await fetch(
        "https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json",
      );
      if (!res.ok) throw new Error("Failed to fetch exercises");
      const data = await res.json();
      setExercises(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchExercises();
  }, [fetchExercises]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchExercises();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => {
      const name = e.name?.toLowerCase() || "";
      const category = e.category?.toLowerCase() || "";
      const muscles = (e.primaryMuscles || []).join(" ").toLowerCase();
      return (
        name.includes(q) || category.includes(q) || muscles.includes(q)
      );
    });
  }, [exercises, query]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={C.purple} />
        <Text style={styles.loadingText}>Loading exercises...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Ionicons name="alert-circle-outline" size={56} color={C.red} />
        <Text style={styles.errorText}>Error loading exercises</Text>
        <Text style={styles.errorMessage}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchExercises}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Exercises</Text>
        <Text style={styles.subtitle}>{filtered.length} available</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color={C.sub} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises..."
          placeholderTextColor={C.sub}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item, index) => item.id || `${item.name}-${index}`}
        renderItem={({ item }) => <ExerciseCard exercise={item} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={C.purple}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="barbell-outline" size={52} color={C.sub} />
            <Text style={styles.emptyText}>No exercises found</Text>
            <Text style={styles.emptySubtext}>Try another search term</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    paddingHorizontal: 16,
    paddingTop: 56,
    paddingBottom: 14,
  },
  title: {
    color: C.text,
    fontSize: 28,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  subtitle: {
    color: C.sub,
    fontSize: 12,
    marginTop: 4,
  },

  searchWrap: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: C.text,
    fontSize: 14,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },

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
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: C.purple,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseName: {
    color: C.text,
    fontSize: 20,
    fontWeight: "700",
  },
  metaText: {
    color: C.sub,
    fontSize: 13,
    marginTop: 2,
    textTransform: "capitalize",
  },
  description: {
    color: "#C9C2DF",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  muscles: {
    color: C.accent,
    fontSize: 12,
    marginTop: 8,
    marginBottom: 10,
  },
  exerciseImage: {
    width: "100%",
    height: 170,
    borderRadius: 12,
    backgroundColor: C.border,
  },

  centerContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: C.bg,
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    color: C.sub,
    fontSize: 14,
  },
  errorText: {
    marginTop: 14,
    color: C.text,
    fontSize: 18,
    fontWeight: "700",
  },
  errorMessage: {
    marginTop: 8,
    color: C.sub,
    textAlign: "center",
    fontSize: 13,
  },
  retryButton: {
    marginTop: 16,
    backgroundColor: C.purple,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  retryButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 13,
  },

  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 70,
  },
  emptyText: {
    marginTop: 12,
    color: C.text,
    fontSize: 16,
    fontWeight: "700",
  },
  emptySubtext: {
    marginTop: 4,
    color: C.sub,
    fontSize: 12,
  },
});