import { VisualCheckControls } from "../src/dev/VisualCheckControls";
import { useVisualCheckScroll } from "../src/dev/useVisualCheckScroll";
import { ScrollView, View, Text } from "react-native";
import { router } from "expo-router";
import { Page, Header, Icon, Button } from "../src/components/ui";
import { useTheme } from "../src/theme/tokens";
export default function Login() {
  const c = useTheme();
  const visual = useVisualCheckScroll();
  return (
    <Page>
      <Header />
      <ScrollView
        ref={visual.ref}
        onLayout={visual.onLayout}
        onScroll={visual.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{
          padding: 23,
          paddingTop: 32,
          flexGrow: 1,
          justifyContent: "space-between",
          gap: 40,
        }}
      >
        <View>
          <Text style={{ color: c.secondary, fontSize: 14 }}>
            일하는 당신의 일상에
          </Text>
          <Text
            style={{
              fontSize: 28,
              lineHeight: 41,
              color: c.text,
              fontWeight: "600",
              marginTop: 10,
            }}
          >
            작은 여유를{"\n"}차곡차곡.
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 23,
              color: c.secondary,
              marginTop: 25,
            }}
          >
            우리 회사 복지비를 확인하고{"\n"}영수증 한 장으로 간편하게
            신청하세요.
          </Text>
        </View>
        <View
          accessibilityElementsHidden
          style={{ paddingHorizontal: 40, gap: 10, paddingVertical: 10 }}
        >
          {[
            ["food", "든든한 점심"],
            ["book", "새로운 배움"],
            ["gym", "건강한 일상"],
          ].map(([icon, label], i) => (
            <View
              key={label}
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                padding: 16,
                borderRadius: 13,
                backgroundColor: i === 1 ? c.accent : c.soft,
                transform: [{ translateX: i === 0 ? 8 : i === 2 ? -8 : 0 }],
              }}
            >
              <Icon name={icon} color={i === 1 ? c.onAccent : c.accent} />
              <Text
                style={{ fontSize: 13, color: i === 1 ? c.onAccent : c.accent }}
              >
                {label}
              </Text>
            </View>
          ))}
        </View>
        <View style={{ gap: 12 }}>
          <Button title="G  Google로 계속하기" disabled secondary />
          <Text
            style={{ textAlign: "center", fontSize: 12, color: c.secondary }}
          >
            로그인 준비 중
          </Text>
          <Button
            title="데모로 둘러보기"
            secondary
            onPress={() => router.replace("/home")}
          />
          <Text
            style={{
              textAlign: "center",
              fontSize: 12,
              color: c.secondary,
              marginVertical: 16,
            }}
          >
            실제 로그인 없이 데모 데이터를 둘러보세요.
          </Text>
        </View>
      </ScrollView>
      <VisualCheckControls move={visual.move} />
    </Page>
  );
}
