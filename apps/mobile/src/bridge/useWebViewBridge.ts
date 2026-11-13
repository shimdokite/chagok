import { useEffect, useRef, useState, useCallback } from "react";
import { Platform } from "react-native";
import type { WebView } from "react-native-webview";
import {
  injectionFor,
  isAllowedApplyUrl,
  parseBridgeMessage,
} from "@chagok/contracts";
import {
  BridgeBenchmark,
  type BenchmarkResult,
} from "../metrics/bridge-benchmark";
import { runRecordedBenchmark } from "../metrics/benchmark-history";
import { webOrigin } from "../lib/trpc";
export function useWebViewBridge(
  webview: React.RefObject<WebView<object> | null>,
  onClose: () => void,
) {
  const [ready, setReady] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<BenchmarkResult | null>(null);
  const mounted = useRef(true);
  const engine = useRef<BridgeBenchmark | null>(null);
  if (!engine.current)
    engine.current = new BridgeBenchmark(
      (message) => {
        if (!webview.current) throw new Error("unavailable");
        webview.current.injectJavaScript(injectionFor(message));
      },
      {
        device:
          process.env.EXPO_PUBLIC_BENCHMARK_DEVICE ??
          `${Platform.OS} — 모델 미지정`,
        OS: `${Platform.OS} ${Platform.Version}`,
        appBuild:
          process.env.EXPO_PUBLIC_BENCHMARK_APP_BUILD ??
          (__DEV__ ? "development 0.1.0" : "release 0.1.0"),
        webBuildMode: process.env.EXPO_PUBLIC_BENCHMARK_WEB_MODE ?? "미지정",
        sourceRef:
          process.env.EXPO_PUBLIC_BENCHMARK_SOURCE_REF ?? "day-01 working-tree",
      },
    );
  const reset = useCallback((reason: string) => {
    engine.current!.reset(reason);
    setReady(false);
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      engine.current!.reset("unmount");
    };
  }, []);
  const receive = (data: string, url: string) => {
    if (!isAllowedApplyUrl(url, webOrigin)) return "rejected-origin";
    const parsed = parseBridgeMessage(data);
    if (!parsed.success) {
      if (__DEV__) console.debug("[bridge] invalid-message");
      return "rejected-schema";
    }
    if (parsed.data.type === "CLOSE_WEBVIEW") {
      reset("close");
      onClose();
      return "closed";
    }
    engine.current!.receive(parsed.data);
    setReady(engine.current!.ready);
    return "accepted";
  };
  const run = async () => {
    if (engine.current!.running || !engine.current!.ready) return;
    setRunning(true);
    try {
      const next = await runRecordedBenchmark(engine.current!, {
        count: 20,
        intervalMs: 100,
        timeoutMs: 3000,
      });
      if (mounted.current) setResult(next);
    } finally {
      if (mounted.current) setRunning(false);
    }
  };
  return { ready, running, result, receive, reset, run };
}
