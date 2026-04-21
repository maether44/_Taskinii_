import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

export default function SelectCard({ emoji, title, sub, selected, onPress, T }) {
  return (
    <TouchableOpacity
      style={[
        s.card,
        { backgroundColor: T.card, borderColor: selected ? T.purple : T.border },
        selected && { backgroundColor: T.purple + "14" },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      {emoji ? <Text style={s.emoji}>{emoji}</Text> : null}
      <View style={{ flex: 1 }}>
        <Text style={[s.title, { color: selected ? T.text : T.sub }]}>{title}</Text>
        {sub ? <Text style={[s.sub, { color: T.sub }]}>{sub}</Text> : null}
      </View>
      <View
        style={[
          s.check,
          { borderColor: selected ? T.purple : T.border },
          selected && { backgroundColor: T.purple },
        ]}
      >
        {selected && <Text style={{ color: "#fff", fontSize: 11, fontWeight: "800" }}>✓</Text>}
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    borderWidth: 1.5,
  },
  emoji: { fontSize: 24, width: 32, textAlign: "center" },
  title: { fontSize: 15, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  check: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});
