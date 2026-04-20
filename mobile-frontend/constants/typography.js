/**
 * Shared font-size scale for the whole app.
 * Import this anywhere instead of hardcoding numbers.
 *
 * Usage:
 *   import { FS } from '../constants/typography';
 *   title: { fontSize: FS.screenTitle }
 */
export const FS = {
  // Screen-level headings  ("Food diary", "Training", "Settings")
  screenTitle: 30,

  // Hero/big numbers (calories eaten, ring values)
  hero: 42,

  // Section headings within a screen ("Meals", "Your Plan")
  sectionTitle: 22,

  // Card headings ("Calorie budget", "Today's meal game plan")
  cardTitle: 20,

  // Emphasized body / meal names / exercise names
  bodyLarge: 17,

  // Regular body text, descriptions, plan text
  body: 15,

  // Sub-labels beneath titles, hints, meta info
  sub: 13,

  // Tiny ALL-CAPS labels ("TODAY", "YARA", "YARA PLAN")
  label: 12,

  // Primary button text
  btnPrimary: 16,

  // Secondary / ghost button text
  btnSecondary: 14,

  // Badges, pills, macro mini-labels
  badge: 12,
};
