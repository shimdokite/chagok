"use client";
import { useEffect } from "react";
import { requestId } from "../apply/request-id";
import { bridgeBase } from "@chagok/contracts";
import type { FormClient } from "../apply/form-client";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage: (data: string) => void };
    __CHAGOK_BRIDGE__?: { receive: (value: unknown) => void };
  }
}

export function BridgeReceiver({ client }: { client: FormClient }) {
  useEffect(() => {
    const receiver = { receive: (value: unknown) => client.receive(value) };

    const connect = () => {
      window.__CHAGOK_BRIDGE__ = receiver;
      client.start();
      if (!window.ReactNativeWebView)
        client.receive({
          ...bridgeBase,
          type: "FORM_INIT",
          connectionId: requestId(),
          payload: { mode: "demo" },
        });
    };

    const resume = (event: PageTransitionEvent) => {
      if (event.persisted) connect();
    };

    connect();

    const cleanup = () => {
      client.dispose();
      if (window.__CHAGOK_BRIDGE__ === receiver)
        delete window.__CHAGOK_BRIDGE__;
    };

    window.addEventListener("pagehide", cleanup);
    window.addEventListener("pageshow", resume);
    return () => {
      window.removeEventListener("pagehide", cleanup);
      window.removeEventListener("pageshow", resume);
      cleanup();
    };
  }, [client]);
  return null;
}
