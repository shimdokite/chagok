import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import {
  View,
  Text,
  ActivityIndicator,
  BackHandler,
  AppState,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";
import { router } from "expo-router";
import { isAllowedApplyUrl, parseBridgeMessage } from "@chagok/contracts";
import { useClaimHost } from "../bridge/useClaimHost";
import { useWebViewBridge } from "../bridge/useWebViewBridge";
import { applyMessageUrl } from "../bridge/message-source";
import { webOrigin } from "../lib/trpc";
import { Page, Button } from "./ui";
import { BridgeDiagnostics } from "../dev/BridgeDiagnostics";
import { VisualCheckControls } from "../dev/VisualCheckControls";
import { useBoundaryProbe } from "../dev/useBoundaryProbe";
import { useTheme } from "../theme/tokens";
import { WebViewTrace, type WebViewEventKind } from "../dev/webview-trace";

export default function ApplyContainer() {
  const c = useTheme();
  const ref = useRef<WebView<object>>(null);
  const documentUrl = useRef<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const committedRevision = useRef(revision);
  useLayoutEffect(() => {
    committedRevision.current = revision;
  }, [revision]);
  const trace = useRef<WebViewTrace | null>(null);
  if (!trace.current) trace.current = new WebViewTrace(__DEV__);

  const record = useCallback(
    (kind: WebViewEventKind, rev: number, detail = {}) =>
      trace.current!.record(kind, rev, detail),
    [],
  );

  useEffect(() => {
    record("mount", 0);
    return () => record("unmount", committedRevision.current);
  }, [record]);
  useEffect(() => {
    if (!__DEV__) return;
    const subscription = AppState.addEventListener("change", (state) =>
      record(state === "active" ? "app-active" : "app-background", revision),
    );
    return () => subscription.remove();
  }, [record, revision]);

  const closeAndGoBack = useCallback(() => {
    documentUrl.current = null;
    record("close", committedRevision.current);
    return router.canGoBack() ? router.back() : router.replace("/home");
  }, [record]);

  const claimHost = useClaimHost(ref);
  const baseBridge = useWebViewBridge(ref, closeAndGoBack);

  const reset = useCallback(
    (reason: string) => {
      documentUrl.current = null;
      claimHost.reset();
      baseBridge.reset(reason);
    },
    [claimHost, baseBridge.reset],
  );

  const bridge = { ...baseBridge, reset };
  const probe = useBoundaryProbe(
    (script) => ref.current?.injectJavaScript(script),
    () => ({
      ready: bridge.ready,
      running: bridge.running,
      result: bridge.result,
      error,
    }),
  );

  const close = useCallback(() => {
    bridge.reset("close");
    closeAndGoBack();
  }, [bridge.reset, closeAndGoBack]);

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        close();
        return true;
      },
    );
    return () => subscription.remove();
  }, [close]);
  useEffect(() => {
    if (bridge.ready || error) return;
    record("timer-armed", revision);
    const timer = setTimeout(() => {
      record("ready-timeout", revision);
      bridge.reset("ready-timeout");
      setError(true);
      setLoading(false);
    }, 15000);
    return () => {
      clearTimeout(timer);
      record("timer-cleared", revision);
    };
  }, [bridge.ready, error, revision, bridge.reset, record]);

  const fail = (kind: WebViewEventKind, detail = {}) => {
    record(kind, revision, detail);
    bridge.reset("load-error");
    setError(true);
    setLoading(false);
  };

  const reload = () => {
    record("reload", revision);
    bridge.reset("reload");
    setError(false);
    setLoading(true);
    setRevision((x) => x + 1);
  };

  return (
    <Page>
      <View style={{ paddingHorizontal: 23, paddingVertical: 10 }}>
        <Button title="닫기 · 홈으로" secondary onPress={close} />
      </View>
      <View style={{ flex: 1 }}>
        {error ? (
          <View style={{ padding: 23, gap: 16 }}>
            <Text style={{ color: c.text, fontSize: 17 }}>
              신청 화면을 불러오지 못했어요.
            </Text>
            <Text style={{ color: c.secondary }}>
              서버와 네트워크 연결을 확인해 주세요.
            </Text>
            <Button title="다시 시도" onPress={reload} />
          </View>
        ) : (
          <WebView<object>
            key={revision}
            ref={ref}
            source={{ uri: `${webOrigin}/apply` }}
            style={{ backgroundColor: c.background }}
            // Keep every URL inside this decision callback. A narrow WebView
            // whitelist can forward unmatched URLs to the OS browser instead.
            originWhitelist={["*"]}
            onShouldStartLoadWithRequest={(request) => {
              const allowed = isAllowedApplyUrl(request.url, webOrigin);
              record(
                allowed ? "navigation-allowed" : "navigation-blocked",
                revision,
              );
              probe.observe("navigation", { url: request.url, allowed });
              return allowed;
            }}
            onOpenWindow={(event) => {
              probe.observe("new-window-blocked", {
                url: event.nativeEvent.targetUrl,
              });
            }}
            onNavigationStateChange={(state) => {
              if (revision !== committedRevision.current) return;
              if (!isAllowedApplyUrl(state.url, webOrigin)) {
                ref.current?.stopLoading();
                fail("navigation-blocked");
              }
            }}
            onLoadStart={(event) => {
              if (revision !== committedRevision.current) return;
              record("load-start", revision, { ready: bridge.ready });
              bridge.reset("reload");
              if (!isAllowedApplyUrl(event.nativeEvent.url, webOrigin)) {
                ref.current?.stopLoading();
                fail("navigation-blocked");
                return;
              }
              documentUrl.current = event.nativeEvent.url;
              setLoading(true);
            }}
            onLoadEnd={() => {
              record("load-end", revision);
              setLoading(false);
            }}
            onError={(event) =>
              fail("load-error", { code: event.nativeEvent.code })
            }
            onHttpError={(event) =>
              fail("http-error", { status: event.nativeEvent.statusCode })
            }
            onContentProcessDidTerminate={() =>
              fail("content-process-terminated")
            }
            onRenderProcessGone={() => fail("render-process-gone")}
            onMessage={(event) => {
              const { data, url } = event.nativeEvent;
              if (revision !== committedRevision.current) return;
              const source = applyMessageUrl(
                url,
                documentUrl.current,
                webOrigin,
                Platform.OS,
              );
              const decision = source
                ? bridge.receive(data, source)
                : "rejected-origin";
              if (decision === "closed") claimHost.reset();
              if (decision === "accepted" && source)
                void claimHost.receive(data, source);
              if (__DEV__) {
                const parsed = parseBridgeMessage(data);
                if (
                  decision === "accepted" &&
                  parsed.success &&
                  parsed.data.type === "WEB_READY"
                )
                  record("ready", revision);
                else if (decision.startsWith("rejected"))
                  record("message-rejected", revision);
              }
              probe.observe("message", { url, decision });
            }}
            javaScriptEnabled
            allowFileAccess={false}
            mixedContentMode="never"
            setSupportMultipleWindows
          />
        )}
        {loading && !error ? (
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              top: 16,
              left: 0,
              right: 0,
              alignItems: "center",
              gap: 8,
            }}
          >
            <ActivityIndicator color={c.accent} />
            <Text style={{ color: c.secondary }}>화면을 불러오고 있어요.</Text>
          </View>
        ) : null}
      </View>
      <VisualCheckControls
        move={(direction) =>
          ref.current?.injectJavaScript(
            direction === "top"
              ? "window.scrollTo(0,0); true;"
              : direction === "end"
                ? "window.scrollTo(0,document.body.scrollHeight); true;"
                : "window.scrollBy(0,innerHeight * 0.65); true;",
          )
        }
      />
      <BridgeDiagnostics
        {...bridge}
        reload={reload}
        probe={probe}
        trace={() => trace.current!.snapshot()}
      />
    </Page>
  );
}
