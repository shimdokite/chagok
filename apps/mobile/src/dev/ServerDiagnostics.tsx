import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { View, Text, Share } from "react-native";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui";
import { useTheme } from "../theme/tokens";
import {
  getBenchmarkHistory,
  subscribeBenchmarkHistory,
} from "../metrics/benchmark-history";
export function ServerDiagnostics() {
  const c = useTheme();
  const history = useSyncExternalStore(
    subscribeBenchmarkHistory,
    getBenchmarkHistory,
    getBenchmarkHistory,
  );
  const [open, setOpen] = useState(false);
  const [state, setState] = useState("미확인");
  const [busy, setBusy] = useState(false);
  const abort = useRef<AbortController | null>(null);
  useEffect(() => () => abort.current?.abort(), []);
  const check = async () => {
    if (abort.current) return;
    const controller = new AbortController();
    abort.current = controller;
    setBusy(true);
    setState("연결 확인 중…");
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const result = await trpc.health.check.query(undefined, {
        signal: controller.signal,
      });
      setState(`${result.service}: ${result.status}`);
    } catch {
      setState(
        "서버에 연결할 수 없어요. 서버와 주소를 확인하고 다시 시도하세요.",
      );
    } finally {
      clearTimeout(timer);
      abort.current = null;
      setBusy(false);
    }
  };
  if (!__DEV__) return null;
  return (
    <View style={{ gap: 8 }}>
      <Button
        title={open ? "개발 도구 접기" : "개발 도구"}
        secondary
        onPress={() => setOpen(!open)}
      />
      {open ? (
        <>
          <Text style={{ color: c.secondary, fontSize: 12 }}>{state}</Text>
          {history.length > 0 ? (
            <>
              <Text style={{ color: c.secondary, fontSize: 12 }}>
                보관된 측정 {history.length}건 · 최근 상태:{" "}
                {history.at(-1)?.status} (
                {history.at(-1)?.reason ?? "정상 종료"})
              </Text>
              <Button
                title="닫힌 세션 포함 원본 JSON 공유"
                secondary
                onPress={() => {
                  void Share.share({
                    message: JSON.stringify(history, null, 2),
                  }).catch(() =>
                    setState("공유하지 못했어요. 다시 시도하세요."),
                  );
                }}
              />
            </>
          ) : null}
          <Button
            title="서버 연결 확인 / 다시 시도"
            disabled={busy}
            onPress={check}
          />
        </>
      ) : null}
    </View>
  );
}
