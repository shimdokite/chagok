import { useState } from "react";
import { receiptMeasurements } from "../receipts/metrics-native";
import type { WebViewTrace } from "./webview-trace";

type TraceSnapshot = ReturnType<WebViewTrace["snapshot"]>;
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
  trace,
}: {
  ready: boolean;
  running: boolean;
  result: BenchmarkResult | null;
  run: () => void;
  reload: () => void;
  trace?: () => TraceSnapshot;
  probe?: { busy: boolean; report: object | null; run: () => void };
}) {
  const [traceSnapshot, setTraceSnapshot] = useState<TraceSnapshot | null>(
    null,
  );
  const [receipts, setReceipts] = useState<ReturnType<
    typeof receiptMeasurements
  > | null>(null);
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
          {trace ? (
            <>
              <Button
                title="웹뷰 이벤트 기록 보기"
                secondary
                onPress={() => setTraceSnapshot(trace())}
              />
              {traceSnapshot ? (
                <View style={{ gap: 4 }}>
                  <Text style={{ color: c.secondary, fontSize: 11 }}>
                    WVTRACE{" "}
                    {JSON.stringify({
                      startedAt: traceSnapshot.startedAt,
                      dropped: traceSnapshot.dropped,
                      hiddenInView: Math.max(
                        0,
                        traceSnapshot.events.length - 30,
                      ),
                    })}
                  </Text>
                  {traceSnapshot.events.slice(-30).map((event) => (
                    <Text
                      key={event.seq}
                      style={{ color: c.secondary, fontSize: 11 }}
                    >
                      WVTRACE {JSON.stringify(event)}
                    </Text>
                  ))}
                </View>
              ) : null}
            </>
          ) : null}
          <Button
            title="영수증 구간 측정 기록"
            secondary
            onPress={() => setReceipts(receiptMeasurements())}
          />
          {receipts ? (
            <>
              <Text style={{ color: c.secondary, fontSize: 11 }}>
                {receipts.runId} · {receipts.samples.length}건 · 대기{" "}
                {receipts.pending} · 초과 {receipts.dropped} · 저장 실패{" "}
                {String(receipts.saveFailed)}
              </Text>
              <Text style={{ color: c.secondary, fontSize: 11 }}>
                {JSON.stringify(receipts.samples.slice(-3))}
              </Text>
              <Button
                title="영수증 측정 JSON 공유"
                secondary
                onPress={() => {
                  void Share.share({
                    message: JSON.stringify(receipts, null, 2),
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
