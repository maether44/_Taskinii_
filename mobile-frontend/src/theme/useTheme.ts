import { useColorScheme } from 'react-native';
import { COLORS, SPACING, FONT_SIZE, RADIUS, TYPOGRAPHY } from './tokens';

export function useTheme() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const surface = isDark ? COLORS.dark : COLORS.light;

  return {
    isDark,
    colors: {
      ...surface,
      purple:      COLORS.purple,
      purpleLight: COLORS.purpleLight,
      purpleDark:  COLORS.purpleDark,
      lime:        COLORS.lime,
      limeDark:    COLORS.limeDark,
      protein:     COLORS.protein,
      carbs:       COLORS.carbs,
      fat:         COLORS.fat,
      success:     COLORS.success,
      warning:     COLORS.warning,
      error:       COLORS.error,
      info:        COLORS.info,
    },
    spacing:    SPACING,
    fontSize:   FONT_SIZE,
    radius:     RADIUS,
    typography: TYPOGRAPHY,
  };
}

export type Theme = ReturnType<typeof useTheme>;
