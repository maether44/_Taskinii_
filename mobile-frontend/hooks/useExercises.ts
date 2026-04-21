import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchExercises } from "../services/exerciseService";

export function useExercises() {
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");

  const loadExercises = useCallback(async () => {
    try {
      setError("");
      const data = await fetchExercises();
      setExercises(data);
    } catch (e) {
      setError(e?.message || "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadExercises();
  }, [loadExercises]);

  const onRefresh = () => {
    setRefreshing(true);
    loadExercises();
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return exercises;
    return exercises.filter((e) => {
      const name = e.name?.toLowerCase() || "";
      const category = e.category?.toLowerCase() || "";
      const muscles = (e.primaryMuscles || []).join(" ").toLowerCase();
      return name.includes(q) || category.includes(q) || muscles.includes(q);
    });
  }, [exercises, query]);

  return { filtered, loading, refreshing, error, query, setQuery, onRefresh, retry: loadExercises };
}
