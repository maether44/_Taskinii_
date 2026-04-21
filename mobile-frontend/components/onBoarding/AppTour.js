import { useAppTour } from "../../hooks/useAppTour";
import { STEPS } from "../../constants/tourSteps";
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

const BUBBLE_W = 220;
const CORNER = 15;
const ARROW = 11;
const cBase = { position: "absolute", width: CORNER, height: CORNER };

export { resetTour } from "../../services/tourService";

export default function AppTour({ activeTab, onTabPress, showOnMount = false }) {
  const {
    visible,
    computed,
    stepIdx,
    overlayOp,
    sL,
    sT,
    sW,
    sH,
    sR,
    bubOp,
    bubTY,
    glow,
    next,
    prev,
    done,
  } = useAppTour({ activeTab, onTabPress, showOnMount });

  if (!visible || !computed) return null;

  const step = STEPS[stepIdx];
  const isLast = stepIdx === STEPS.length - 1;
  const isFirst = stepIdx === 0;
  const pct = (stepIdx + 1) / STEPS.length;

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: ["#7B61FF", "#A78BFF"],
  });

  return (
    <Modal transparent animationType="none" visible={visible} statusBarTranslucent>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: overlayOp }]}>
        {/* Overlay rects + spotlight */}
        {computed.hasSpot ? (
          <>
            <Animated.View style={[s.mask, { top: 0, left: 0, right: 0, height: sT }]} />
            <Animated.View
              style={[s.mask, { top: Animated.add(sT, sH), left: 0, right: 0, bottom: 0 }]}
            />
            <Animated.View style={[s.mask, { top: sT, left: 0, width: sL, height: sH }]} />
            <Animated.View
              style={[s.mask, { top: sT, left: Animated.add(sL, sW), right: 0, height: sH }]}
            />

            <Animated.View
              style={[
                s.spotRing,
                {
                  left: sL,
                  top: sT,
                  width: sW,
                  height: sH,
                  borderRadius: sR,
                  borderColor: glowColor,
                },
              ]}
            />

            <Animated.View
              style={[s.cTL, { left: Animated.subtract(sL, 1), top: Animated.subtract(sT, 1) }]}
            />
            <Animated.View
              style={[
                s.cTR,
                { left: Animated.add(Animated.add(sL, sW), -15), top: Animated.subtract(sT, 1) },
              ]}
            />
            <Animated.View
              style={[
                s.cBL,
                { left: Animated.subtract(sL, 1), top: Animated.add(Animated.add(sT, sH), -15) },
              ]}
            />
            <Animated.View
              style={[
                s.cBR,
                {
                  left: Animated.add(Animated.add(sL, sW), -15),
                  top: Animated.add(Animated.add(sT, sH), -15),
                },
              ]}
            />
          </>
        ) : (
          <View style={[StyleSheet.absoluteFill, s.mask]} />
        )}

        {/* Bubble */}
        <Animated.View
          style={[
            s.bubble,
            computed.centered && s.bubbleCentered,
            !computed.centered && { left: computed.bx, top: computed.by, width: BUBBLE_W },
            { opacity: bubOp, transform: [{ translateY: bubTY }] },
          ]}
        >
          {computed.arrowSide === "bottom" && (
            <View style={[s.arrowDown, { left: computed.arrowOffset }]} />
          )}
          {computed.arrowSide === "right" && (
            <View style={[s.arrowRight, { top: computed.arrowOffset }]} />
          )}

          <View style={s.bubbleCard}>
            <View style={s.row}>
              <View style={s.badge}>
                <Text style={{ fontSize: 15 }}>{step.emoji}</Text>
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={s.progressBg}>
                  <View style={[s.progressFill, { width: `${pct * 100}%` }]} />
                </View>
                <Text style={s.counter}>
                  {stepIdx + 1} of {STEPS.length}
                </Text>
              </View>
              <TouchableOpacity
                onPress={done}
                hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              >
                <Text style={s.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.title}>{step.title}</Text>
            <Text style={s.body}>{step.body}</Text>

            <View style={s.dots}>
              {STEPS.map((_, i) => (
                <View
                  key={i}
                  style={[s.dot, i === stepIdx && s.dotActive, i < stepIdx && s.dotDone]}
                />
              ))}
            </View>

            <View style={s.btnRow}>
              {!isFirst ? (
                <TouchableOpacity style={s.prevBtn} onPress={prev}>
                  <Text style={s.prevTxt}>←</Text>
                </TouchableOpacity>
              ) : (
                <View style={{ width: 40 }} />
              )}
              <TouchableOpacity style={s.nextBtn} onPress={next}>
                <Text style={s.nextTxt}>{isLast ? "🚀 Done" : "Next →"}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {computed.arrowSide === "top" && (
            <View style={[s.arrowUp, { left: computed.arrowOffset }]} />
          )}
          {computed.arrowSide === "left" && (
            <View style={[s.arrowLeft, { top: computed.arrowOffset }]} />
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const s = StyleSheet.create({
  mask: { position: "absolute", backgroundColor: "rgba(5,3,15,0.72)" },
  spotRing: {
    position: "absolute",
    borderWidth: 2,
    shadowColor: "#7B61FF",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 14,
    elevation: 12,
  },
  cTL: {
    ...cBase,
    borderTopWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: "#B8F566",
    borderTopLeftRadius: 3,
  },
  cTR: {
    ...cBase,
    borderTopWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: "#B8F566",
    borderTopRightRadius: 3,
  },
  cBL: {
    ...cBase,
    borderBottomWidth: 2.5,
    borderLeftWidth: 2.5,
    borderColor: "#B8F566",
    borderBottomLeftRadius: 3,
  },
  cBR: {
    ...cBase,
    borderBottomWidth: 2.5,
    borderRightWidth: 2.5,
    borderColor: "#B8F566",
    borderBottomRightRadius: 3,
  },
  bubble: { position: "absolute", zIndex: 999 },
  bubbleCentered: { left: 28, right: 28, top: "35%" },
  bubbleCard: {
    backgroundColor: "#16132B",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2D2850",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 24,
    elevation: 24,
  },
  arrowUp: {
    position: "absolute",
    top: -ARROW,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderLeftColor: "transparent",
    borderRightWidth: ARROW,
    borderRightColor: "transparent",
    borderBottomWidth: ARROW,
    borderBottomColor: "#16132B",
  },
  arrowDown: {
    position: "absolute",
    bottom: -ARROW,
    width: 0,
    height: 0,
    borderLeftWidth: ARROW,
    borderLeftColor: "transparent",
    borderRightWidth: ARROW,
    borderRightColor: "transparent",
    borderTopWidth: ARROW,
    borderTopColor: "#16132B",
  },
  arrowLeft: {
    position: "absolute",
    left: -ARROW,
    width: 0,
    height: 0,
    borderTopWidth: ARROW,
    borderTopColor: "transparent",
    borderBottomWidth: ARROW,
    borderBottomColor: "transparent",
    borderRightWidth: ARROW,
    borderRightColor: "#16132B",
  },
  arrowRight: {
    position: "absolute",
    right: -ARROW,
    width: 0,
    height: 0,
    borderTopWidth: ARROW,
    borderTopColor: "transparent",
    borderBottomWidth: ARROW,
    borderBottomColor: "transparent",
    borderLeftWidth: ARROW,
    borderLeftColor: "#16132B",
  },
  row: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#7B61FF1A",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#7B61FF30",
  },
  progressBg: { height: 3, backgroundColor: "#221F3A", borderRadius: 2, overflow: "hidden" },
  progressFill: { height: 3, backgroundColor: "#7B61FF", borderRadius: 2 },
  counter: { color: "#4A4070", fontSize: 10, fontWeight: "700" },
  closeBtn: { color: "#3A3460", fontSize: 16, fontWeight: "700", padding: 2 },
  title: { color: "#EDE8FF", fontSize: 15, fontWeight: "900", marginBottom: 6, lineHeight: 22 },
  body: { color: "#7B6FA8", fontSize: 13, lineHeight: 20, marginBottom: 12 },
  dots: { flexDirection: "row", gap: 4, marginBottom: 14 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#221F3A" },
  dotActive: { width: 20, backgroundColor: "#7B61FF" },
  dotDone: { backgroundColor: "#7B61FF50" },
  btnRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  prevBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#2D2850",
    alignItems: "center",
    justifyContent: "center",
  },
  prevTxt: { color: "#5A5282", fontSize: 16 },
  nextBtn: {
    flex: 1,
    backgroundColor: "#7B61FF",
    borderRadius: 13,
    paddingVertical: 12,
    alignItems: "center",
    shadowColor: "#7B61FF",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 10,
    elevation: 8,
  },
  nextTxt: { color: "#fff", fontSize: 14, fontWeight: "800" },
});
