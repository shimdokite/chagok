import { z } from "zod";
const base = {
  channel: z.literal("chagok.bridge"),
  version: z.literal(1),
  payload: z.object({}).strict(),
};
const requestId = z.string().min(1).max(128);
export const bridgeSchema = z.discriminatedUnion("type", [
  z.object({ ...base, type: z.literal("WEB_READY") }).strict(),
  z.object({ ...base, type: z.literal("CLOSE_WEBVIEW") }).strict(),
  z.object({ ...base, type: z.literal("PING"), requestId }).strict(),
  z.object({ ...base, type: z.literal("PONG"), requestId }).strict(),
]);
export type BridgeMessage = z.infer<typeof bridgeSchema>;
export function parseBridgeMessage(value: unknown) {
  try {
    return bridgeSchema.safeParse(
      typeof value === "string" ? JSON.parse(value) : value,
    );
  } catch {
    return bridgeSchema.safeParse(undefined);
  }
}
export function isAllowedApplyUrl(value: string, origin: string) {
  try {
    const url = new URL(value);
    return (
      url.origin === new URL(origin).origin &&
      url.pathname === "/apply" &&
      !url.search &&
      !url.hash &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}
export function injectionFor(message: BridgeMessage) {
  const json = JSON.stringify(bridgeSchema.parse(message))
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
  return `window.__CHAGOK_BRIDGE__ && window.__CHAGOK_BRIDGE__.receive(${json}); true;`;
}
export const bridgeBase = {
  channel: "chagok.bridge",
  version: 1,
  payload: {},
} as const;
