import { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, ActivityIndicator, BackHandler } from "react-native";
import { WebView } from "react-native-webview";
import { router } from "expo-router";
import { isAllowedApplyUrl } from "@chagok/contracts";
import { useWebViewBridge } from "../bridge/useWebViewBridge";
import { webOrigin } from "../lib/trpc";
import { Page, Button } from "./ui";
import { BridgeDiagnostics } from "../dev/BridgeDiagnostics";
import { VisualCheckControls } from "../dev/VisualCheckControls";
import { useBoundaryProbe } from "../dev/useBoundaryProbe";
import { useTheme } from "../theme/tokens";
export default function ApplyContainer() {
  const c = useTheme();
  const ref = useRef<WebView<object>>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const back = useCallback(
    () => (router.canGoBack() ? router.back() : router.replace("/home")),
    [],
  );
  const bridge = useWebViewBridge(ref, back);
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
    back();
  }, [bridge.reset, back]);
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
    const timer = setTimeout(() => {
      bridge.reset("ready-timeout");
      setError(true);
      setLoading(false);
    }, 15000);
    return () => clearTimeout(timer);
  }, [bridge.ready, error, revision, bridge.reset]);
  const fail = () => {
    bridge.reset("load-error");
    setError(true);
    setLoading(false);
  };
  const reload = () => {
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
              probe.observe("navigation", { url: request.url, allowed });
              return allowed;
            }}
            onOpenWindow={(event) => {
              probe.observe("new-window-blocked", {
                url: event.nativeEvent.targetUrl,
              });
            }}
            onNavigationStateChange={(state) => {
              if (!isAllowedApplyUrl(state.url, webOrigin)) {
                ref.current?.stopLoading();
                fail();
              }
            }}
            onLoadStart={() => {
              bridge.reset("reload");
              setLoading(true);
            }}
            onLoadEnd={() => setLoading(false)}
            onError={fail}
            onHttpError={fail}
            onContentProcessDidTerminate={fail}
            onRenderProcessGone={fail}
            onMessage={(event) => {
              const { data, url } = event.nativeEvent;
              const decision = bridge.receive(data, url);
              probe.observe("message", { data, url, decision });
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
      <BridgeDiagnostics {...bridge} reload={reload} probe={probe} />
    </Page>
  );
}
