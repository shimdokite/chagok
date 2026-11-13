import { View, Text } from "react-native";
import { useTheme } from "../theme/tokens";
import { Icon } from "./ui";
export function BenefitCategoryList() {
  const c = useTheme();
  return (
    <View style={{ gap: 15 }}>
      <Text style={{ color: c.text, fontSize: 15, fontWeight: "600" }}>
        이런 복지를 사용할 수 있어요
      </Text>
      <View style={{ flexDirection: "row", gap: 10 }}>
        {[
          ["food", "식비"],
          ["book", "도서비"],
          ["gym", "운동비"],
        ].map(([icon, label]) => (
          <View
            key={label}
            style={{
              flex: 1,
              alignItems: "center",
              paddingVertical: 17,
              gap: 12,
              borderRadius: 18,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.surface,
            }}
          >
            <Icon name={icon} />
            <Text style={{ color: c.text, fontSize: 12 }}>{label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
