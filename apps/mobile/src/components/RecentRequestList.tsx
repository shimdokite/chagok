import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { statusLabels, type ClaimItem } from "@chagok/contracts/benefits";
import { won } from "../fixtures/demo-benefits";
import { useTheme } from "../theme/tokens";
import { Icon, styles } from "./ui";

export function RecentRequestList({
  items,
  title = "최근 신청",
}: {
  items: ClaimItem[];
  title?: string;
}) {
  const c = useTheme();
  const { fontScale } = useWindowDimensions();
  const stacked = fontScale > 1.5;
  return (
    <View>
      <Text
        style={{
          color: c.text,
          fontSize: 16,
          fontWeight: "600",
          marginBottom: 12,
        }}
      >
        {title}
      </Text>
      {items.length === 0 ? (
        <Text style={{ color: c.secondary }}>신청 내역이 없어요.</Text>
      ) : null}
      {items.map((x) => (
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/requests/[id]", params: { id: x.id } })
          }
          key={x.id}
          style={{
            flexDirection: stacked ? "column" : "row",
            alignItems: stacked ? "flex-start" : "center",
            gap: 12,
            paddingVertical: 16,
            borderBottomWidth: 1,
            borderColor: c.line,
          }}
        >
          <View
            style={{
              padding: 11,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: c.line,
              backgroundColor: c.surface,
            }}
          >
            <Icon
              name={x.category === "도서비" ? "book" : "food"}
              color={c.secondary}
            />
          </View>
          <View
            style={{
              flex: stacked ? undefined : 1,
              alignSelf: stacked ? "stretch" : undefined,
              gap: 6,
            }}
          >
            <Text style={{ color: c.text, fontSize: 13 }}>{x.title}</Text>
            <Text style={{ color: c.secondary, fontSize: 11 }}>
              {x.category} · {x.usedOn}
            </Text>
          </View>
          <View
            style={{ alignItems: stacked ? "flex-start" : "flex-end", gap: 8 }}
          >
            <Text style={{ color: c.text, fontSize: 13 }}>
              {won(x.amount)}원
            </Text>
            <Text
              style={{
                fontSize: 10,
                paddingVertical: 5,
                paddingHorizontal: 10,
                borderRadius: 7,
                color: x.status === "SUBMITTED" ? c.warning : c.accent,
                backgroundColor:
                  x.status === "SUBMITTED" ? c.warningBg : c.soft,
              }}
            >
              {statusLabels[x.status]}
            </Text>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
