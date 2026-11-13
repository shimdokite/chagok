import { View, Text } from "react-native";
import { router } from "expo-router";
import { demoBalance, won } from "../fixtures/demo-benefits";
import { useTheme } from "../theme/tokens";
import { Button, Icon, styles } from "./ui";
export function BenefitBalanceCard() {
  const c = useTheme();
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
          11월 사용 가능한 복지비
        </Text>
        <Icon name="leaf" size={18} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.4}
        style={{ fontSize: 36, color: c.text, fontWeight: "500" }}
      >
        {won(demoBalance.available)} <Text style={{ fontSize: 16 }}>원</Text>
      </Text>
      <View>
        <View
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100000, now: 35000 }}
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
              width: `${(demoBalance.used / demoBalance.total) * 100}%`,
              backgroundColor: c.accent,
              borderRadius: 4,
            }}
          />
        </View>
        <View style={[styles.row, { marginTop: 10, flexWrap: "wrap", gap: 4 }]}>
          <Text style={{ color: c.secondary, fontSize: 11 }}>
            신청·승인 {won(demoBalance.used)}원
          </Text>
          <Text style={{ color: c.text, fontSize: 11 }}>
            총 {won(demoBalance.total)}원
          </Text>
        </View>
      </View>
      <Button
        title="복지비 신청하기  ↗"
        onPress={() => router.push("/apply")}
      />
    </View>
  );
}
