import { TouchableOpacity, Text, StyleSheet } from "react-native";

export default function PillButton({ label, selected, onPress, color, T }) {
  const c = color || T.purple;
  return (
    <TouchableOpacity
      style={[
        s.pill,
        { borderColor: selected ? c : T.border, backgroundColor: selected ? c + "18" : T.card },
      ]}
      onPress={onPress}
    >
      <Text style={[s.txt, { color: selected ? c : T.sub }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  pill: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 22, borderWidth: 1.5 },
  txt: { fontSize: 13, fontWeight: "600" },
});
