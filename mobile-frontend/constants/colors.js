/**
 * constants/colors.js
 * Single source of truth for all BodyQ brand & UI colors.
 * Import this wherever you need color values — never hardcode hex strings.
 */

export const COLORS = {
  // ── Brand ──────────────────────────────────────────────────────────────────
  purple:      '#7C5CFC',
  purpleLight: '#9D85F5',
  purpleDark:  '#4A2FC8',
  purpleDeep:  '#2D1B8A',
  purpleAI:    '#7B61FF',   // Yara FAB / chat accent

  lime:        '#C8F135',
  limeDark:    '#B8F566',   // online dot, water fill

  // ── Backgrounds ────────────────────────────────────────────────────────────
  bg:          '#0F0B1E',   // root screen background
  card:        '#161230',   // solid card surface
  glass:       'rgba(22,18,48,0.82)',  // glassmorphism card
  sheet:       '#18152A',   // bottom-sheet / modal background
  inputBg:     '#0E0C15',   // text-input background
  msgYara:     '#201C35',   // Yara chat bubble

  // ── Borders / dividers ─────────────────────────────────────────────────────
  border:      '#1E1A35',   // card border, track background
  borderMid:   '#2D2850',   // sheet borders, dividers

  // ── Text ───────────────────────────────────────────────────────────────────
  text:        '#FFFFFF',
  textSoft:    '#F4F0FF',   // sheet headings
  textMuted:   '#E8E3FF',   // Yara bubble text
  sub:         '#6B5F8A',   // secondary / label text
  subMid:      '#8B82AD',   // placeholder, muted text
  subDark:     '#4A4268',   // timestamp, very muted

  // ── Macro colours ──────────────────────────────────────────────────────────
  protein:     '#FF6B35',
  carbs:       '#378ADD',
  fat:         '#EF9F27',

  // ── Semantic ───────────────────────────────────────────────────────────────
  success:     '#34C759',
  warning:     '#FF9500',
  error:       '#FF3B30',
  errorLight:  '#FF6B6B',
  info:        '#378ADD',
};
