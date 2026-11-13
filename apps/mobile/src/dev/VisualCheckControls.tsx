import { Pressable, Text, View } from "react-native";

// Local opt-in only. Test controls intentionally keep their own font small so
// they do not obscure the product UI being tested with Dynamic Type.
export function VisualCheckControls({
  move,
}: {
  move: (direction: "top" | "next" | "end") => void;
}) {
  if (!__DEV__ || process.env.EXPO_PUBLIC_VISUAL_CHECKS !== "1") return null;
  return (
    <View
      style={{
        flexDirection: "row",
        backgroundColor: "#e5e5e5",
        padding: 4,
        gap: 4,
      }}
    >
      {(
        [
          ["top", "검증: 맨 위"],
          ["next", "검증: 다음 영역"],
          ["end", "검증: 맨 아래"],
        ] as const
      ).map(([direction, label]) => (
        <Pressable
          key={direction}
          accessibilityRole="button"
          onPress={() => move(direction)}
          style={{ flex: 1, minHeight: 32, justifyContent: "center" }}
        >
          <Text
            allowFontScaling={false}
            style={{ fontSize: 11, color: "#202020", textAlign: "center" }}
          >
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
