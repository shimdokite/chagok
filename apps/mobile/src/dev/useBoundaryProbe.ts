import { useEffect, useRef, useState } from "react";
import { Platform } from "react-native";

// Development-only, explicit opt-in platform test. All inputs still go through
// the production WebView callbacks; this tool never substitutes their verdicts.
export function useBoundaryProbe(
  inject: (script: string) => void,
  snapshot: () => unknown,
) {
  const [busy, setBusy] = useState(false);
  const [report, setReport] = useState<object | null>(null);
  const active = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const current = useRef("");
  const events = useRef<object[]>([]);
  const latestSnapshot = useRef(snapshot);
  latestSnapshot.current = snapshot;
  useEffect(
    () => () => {
      active.current = false;
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const observe = (kind: string, detail: object) => {
    if (__DEV__ && active.current)
      events.current.push({
        case: current.current,
        kind,
        ...detail,
        at: new Date().toISOString(),
      });
  };
  const run = () => {
    if (!__DEV__ || active.current) return;
    const base = {
      channel: "chagok.bridge",
      version: 1,
      payload: {},
      type: "CLOSE_WEBVIEW",
    };
    const messages: [string, string][] = [
      ["invalid-json", "{"],
      ["null", "null"],
      ["wrong-channel", JSON.stringify({ ...base, channel: "other" })],
      ["wrong-version", JSON.stringify({ ...base, version: 2 })],
      ["unknown-type", JSON.stringify({ ...base, type: "SUBMIT" })],
      [
        "nonempty-payload",
        JSON.stringify({ ...base, payload: { amount: 20000 } }),
      ],
      ["extra-key", JSON.stringify({ ...base, unexpected: true })],
      ["missing-id", JSON.stringify({ ...base, type: "PONG" })],
      [
        "unmatched-pong",
        JSON.stringify({ ...base, type: "PONG", requestId: "m08-unknown" }),
      ],
    ];
    const cases: [string, string][] = messages.map(([id, data]) => [
      id,
      `window.ReactNativeWebView.postMessage(${JSON.stringify(data)}); true;`,
    ]);
    for (const [id, expression] of [
      ["external-origin", "'https://example.com/chagok-m08'"],
      ["same-origin-other-path", "location.origin + '/m08-not-allowed'"],
      ["query", "location.origin + '/apply?m08=1'"],
      ["custom-scheme", "'chagok-m08-blocked://test'"],
    ])
      cases.push([id, `location.href = ${expression}; true;`]);
    cases.push([
      "new-window",
      "window.open('https://example.com/chagok-m08-popup', '_blank'); true;",
    ]);
    cases.push([
      "target-blank",
      "var a=document.createElement('a'); a.href='https://example.com/chagok-m08-link'; a.target='_blank'; document.body.appendChild(a); a.click(); a.remove(); true;",
    ]);
    // Valid but unmatched PONG proves the original document is still alive.
    cases.push([
      "final-document",
      `window.ReactNativeWebView.postMessage(${JSON.stringify(JSON.stringify({ ...base, type: "PONG", requestId: "m08-final" }))}); true;`,
    ]);
    const before = latestSnapshot.current();
    const startedAt = new Date().toISOString();
    events.current = [];
    active.current = true;
    setBusy(true);
    setReport(null);
    let index = 0;
    const next = () => {
      if (!active.current) return;
      if (index === cases.length) {
        setReport({
          startedAt,
          endedAt: new Date().toISOString(),
          platform: Platform.OS,
          os: Platform.Version,
          before,
          after: latestSnapshot.current(),
          cases: cases.map(([id]) => id),
          events: events.current,
        });
        active.current = false;
        setBusy(false);
        return;
      }
      const [id, script] = cases[index++];
      current.current = id;
      inject(script);
      timer.current = setTimeout(next, 600);
    };
    next();
  };
  return { busy, report, run, observe };
}
