/**
 * constants/appTheme.js
 * Shared design tokens used across BodyQ screens.
 * Aligned with the dark purple palette used in Training.js / Nutrition.js.
 */

// ── Colors ────────────────────────────────────────────────────
export const Colors = {
  // Base
  bg: "#0F0B1E",
  card: "#161230",
  border: "#1E1A35",

  // Text
  text: "#FFFFFF",
  textSub: "#6B5F8A",
  textLabel: "rgba(255,255,255,0.45)",

  // Accents
  purple: "#7C5CFC",
  lime: "#C8F135",
  accent: "#9D85F5",

  // Semantic
  green: "#4CAF50",
  greenDark: "#2E7D32",
  greenLight: "rgba(76,175,80,0.12)", // faint green tint for badges/backgrounds
  sleep: "#7C9EFC", // soft blue for sleep contexts
  steps: "#00BCD4", // cyan for step/activity contexts
  warning: "#FF9500",
  error: "#FF4D4D",
  coral: "#FF6B6B", // soft red for negative deltas / nutrition tags
  info: "#4FC3F7", // light blue for info/prediction tags

  // Surface
  bgAlt: "#1A1535", // slightly lighter than bg, used for chart bars
  separator: "#1E1A35", // same as border, used for heatmap empty cells
};

// ── Spacing ───────────────────────────────────────────────────
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  screenH: 20, // horizontal page padding
  screenV: 60, // top padding to clear status bar
};

// ── Border Radius ─────────────────────────────────────────────
export const Radius = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 100,
};

// ── Font Sizes ────────────────────────────────────────────────
export const FontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 20,
  h2: 26,
  h1: 32,
};

// ── Font Weights ──────────────────────────────────────────────
export const FontWeight = {
  regular: "400",
  semibold: "600",
  bold: "700",
  heavy: "800",
  black: "900",
};

// ── Shadows ───────────────────────────────────────────────────
export const Shadow = {
  xs: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  sm: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  green: {
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  lime: {
    shadowColor: "#C8F135",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
};

// ── Card Base Style ───────────────────────────────────────────
export const CardStyle = {
  backgroundColor: "#161230",
  borderRadius: Radius.md,
  padding: Spacing.md,
  borderWidth: 1,
  borderColor: "#1E1A35",
  ...Shadow.xs,
};
