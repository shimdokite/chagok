import { useState } from "react";
import { View, Text, Share, ScrollView } from "react-native";
import { Button } from "../components/ui";
import { useTheme } from "../theme/tokens";
import type { BenchmarkResult } from "../metrics/bridge-benchmark";
export function BridgeDiagnostics({
  ready,
  running,
  result,
  run,
  reload,
  probe,
}: {
  ready: boolean;
  running: boolean;
  result: BenchmarkResult | null;
  run: () => void;
  reload: () => void;
  probe?: { busy: boolean; report: object | null; run: () => void };
}) {
  const [open, setOpen] = useState(false);
  const [exportError, setExportError] = useState("");
  const c = useTheme();
  if (!__DEV__) return null;
  return (
    <ScrollView
      style={{ maxHeight: "45%", flexGrow: 0 }}
      contentContainerStyle={{
        paddingHorizontal: 16,
        paddingBottom: 8,
        gap: 8,
      }}
    >
      <Button
        title={open ? "개발 도구 접기" : "개발 도구"}
        secondary
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <>
          <Text style={{ color: c.secondary, fontSize: 12 }}>
            {ready ? "WEB_READY 수신" : "웹 준비 대기"} ·{" "}
            {running ? "측정 중" : "대기"}
          </Text>
          <Button
            title="준비 3회 + 왕복 20회 측정"
            disabled={!ready || running || probe?.busy}
            onPress={run}
          />
          <Button
            title="웹뷰 다시 로드"
            secondary
            onPress={reload}
            disabled={probe?.busy}
          />
          {probe ? (
            <>
              <Button
                title={probe.busy ? "M08 검증 중…" : "M08 경계 검증"}
                secondary
                disabled={!ready || running || probe.busy}
                onPress={probe.run}
              />
              {probe.report ? (
                <Button
                  title="M08 원본 JSON 공유"
                  secondary
                  onPress={() => {
                    void Share.share({
                      message: JSON.stringify(probe.report, null, 2),
                    }).catch(() =>
                      setExportError("공유하지 못했어요. 다시 시도하세요."),
                    );
                  }}
                />
              ) : null}
            </>
          ) : null}
          {result ? (
            <>
              <Text style={{ color: c.secondary, fontSize: 11 }}>
                {result.status} · {result.reason ?? "정상 종료"} ·{" "}
                {JSON.stringify(result.summary)}
              </Text>
              <Button
                title="측정 원본 JSON 공유"
                secondary
                onPress={() => {
                  void Share.share({
                    message: JSON.stringify(result, null, 2),
                    title: "차곡 브릿지 측정",
                  }).catch(() =>
                    setExportError("공유하지 못했어요. 다시 시도하세요."),
                  );
                }}
              />
            </>
          ) : null}
          {exportError ? (
            <Text style={{ color: c.secondary }}>{exportError}</Text>
          ) : null}
        </>
      ) : null}
    </ScrollView>
  );
}
