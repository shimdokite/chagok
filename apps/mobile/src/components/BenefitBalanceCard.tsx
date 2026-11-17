import { View, Text } from "react-native";
import { router } from "expo-router";
import type { Amounts } from "@chagok/contracts/benefits";
import { won } from "../fixtures/demo-benefits";
import { useTheme } from "../theme/tokens";
import { Button, Icon, styles } from "./ui";

export function BenefitBalanceCard({
  amounts,
  month,
}: {
  amounts: Amounts;
  month: string;
}) {
  const c = useTheme();
  const used = amounts.submitted + amounts.approved;
  const progress =
    amounts.total > 0 ? Math.min(100, (used / amounts.total) * 100) : 0;
  return (
    <View
      style={{
        padding: 22,
        borderRadius: 20,
        backgroundColor: c.soft,
        gap: 16,
      }}
    >
      <View style={styles.row}>
        <Text style={{ color: c.text, fontSize: 12 }}>
          {Number(month.slice(5))}월 사용 가능한 복지비
        </Text>
        <Icon name="leaf" size={18} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.4}
        style={{ fontSize: 36, color: c.text, fontWeight: "500" }}
      >
        {won(amounts.available)} <Text style={{ fontSize: 16 }}>원</Text>
      </Text>
      <View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{
            min: 0,
            max: amounts.total,
            now: Math.min(used, amounts.total),
          }}
          style={{
            height: 5,
            borderRadius: 4,
            backgroundColor: c.line,
            overflow: "hidden",
          }}
        >
          <View
            style={{
              height: 5,
              width: `${progress}%`,
              backgroundColor: c.accent,
              borderRadius: 4,
            }}
          />
        </View>
        <View style={[styles.row, { marginTop: 10, flexWrap: "wrap", gap: 4 }]}>
          <Text style={{ color: c.secondary, fontSize: 11 }}>
            검토 중 {won(amounts.submitted)}원 · 승인 {won(amounts.approved)}원
          </Text>
          <Text style={{ color: c.text, fontSize: 11 }}>
            총 {won(amounts.total)}원
          </Text>
        </View>
      </View>
      <Button
        title="신청 화면 미리보기  ↗"
        onPress={() => router.push("/apply")}
      />
    </View>
  );
}
