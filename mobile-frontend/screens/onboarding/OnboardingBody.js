// src/components/navigation/NavBar.js
import { Ionicons } from "@expo/vector-icons";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const TABS = [
  { key: "Home", label: "Home", icon: "home", iconActive: "home" },
  { key: "Nutrition", label: "Nutrition", icon: "nutrition", iconActive: "nutrition" },
  { key: "PostureAI", label: "Posture", icon: "body", iconActive: "body" },
  { key: "Training", label: "Train", icon: "barbell-outline", iconActive: "barbell" },
  { key: "Insights", label: "Insights", icon: "stats-chart-outline", iconActive: "stats-chart" },
];

export default function NavBar({ activeTab, onTabPress }) {
  return (
    <View style={s.bar}>
      {TABS.map((tab) => {
        const active = activeTab === tab.key;
        return (
          <TouchableOpacity
            key={tab.key}
            style={s.tab}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.7}
          >
            {active && <View style={s.activePill} />}
            <View style={[s.iconWrap, active && s.iconWrapActive]}>
              <Ionicons
                name={active ? tab.iconActive : tab.icon}
                size={22}
                color={active ? "#0D0D0D" : "#6B5F8A"}
              />
            </View>
            <Text style={[s.label, active && s.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: "row",
    backgroundColor: "#161230",
    borderTopWidth: 1,
    borderTopColor: "#1E1A35",
    paddingBottom: Platform.OS === "ios" ? 28 : 10,
    paddingTop: 10,
    paddingHorizontal: 8,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 2,
    position: "relative",
  },
  activePill: {
    position: "absolute",
    top: -10,
    width: 36,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#C8F135",
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  iconWrapActive: {
    backgroundColor: "#C8F135",
  },
  label: { fontSize: 10, fontWeight: "500", color: "#6B5F8A", marginTop: 2, letterSpacing: 0.2 },
  labelActive: { color: "#C8F135", fontWeight: "700" },
});
