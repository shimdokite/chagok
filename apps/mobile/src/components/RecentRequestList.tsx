import { View, Text, useWindowDimensions } from "react-native";
import { demo, won } from "../fixtures/demo-benefits";
import { useTheme } from "../theme/tokens";
import { Icon, styles } from "./ui";
export function RecentRequestList() {
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
        최근 신청
      </Text>
      {demo.requests.slice(0, 2).map((x) => (
        <View
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
              {x.category} · {x.date}
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
              {x.status === "SUBMITTED" ? "검토 중" : "승인 완료"}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}
