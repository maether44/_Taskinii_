import { useEffect, useRef, useState } from "react";
import { Animated } from "react-native";
import { STEPS } from "../constants/tourSteps";
import { hasTourBeenSeen, markTourSeen } from "../services/tourService";
import { measureTourRef } from "../components/onBoarding/tourRefs";

const PAD = 14;
const BUBBLE_W = 220;
const BUBBLE_H = 170;
import { Dimensions } from "react-native";
const { width: W, height: H } = Dimensions.get("window");

export function useAppTour({ activeTab, onTabPress, showOnMount }) {
  const [visible, setVisible] = useState(false);
  const [stepIdx, setStepIdx] = useState(0);
  const [computed, setComputed] = useState(null);

  const overlayOp = useRef(new Animated.Value(0)).current;
  const sL = useRef(new Animated.Value(0)).current;
  const sT = useRef(new Animated.Value(0)).current;
  const sW = useRef(new Animated.Value(0)).current;
  const sH = useRef(new Animated.Value(0)).current;
  const sR = useRef(new Animated.Value(16)).current;
  const bubOp = useRef(new Animated.Value(0)).current;
  const bubTY = useRef(new Animated.Value(16)).current;
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!showOnMount) return;

    hasTourBeenSeen().then((seen) => {
      if (!seen) {
        setTimeout(() => setVisible(true), 800);
      }
    });
  }, [showOnMount]);

  useEffect(() => {
    if (!visible) return;
    Animated.timing(overlayOp, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
    goStep(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 900,
          useNativeDriver: false,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 900,
          useNativeDriver: false,
        }),
      ]),
    ).start();
  }, [visible]);

  const moveSpot = (rect) => {
    Animated.parallel([
      Animated.spring(sL, {
        toValue: rect.x - PAD,
        useNativeDriver: false,
        tension: 55,
        friction: 9,
      }),
      Animated.spring(sT, {
        toValue: rect.y - PAD,
        useNativeDriver: false,
        tension: 55,
        friction: 9,
      }),
      Animated.spring(sW, {
        toValue: rect.width + PAD * 2,
        useNativeDriver: false,
        tension: 55,
        friction: 9,
      }),
      Animated.spring(sH, {
        toValue: rect.height + PAD * 2,
        useNativeDriver: false,
        tension: 55,
        friction: 9,
      }),
      Animated.spring(sR, {
        toValue: 16,
        useNativeDriver: false,
        tension: 55,
        friction: 9,
      }),
    ]).start();
  };

  const hideSpot = () => {
    Animated.parallel([
      Animated.timing(sW, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
      Animated.timing(sH, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false,
      }),
    ]).start();
  };

  const showBubble = (fromY = 12) => {
    bubTY.setValue(fromY);
    bubOp.setValue(0);
    Animated.parallel([
      Animated.timing(bubOp, {
        toValue: 1,
        duration: 240,
        useNativeDriver: true,
      }),
      Animated.spring(bubTY, {
        toValue: 0,
        tension: 80,
        friction: 11,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const hideBubble = () =>
    new Promise((res) =>
      Animated.parallel([
        Animated.timing(bubOp, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(bubTY, {
          toValue: -10,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(res),
    );

  const computeLayout = (rect, side) => {
    const spotL = rect.x - PAD;
    const spotT = rect.y - PAD;
    const spotR = rect.x + rect.width + PAD;
    const spotB = rect.y + rect.height + PAD;
    const spotCX = (spotL + spotR) / 2;
    const spotCY = (spotT + spotB) / 2;
    const margin = 16;

    let bx;
    let by;
    let arrowSide;
    let arrowOffset;

    if (side === "bottom") {
      by = spotB + margin;
      bx = Math.max(16, Math.min(spotCX - BUBBLE_W / 2, W - BUBBLE_W - 16));
      arrowSide = "top";
      arrowOffset = Math.min(Math.max(spotCX - bx - 14, 16), BUBBLE_W - 44);
    } else if (side === "top") {
      by = spotT - BUBBLE_H - margin;
      bx = Math.max(16, Math.min(spotCX - BUBBLE_W / 2, W - BUBBLE_W - 16));
      arrowSide = "bottom";
      arrowOffset = Math.min(Math.max(spotCX - bx - 14, 16), BUBBLE_W - 44);
    } else if (side === "right") {
      bx = spotR + margin;
      by = Math.max(80, Math.min(spotCY - BUBBLE_H / 2, H - BUBBLE_H - 80));
      arrowSide = "left";
      arrowOffset = Math.min(Math.max(spotCY - by - 14, 16), BUBBLE_H - 44);
    } else {
      bx = spotL - BUBBLE_W - margin;
      by = Math.max(80, Math.min(spotCY - BUBBLE_H / 2, H - BUBBLE_H - 80));
      arrowSide = "right";
      arrowOffset = Math.min(Math.max(spotCY - by - 14, 16), BUBBLE_H - 44);
    }

    bx = Math.max(16, Math.min(bx, W - BUBBLE_W - 16));
    by = Math.max(60, Math.min(by, H - BUBBLE_H - 90));

    return { bx, by, arrowSide, arrowOffset, hasSpot: true };
  };

  const goStep = async (idx) => {
    const step = STEPS[idx];

    if (step.tab !== activeTab) {
      onTabPress?.(step.tab);
      await new Promise((r) => setTimeout(r, 500));
    }

    if (step.refKey) {
      const rect = await measureTourRef(step.refKey);
      if (rect) {
        moveSpot(rect);
        setComputed(computeLayout(rect, step.side));
        showBubble(step.side === "top" ? 14 : -14);
        return;
      }
    }

    hideSpot();
    setComputed({
      bx: (W - BUBBLE_W - 40) / 2,
      by: H / 2 - BUBBLE_H / 2 - 20,
      arrowSide: null,
      arrowOffset: 0,
      hasSpot: false,
      centered: true,
    });
    showBubble(14);
  };

  const next = async () => {
    await hideBubble();
    if (stepIdx >= STEPS.length - 1) {
      done();
      return;
    }
    const n = stepIdx + 1;
    setStepIdx(n);
    goStep(n);
  };

  const prev = async () => {
    if (stepIdx <= 0) return;
    await hideBubble();
    const p = stepIdx - 1;
    setStepIdx(p);
    goStep(p);
  };

  const done = async () => {
    await hideBubble();
    Animated.timing(overlayOp, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setVisible(false));
    await markTourSeen();
    onTabPress?.("Home");
  };

  return {
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
  };
}
