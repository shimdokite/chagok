import { VisualCheckControls } from "../src/dev/VisualCheckControls";
import { useVisualCheckScroll } from "../src/dev/useVisualCheckScroll";
import { useState } from "react";
import { ScrollView, View, Text, Pressable } from "react-native";
import { Page, Header, Icon, styles } from "../src/components/ui";
import { BenefitBalanceCard } from "../src/components/BenefitBalanceCard";
import { BenefitCategoryList } from "../src/components/BenefitCategoryList";
import { RecentRequestList } from "../src/components/RecentRequestList";
import { ServerDiagnostics } from "../src/dev/ServerDiagnostics";
import { useTheme } from "../src/theme/tokens";
export default function Home() {
  const c = useTheme();
  const visual = useVisualCheckScroll();
  const [notice, setNotice] = useState("");
  return (
    <Page>
      <Header />
      <ScrollView
        ref={visual.ref}
        onLayout={visual.onLayout}
        onScroll={visual.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={styles.content}
      >
        <View>
          <Text style={{ color: c.secondary, fontSize: 14 }}>
            도연님, 안녕하세요.
          </Text>
          <Text
            style={{
              color: c.text,
              fontSize: 26,
              lineHeight: 36,
              fontWeight: "600",
              marginTop: 10,
            }}
          >
            나를 위한 복지,{"\n"}차곡차곡 누려요.
          </Text>
          <Text
            style={{
              alignSelf: "flex-start",
              backgroundColor: c.soft,
              color: c.accent,
              fontSize: 10,
              paddingVertical: 4,
              paddingHorizontal: 8,
              borderRadius: 6,
              marginTop: 12,
            }}
          >
            데모 데이터 · 2026년 11월
          </Text>
        </View>
        <BenefitBalanceCard />
        <BenefitCategoryList />
        <RecentRequestList />
        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={{ color: c.secondary, fontSize: 13 }}
          >
            {notice}
          </Text>
        ) : null}
        {__DEV__ ? <ServerDiagnostics /> : null}
      </ScrollView>
      <View
        style={{
          flexDirection: "row",
          borderTopWidth: 1,
          borderColor: c.line,
          backgroundColor: c.surface,
          paddingVertical: 10,
        }}
      >
        {[
          ["home", "홈"],
          ["list", "신청 내역"],
          ["info", "복지 안내"],
        ].map(([icon, label], i) => (
          <Pressable
            key={label}
            accessibilityRole="button"
            onPress={() =>
              setNotice(i === 0 ? "" : `${label} 기능은 준비 중이에요.`)
            }
            style={{ flex: 1, alignItems: "center", gap: 4, minHeight: 44 }}
          >
            <Icon name={icon} color={i === 0 ? c.accent : c.secondary} />
            <Text
              style={{
                fontSize: 10,
                color: i === 0 ? c.accent : c.secondary,
                width: "100%",
                paddingHorizontal: 4,
                textAlign: "center",
              }}
            >
              {label}
            </Text>
          </Pressable>
        ))}
      </View>
      <VisualCheckControls move={visual.move} />
    </Page>
  );
}
