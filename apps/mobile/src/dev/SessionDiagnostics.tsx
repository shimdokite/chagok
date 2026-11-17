import { useState } from "react";
import { Share, Text, View } from "react-native";
import { Button } from "../components/ui";
import { restoreMetrics } from "../auth/metrics";
import { useTheme } from "../theme/tokens";

export function SessionDiagnostics() {
  const c = useTheme();
  const [message, setMessage] = useState("");
  return (
    <View style={{ gap: 8 }}>
      <Button
        secondary
        title="세션 복원 원본 공유"
        onPress={async () => {
          try {
            const data = await restoreMetrics();
            await Share.share({ message: JSON.stringify(data, null, 2) });
            setMessage(
              `${data.samples.length}회 · 저장 오류 ${data.saveFailed ? "있음" : "없음"}`,
            );
          } catch {
            setMessage("원본을 공유하지 못했어요.");
          }
        }}
      />
      <Text style={{ color: c.secondary, fontSize: 12 }}>{message}</Text>
    </View>
  );
}
