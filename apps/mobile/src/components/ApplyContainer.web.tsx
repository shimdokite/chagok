import { View, Text } from "react-native";
import { router } from "expo-router";
import { Page, Button } from "./ui";
import { useTheme } from "../theme/tokens";
import { webOrigin } from "../lib/trpc";
export default function ApplyContainer() {
  const c = useTheme();
  return (
    <Page>
      <View style={{ padding: 16, gap: 8 }}>
        <Button
          title="닫기 · 홈으로"
          secondary
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/home")
          }
        />
        <Text style={{ color: c.secondary, fontSize: 12 }}>
          브라우저 미리보기 · 네이티브 웹뷰·왕복 측정은 기기에서 확인하세요.
        </Text>
      </View>
      <iframe
        title="복지비 신청 미리보기"
        src={`${webOrigin}/apply`}
        style={{ border: 0, flex: 1, width: "100%", background: c.background }}
      />
    </Page>
  );
}
