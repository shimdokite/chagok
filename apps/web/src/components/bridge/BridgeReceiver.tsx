"use client";
import { useEffect, useState } from "react";
import { bridgeBase, parseBridgeMessage } from "@chagok/contracts";
declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (data: string) => void };
    __CHAGOK_BRIDGE__?: { receive: (value: unknown) => void };
  }
}
export function BridgeReceiver() {
  const [native, setNative] = useState(false);
  useEffect(() => {
    const host = window.ReactNativeWebView;
    if (!host) return;
    setNative(true);
    const receiver = {
      receive(value: unknown) {
        const parsed = parseBridgeMessage(value);
        if (!parsed.success) {
          if (process.env.NODE_ENV === "development")
            console.debug("[bridge] invalid-message");
          return;
        }
        if (parsed.data.type === "PING")
          host.postMessage(
            JSON.stringify({
              ...bridgeBase,
              type: "PONG",
              requestId: parsed.data.requestId,
            }),
          );
      },
    };
    window.__CHAGOK_BRIDGE__ = receiver;
    host.postMessage(JSON.stringify({ ...bridgeBase, type: "WEB_READY" }));
    const cleanup = () => {
      if (window.__CHAGOK_BRIDGE__ === receiver)
        delete window.__CHAGOK_BRIDGE__;
    };
    window.addEventListener("pagehide", cleanup);
    return () => {
      window.removeEventListener("pagehide", cleanup);
      cleanup();
    };
  }, []);
  return (
    <>
      {native ? (
        <button
          className="back"
          onClick={() =>
            window.ReactNativeWebView?.postMessage(
              JSON.stringify({ ...bridgeBase, type: "CLOSE_WEBVIEW" }),
            )
          }
          aria-label="신청 화면 닫기"
        >
          ‹
        </button>
      ) : null}
      <span className="bridge-note">
        {native
          ? "신청 기능을 준비하고 있어요."
          : "앱에서 이용할 수 있어요. 신청 기능은 준비 중이에요."}
      </span>
    </>
  );
}
