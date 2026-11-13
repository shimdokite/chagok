import type { PropsWithChildren } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { useTheme } from "../theme/tokens";
export function Icon({
  name,
  size = 22,
  color,
}: {
  name: string;
  size?: number;
  color?: string;
}) {
  const c = useTheme();
  const paths: Record<string, string> = {
    book: "M12 6c-3-3-7-3-9-2v15c3-1 6-1 9 2 3-3 6-3 9-2V4c-3-1-6-1-9 2Zm0 0v15",
    food: "M4 3v7m3-7v7m3-7v7M4 8h6m-3 2v11M19 3c-4 3-4 8 0 8m0-8v18",
    gym: "M3 8v8m4-11v14m10-14v14m4-11v8M7 12h10",
    home: "m3 10 9-7 9 7M5 9v12h5v-7h4v7h5V9",
    list: "M5 3h14v18H5ZM8 7h8M8 11h8M8 15h5",
    info: "m12 2 3 3 4 1 1 4 2 2-2 3-1 4-4 1-3 2-3-2-4-1-1-4-2-3 2-2 1-4 4-1Zm-4 10 3 3 5-6",
    leaf: "M4 4c8 4 14-2 15 9 0 7-12 9-15-9Zm1 3 15 14",
    building:
      "M5 21V3h11v18M16 9h4v12M8 6h1m3 0h1M8 10h1m3 0h1M8 14h1m3 0h1M9 21v-4h3v4",
    arrow: "M5 12h14m-5-5 5 5-5 5",
    back: "m15 5-7 7 7 7",
  };
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color ?? c.accent}
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d={paths[name] ?? paths.info} />
    </Svg>
  );
}
export function Brand() {
  const c = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 9 }}>
      <View style={{ gap: 3, alignItems: "center" }}>
        {[14, 21, 28].map((width, i) => (
          <View
            key={width}
            style={{
              width,
              height: 7,
              borderRadius: 2,
              backgroundColor: c.accent,
              opacity: 0.5 + i * 0.25,
            }}
          />
        ))}
      </View>
      <Text style={{ fontSize: 25, fontWeight: "600", color: c.text }}>
        차곡
      </Text>
    </View>
  );
}
export function Page({ children }: PropsWithChildren) {
  const c = useTheme();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.background }}>
      <View
        style={{ flex: 1, width: "100%", maxWidth: 520, alignSelf: "center" }}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}
export function Header() {
  const c = useTheme();
  return (
    <View style={styles.header}>
      <Brand />
      <View style={{ flexDirection: "row", gap: 5, alignItems: "center" }}>
        <Icon name="building" size={15} color={c.secondary} />
        <Text style={{ color: c.secondary, fontSize: 12 }}>그로브</Text>
      </View>
    </View>
  );
}
export function Button({
  title,
  onPress,
  disabled = false,
  secondary = false,
  style,
}: {
  title: string;
  onPress?: () => void;
  disabled?: boolean;
  secondary?: boolean;
  style?: ViewStyle;
}) {
  const c = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        {
          minHeight: 48,
          padding: 14,
          borderRadius: 13,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: secondary ? c.surface : c.accent,
          borderWidth: secondary ? 1 : 0,
          borderColor: c.line,
          opacity: disabled ? 0.5 : pressed ? 0.8 : 1,
        },
        style,
      ]}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "600",
          color: secondary ? c.text : c.onAccent,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 23,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  content: { padding: 23, paddingTop: 16, gap: 24 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
});
