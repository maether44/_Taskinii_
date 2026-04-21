import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@bodyq_theme';

// ─── Colour tokens ─────────────────────────────────────────────────────────────
// Every key used by any screen is defined here.
// Screens swap `const C = { hardcoded }` → `const { colors: C } = useTheme()`.
export const darkTheme = {
  // Backgrounds
  bg:          '#0F0B1E',
  surface:     '#161230',
  card:        '#161230',
  cardAlt:     '#1B1637',
  inputBg:     '#0E0C15',
  // Borders
  border:      '#1E1A35',
  borderMid:   '#2D2850',
  // Text
  text:        '#FFFFFF',
  textSoft:    '#F4F0FF',
  sub:         '#6B5F8A',
  subMid:      '#8B82AD',
  dim:         '#6B5F8A',
  // Brand
  purple:      '#7C5CFC',
  purpleD:     '#4A2FC8',
  purpleLight: '#9D85F5',
  accent:      '#9D85F5',
  lime:        '#C8F135',
  // Semantic
  blue:        '#56B8FF',
  green:       '#34C759',
  orange:      '#FF9500',
  red:         '#FF3B30',
  // Tab bar
  tabBar:      '#0F0B1E',
  tabBorder:   '#1E1A35',
  tabActive:   '#C8F135',
  tabInactive: '#6B5F8A',
  // Alexi speech bubble
  bubble:      'rgba(15,11,30,0.97)',
  bubbleBorder:'rgba(198,241,53,0.22)',
  bubbleText:  '#E8E3FF',
  // Status bar
  statusBar:   'light',
};

export const lightTheme = {
  // Backgrounds
  bg:          '#F8F9FA',
  surface:     '#FFFFFF',
  card:        '#FFFFFF',
  cardAlt:     '#F0EDF8',
  inputBg:     '#F0EDF8',
  // Borders
  border:      '#E5E1F8',
  borderMid:   '#D0C9F0',
  // Text
  text:        '#1A1A1A',
  textSoft:    '#2D2060',
  sub:         '#6B5F8A',
  subMid:      '#8B82AD',
  dim:         '#8B82AD',
  // Brand (keep BodyQ identity)
  purple:      '#7C5CFC',
  purpleD:     '#5B3FE0',
  purpleLight: '#9D85F5',
  accent:      '#9D85F5',
  lime:        '#C6FF33',
  // Semantic
  blue:        '#378ADD',
  green:       '#2ECC71',
  orange:      '#F5A623',
  red:         '#FF3B30',
  // Tab bar
  tabBar:      '#FFFFFF',
  tabBorder:   '#E5E1F8',
  tabActive:   '#7C5CFC',
  tabInactive: '#8B82AD',
  // Alexi speech bubble
  bubble:      'rgba(255,255,255,0.97)',
  bubbleBorder:'rgba(124,92,252,0.25)',
  bubbleText:  '#1A1A1A',
  // Status bar
  statusBar:   'dark',
};

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(true);
  const [ready,  setReady]  = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then(val => { if (val !== null) setIsDark(val === 'dark'); })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark(prev => {
      const next = !prev;
      AsyncStorage.setItem(THEME_KEY, next ? 'dark' : 'light').catch(() => {});
      return next;
    });
  }, []);

  if (!ready) return null;

  const colors = isDark ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider>');
  return ctx;
}
