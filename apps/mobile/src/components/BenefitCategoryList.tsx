import { View, Text, useWindowDimensions } from "react-native";
import { useTheme } from "../theme/tokens";
import { Icon } from "./ui";

const categoryIcon: Record<string, string> = {
  식비: "food",
  도서비: "book",
  운동비: "gym",
};

export function BenefitCategoryList({
  categories,
}: {
  categories: readonly string[];
}) {
  const c = useTheme();
  const { fontScale } = useWindowDimensions();
  return (
    <View style={{ gap: 15 }}>
      <Text style={{ color: c.text, fontSize: 15, fontWeight: "600" }}>
        이런 복지를 사용할 수 있어요
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
        {categories.map((label) => (
          <View
            key={label}
            style={{
              flexBasis: 96 * fontScale,
              flexGrow: 1,
              flexShrink: 1,
              alignItems: "center",
              paddingVertical: 17,
              paddingHorizontal: 12,
              gap: 12,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.surface,
            }}
          >
            <Icon name={categoryIcon[label] ?? "info"} />
            <Text style={{ color: c.text, fontSize: 12, textAlign: "center" }}>
              {label}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}
