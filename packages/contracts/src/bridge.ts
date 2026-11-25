import { z } from "zod";
import { receiptResultSchema, receiptErrorSchema } from "./receipts";
import { createClaimInput, monthSchema } from "./benefits";

const base = {
  channel: z.literal("chagok.bridge"),
  version: z.literal(1),
  payload: z.object({}).strict(),
};
const requestId = z.string().min(1).max(128);
export const formContextSchema = z.discriminatedUnion("kind", [
  z
    .object({
      kind: z.literal("ready"),
      month: monthSchema,
      companyName: z.string(),
      categories: z.array(z.string()),
      available: z.number().int(),
    })
    .strict(),
  z.object({ kind: z.literal("noPolicy"), month: monthSchema }).strict(),
  z.object({ kind: z.literal("unassigned"), month: monthSchema }).strict(),
]);
export type FormContext = z.infer<typeof formContextSchema>;
export const formErrorCode = z.enum([
  "BAD_REQUEST",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "PRECONDITION_FAILED",
  "CONFLICT",
  "UNKNOWN",
]);
const correlated = { ...base, connectionId: requestId, requestId };
export const bridgeSchema = z.discriminatedUnion("type", [
  z
    .object({
      ...correlated,
      type: z.literal("RECEIPT_PICK"),
      payload: z.object({ source: z.enum(["camera", "library"]) }).strict(),
    })
    .strict(),
  z.object({ ...correlated, type: z.literal("RECEIPT_CANCEL") }).strict(),
  z.object({ ...correlated, type: z.literal("RECEIPT_ACK") }).strict(),
  z
    .object({
      ...correlated,
      type: z.literal("RECEIPT_RESULT"),
      payload: receiptResultSchema,
    })
    .strict(),
  z
    .object({
      ...correlated,
      type: z.literal("RECEIPT_ERROR"),
      payload: z.object({ code: receiptErrorSchema }).strict(),
    })
    .strict(),
  z
    .object({
      ...base,
      type: z.literal("FORM_INIT"),
      connectionId: requestId,
      payload: z
        .object({ mode: z.enum(["live", "demo", "unavailable"]) })
        .strict(),
    })
    .strict(),
  z
    .object({
      ...correlated,
      type: z.literal("FORM_LOAD"),
      payload: z.object({ month: monthSchema }).strict(),
    })
    .strict(),
  z
    .object({
      ...correlated,
      type: z.literal("FORM_CONTEXT"),
      payload: formContextSchema,
    })
    .strict(),
  z
    .object({
      ...correlated,
      type: z.literal("CLAIM_SUBMIT"),
      payload: createClaimInput.omit({ expectedCompanyId: true }),
    })
    .strict(),
  z
    .object({
      ...correlated,
      type: z.literal("CLAIM_RESULT"),
      payload: z.object({ id: z.string().min(1).max(100) }).strict(),
    })
    .strict(),
  z
    .object({
      ...correlated,
      type: z.literal("FORM_ERROR"),
      payload: z.object({ code: formErrorCode }).strict(),
    })
    .strict(),
  z
    .object({ ...base, type: z.literal("FORM_READY"), connectionId: requestId })
    .strict(),
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
