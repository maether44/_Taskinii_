import React from "react";
import { ScrollView, StyleProp, StyleSheet, ViewStyle } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../theme/tokens";

interface ScreenWrapperProps {
  children: React.ReactNode;
  /** When true, wraps content in a ScrollView */
  scrollable?: boolean;
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  /** Background colour — defaults to dark bg */
  bg?: string;
}

export default function ScreenWrapper({
  children,
  scrollable = false,
  style,
  contentStyle,
  bg = COLORS.dark.bg,
}: ScreenWrapperProps) {
  const inner = scrollable ? (
    <ScrollView
      contentContainerStyle={[s.scrollContent, contentStyle]}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <Animated.View style={[s.flex, contentStyle]}>{children}</Animated.View>
  );

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: bg }, style]}>
      <Animated.View entering={FadeInDown.duration(280).springify()} style={s.flex}>
        {inner}
      </Animated.View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1 },
});
