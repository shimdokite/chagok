import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactElement } from "react";

// Node has no RN renderer. This synchronous hook host drives committed renders
// and final cleanup only; it does not model React concurrency or native events.
// The component, bridge validation/reset and trace implementation remain real.
const host = vi.hoisted(() => {
  type Slot = { value?: any; deps?: unknown[]; cleanup?: () => void };
  let slots: Slot[] = [];
  let cursor = 0;
  let layout: (() => void)[] = [];
  let passive: (() => void)[] = [];

  const next = () => (slots[cursor++] ??= {});

  const changed = (a?: unknown[], b?: unknown[]) =>
    !a || !b || a.length !== b.length || a.some((v, i) => !Object.is(v, b[i]));

  const effect = (
    queue: (() => void)[],
    fn: () => void | (() => void),
    deps?: unknown[],
  ) => {
    const slot = next();
    if (changed(slot.deps, deps)) {
      slot.deps = deps;
      queue.push(() => {
        slot.cleanup?.();
        slot.cleanup = fn() || undefined;
      });
    }
  };

  return {
    begin() {
      cursor = 0;
    },

    commit() {
      layout.splice(0).forEach((f) => f());
      passive.splice(0).forEach((f) => f());
    },

    unmount() {
      slots.forEach((s) => {
        s.cleanup?.();
        s.cleanup = undefined;
      });
    },

    clear() {
      slots = [];
      cursor = 0;
      layout = [];
      passive = [];
    },

    useRef(value: unknown) {
      const s = next();
      return (s.value ??= { current: value });
    },

    useState(value: unknown) {
      const s = next();
      if (!("value" in s))
        s.value = typeof value === "function" ? value() : value;
      return [
        s.value,
        (v: any) => {
          s.value = typeof v === "function" ? v(s.value) : v;
        },
      ];
    },

    useCallback(fn: unknown, deps: unknown[]) {
      const s = next();
      if (changed(s.deps, deps)) {
        s.value = fn;
        s.deps = deps;
      }
      return s.value;
    },

    useEffect(fn: () => void | (() => void), deps?: unknown[]) {
      effect(passive, fn, deps);
    },

    useLayoutEffect(fn: () => void | (() => void), deps?: unknown[]) {
      effect(layout, fn, deps);
    },
  };
});
const navigation = vi.hoisted(() => ({
  back: vi.fn(),
  replace: vi.fn(),

  canGoBack: () => true,
}));
vi.mock("react", async (original) => ({
  ...(await original<object>()),
  ...host,
}));
vi.mock("react-native", () => ({
  View: "View",
  Text: "Text",
  ActivityIndicator: "ActivityIndicator",
  Platform: { OS: "ios", Version: "test" },
  BackHandler: { addEventListener: () => ({ remove() {} }) },
  AppState: { addEventListener: () => ({ remove() {} }) },
}));
vi.mock("react-native-webview", () => ({ WebView: "WebView" }));
vi.mock("expo-router", () => ({ router: navigation }));
vi.mock("../lib/trpc", () => ({ webOrigin: "http://localhost:3000" }));
vi.mock("./ui", () => ({ Page: "Page", Button: "Button" }));
vi.mock("../theme/tokens", () => ({ useTheme: () => ({}) }));
vi.mock("../dev/BridgeDiagnostics", () => ({
  BridgeDiagnostics: "Diagnostics",
}));
vi.mock("../dev/VisualCheckControls", () => ({
  VisualCheckControls: "VisualControls",
}));
const probeEvents = vi.hoisted(() => ({ observe: vi.fn() }));
vi.mock("../dev/useBoundaryProbe", () => ({
  useBoundaryProbe: () => probeEvents,
}));

