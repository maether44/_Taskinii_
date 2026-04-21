import { StyleSheet } from "react-native";

// ─── Brand / Base ───────────────────────────────────────────────────────────
export const COLORS = {
  // Core brand
  purple: "#7C5CFC",
  purpleLight: "#9D85F5",
  purpleDark: "#5A3ED9",
  lime: "#C8F135",
  limeDark: "#A8D010",

  // Macro colours
  protein: "#FF6B35",
  carbs: "#378ADD",
  fat: "#EF9F27",

  // Semantic
  success: "#34C759",
  warning: "#FF9500",
  error: "#FF3B30",
  info: "#0A84FF",

  // Dark surface (default — app is dark-first)
  dark: {
    bg: "#0F0B1E",
    card: "#161230",
    cardAlt: "#1C1840",
    border: "#1E1A35",
    text: "#FFFFFF",
    subtext: "#6B5F8A",
    muted: "#3A3460",
    overlay: "rgba(0,0,0,0.6)",
  },

  // Light surface (used when colorScheme === 'light')
  light: {
    bg: "#F4F2FF",
    card: "#FFFFFF",
    cardAlt: "#EDE9FF",
    border: "#DDD8F5",
    text: "#0F0B1E",
    subtext: "#5A4E80",
    muted: "#C5BEE8",
    overlay: "rgba(0,0,0,0.25)",
  },
} as const;

// ─── Spacing ────────────────────────────────────────────────────────────────
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ─── Font Sizes ─────────────────────────────────────────────────────────────
export const FONT_SIZE = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 22,
  xxl: 28,
  hero: 36,
} as const;

// ─── Border Radius ──────────────────────────────────────────────────────────
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 999,
} as const;

// ─── Typography ─────────────────────────────────────────────────────────────
export const TYPOGRAPHY = StyleSheet.create({
  heading: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: "800",
    letterSpacing: -0.5,
    lineHeight: 34,
  },
  subheading: {
    fontSize: FONT_SIZE.xl,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 28,
  },
  body: {
    fontSize: FONT_SIZE.md,
    fontWeight: "400",
    lineHeight: 22,
  },
  caption: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "500",
    letterSpacing: 0.3,
    lineHeight: 16,
  },
  label: {
    fontSize: FONT_SIZE.xs,
    fontWeight: "800",
    letterSpacing: 1.2,
    lineHeight: 14,
  },
});
