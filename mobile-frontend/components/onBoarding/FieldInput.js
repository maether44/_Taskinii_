import { View, Text, TextInput, StyleSheet } from "react-native";

export default function FieldInput({
  label,
  value,
  onChange,
  placeholder,
  unit,
  T,
  optional,
  isDate,
}) {
  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[s.label, { color: T.sub }]}>
        {label}
        {optional && <Text style={{ color: T.muted }}> (optional)</Text>}
      </Text>
      <View style={[s.wrap, { backgroundColor: T.card, borderColor: T.border }]}>
        <TextInput
          style={[s.input, { color: T.text }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={T.muted}
          keyboardType={isDate ? "default" : "numeric"}
          maxLength={isDate ? 10 : 4}
        />
        {unit && <Text style={[s.unit, { color: T.sub }]}>{unit}</Text>}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  label: { fontSize: 13, fontWeight: "700", marginBottom: 10 },
  wrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 8,
  },
  input: { flex: 1, fontSize: 18, fontWeight: "700" },
  unit: { fontSize: 13 },
});