vi.mock("../auth/SessionProvider", () => ({
  useSession: () => ({
    controller: {
      snapshot: () => ({ status: "demo" }),

      subscribe: () => () => {},
    },
  }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({ invalidateQueries: async () => {} }),
}));
vi.mock("../benefits/api", () => ({
  benefitsClient: async () => {
    throw new Error("Unexpected API use");
  },
}));

import ApplyContainer from "./ApplyContainer";
import { bridgeBase } from "@chagok/contracts";
import type { WebViewTrace } from "../dev/webview-trace";

type Element = ReactElement<Record<string, any>>;
let tree: Element;

function render() {
  host.begin();
  tree = ApplyContainer();
  host.commit();
}

function find(type: string, node: any = tree): Element {
  if (node?.type === type) return node;
  for (const child of [node?.props?.children].flat(Infinity)) {
    if (!child || typeof child !== "object") continue;
    try {
      return find(type, child);
    } catch {
      /* Search remaining children. */
    }
  }
  throw new Error(`Missing element: ${type}`);
}

const events = () =>
  (find("Diagnostics").props.trace() as ReturnType<WebViewTrace["snapshot"]>)
    .events;

function reload(count: number) {
  for (let n = 0; n < count; n++) {
    find("Diagnostics").props.reload();
    render();
  }
}

function message(data: string, url = "http://localhost:3000/apply") {
  find("WebView").props.onMessage({ nativeEvent: { data, url } });
}

const closeMessage = JSON.stringify({ ...bridgeBase, type: "CLOSE_WEBVIEW" });

beforeEach(() => {
  host.clear();
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.stubGlobal("__DEV__", true);
  render();
});
afterEach(() => {
  host.unmount();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("ApplyContainer termination evidence", () => {
  it("records one web close at the current revision before navigation", () => {
    reload(2);
    let atNavigation: ReturnType<typeof events> = [];
    navigation.back.mockImplementation(() => {
      atNavigation = events();
    });
    message(closeMessage);
    expect(navigation.back).toHaveBeenCalledTimes(1);
    expect(atNavigation.filter((e) => e.kind === "close")).toEqual([
      expect.objectContaining({ revision: 2, kind: "close" }),
    ]);
  });
  it("records final committed revision on unmount without synthetic unmounts on reload", () => {
    reload(3);
    const snapshot = find("Diagnostics").props.trace;
    expect(events().filter((e) => e.kind === "unmount")).toEqual([]);
    host.unmount();
    expect(
      snapshot().events.filter((e: { kind: string }) => e.kind === "unmount"),
    ).toEqual([expect.objectContaining({ revision: 3, kind: "unmount" })]);
    expect(vi.getTimerCount()).toBe(0);
  });
  it("records one native close and the same revision on final unmount", () => {
    reload(1);
    const snapshot = find("Diagnostics").props.trace;
    find("Button").props.onPress();
    host.unmount();
    expect(
      snapshot().events.filter((e: { kind: string }) =>
        ["close", "unmount"].includes(e.kind),
      ),
    ).toEqual([
      expect.objectContaining({ kind: "close", revision: 1 }),
      expect.objectContaining({ kind: "unmount", revision: 1 }),
    ]);
    expect(navigation.back).toHaveBeenCalledTimes(1);
  });
  it.each([
    ["foreign origin", closeMessage, "https://untrusted.test/apply"],
    ["malformed JSON", "not-json", "http://localhost:3000/apply"],
    [
      "invalid schema",
      JSON.stringify({ type: "CLOSE_WEBVIEW" }),
      "http://localhost:3000/apply",
    ],
  ])("does not log close or navigate for %s", (_name, data, url) => {
    message(data, url);
    expect(events().filter((e) => e.kind === "close")).toEqual([]);
    expect(navigation.back).not.toHaveBeenCalled();
    expect(navigation.replace).not.toHaveBeenCalled();
  });
  it("keeps release termination unrecorded", () => {
    host.unmount();
    host.clear();
    vi.stubGlobal("__DEV__", false);
    render();
    reload(1);
    const snapshot = find("Diagnostics").props.trace;
    message(closeMessage);
    host.unmount();
    expect(navigation.back).toHaveBeenCalledTimes(1);
    expect(snapshot().events).toEqual([]);
  });
});

it("does not export form payloads through the boundary probe", () => {
  message(
    JSON.stringify({
      ...bridgeBase,
      type: "CLAIM_SUBMIT",
      connectionId: "x",
      requestId: "rpc",
      payload: {
        requestId: "123e4567-e89b-42d3-a456-426614174000",
        title: "private expense",
        amount: 1234,
        category: "식비",
        usedOn: "2026-11-19",
      },
    }),
  );
  const report = JSON.stringify(probeEvents.observe.mock.calls);
  expect(report).not.toContain("private expense");
  expect(report).not.toContain("1234");
  expect(report).toContain("accepted");
});
