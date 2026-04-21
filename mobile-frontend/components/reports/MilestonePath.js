/**
 * Duolingo-style vertical progress path showing all 5 report tiers.
 * Each node shows: locked → in-progress → unlocked → claimed.
 * The connector line fills proportionally to the user's streak progress.
 */
import { StyleSheet, Text, View } from "react-native";

const TIER_COLORS = {
  weekly: "#CDF27E",
  monthly: "#FF9500",
  quarterly: "#A38DF2",
  biannual: "#6F4BF2",
  yearly: "#7C5CFC",
};

const TIER_EMOJI = {
  weekly: "🔥",
  monthly: "⭐",
  quarterly: "🏆",
  biannual: "💎",
  yearly: "👑",
};

function TierNode({ tier, isLast }) {
  const color = TIER_COLORS[tier.type];
  const isActive = tier.progress > 0 && tier.progress < 1 && !tier.unlocked;
  const pct = Math.round(tier.progress * 100);

  return (
    <View style={st.tierRow}>
      {/* Node */}
      <View style={st.nodeCol}>
        <View
          style={[
            st.node,
            tier.unlocked && { borderColor: color, backgroundColor: `${color}20` },
            isActive && { borderColor: color, borderStyle: "dashed" },
            !tier.unlocked && !isActive && { borderColor: "#3D2F7A", backgroundColor: "#1A1432" },
          ]}
        >
          {tier.unlocked ? (
            <Text style={st.nodeEmoji}>{TIER_EMOJI[tier.type]}</Text>
          ) : (
            <Text style={[st.nodeStreakNum, isActive && { color }]}>{tier.streak}</Text>
          )}
        </View>

        {/* Connector line to next node */}
        {!isLast && (
          <View style={st.connector}>
            <View
              style={[
                st.connectorFill,
                {
                  height: tier.unlocked ? "100%" : `${Math.min(pct, 100)}%`,
                  backgroundColor: tier.unlocked ? color : isActive ? color : "#3D2F7A",
                  opacity: tier.unlocked ? 0.6 : 0.4,
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* Label */}
      <View style={st.labelCol}>
        <Text style={[st.tierLabel, tier.unlocked && { color: "#fff" }]}>{tier.label} Report</Text>
        {tier.unlocked ? (
          <Text style={[st.tierStatus, { color }]}>
            {tier.claimed ? "Claimed" : "Unlocked — tap to claim"}
          </Text>
        ) : isActive ? (
          <Text style={[st.tierStatus, { color }]}>
            {pct}% — {tier.streak - Math.floor(tier.streak * tier.progress)} days to go
          </Text>
        ) : (
          <Text style={st.tierStatus}>{tier.streak}-day streak required</Text>
        )}
      </View>
    </View>
  );
}

export default function MilestonePath({ progress, currentStreak }) {
  return (
    <View style={st.container}>
      <View style={st.header}>
        <Text style={st.headerTitle}>Your Report Journey</Text>
        <View style={st.streakPill}>
          <Text style={st.streakPillText}>{currentStreak}d streak</Text>
        </View>
      </View>

      <View style={st.pathContainer}>
        {progress.map((tier, i) => (
          <TierNode key={tier.type} tier={tier} isLast={i === progress.length - 1} />
        ))}
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  container: {
    backgroundColor: "#1A1432",
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#3D2F7A",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  headerTitle: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  streakPill: {
    backgroundColor: "rgba(111, 75, 242, 0.2)",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#6F4BF2",
  },
  streakPillText: {
    color: "#A38DF2",
    fontSize: 11,
    fontWeight: "700",
  },
  pathContainer: {
    paddingLeft: 4,
  },
  tierRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  nodeCol: {
    alignItems: "center",
    width: 44,
  },
  node: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A1432",
  },
  nodeEmoji: {
    fontSize: 18,
  },
  nodeStreakNum: {
    color: "#7A6AAA",
    fontSize: 11,
    fontWeight: "800",
  },
  connector: {
    width: 3,
    height: 32,
    backgroundColor: "#2D1F5E",
    borderRadius: 2,
    overflow: "hidden",
    marginVertical: 2,
  },
  connectorFill: {
    width: "100%",
    borderRadius: 2,
  },
  labelCol: {
    flex: 1,
    paddingLeft: 12,
    paddingTop: 4,
    paddingBottom: 20,
  },
  tierLabel: {
    color: "#7A6AAA",
    fontSize: 13,
    fontWeight: "700",
  },
  tierStatus: {
    color: "#4A4268",
    fontSize: 10,
    marginTop: 2,
  },
});
