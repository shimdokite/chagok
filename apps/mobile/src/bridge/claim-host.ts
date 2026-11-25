import {
  bridgeBase,
  formErrorCode,
  isAllowedApplyUrl,
  parseBridgeMessage,
  type BridgeMessage,
  type FormContext,
} from "@chagok/contracts";
import {
  receiptErrorSchema,
  type ReceiptResult,
} from "@chagok/contracts/receipts";
import type { CreateClaimInput } from "@chagok/contracts/benefits";

import type { ReceiptTrace } from "../receipts/metrics";
import type { AuthState } from "../auth/session";
import { sessionScope } from "../benefits/cache";

type Access = { scope: string | null; mode: "live" | "demo" | "unavailable" };
type Ports = {
  origin: string;
  access(): Access;
  send(message: BridgeMessage): void;
  load(month: string, signal: AbortSignal): Promise<FormContext>;
  create(input: CreateClaimInput, signal: AbortSignal): Promise<{ id: string }>;
  invalidate(): Promise<unknown>;
  measureReceipt?(source: "camera" | "library"): ReceiptTrace | undefined;
  pickReceipt?(
    source: "camera" | "library",
    signal: AbortSignal,
    trace?: ReceiptTrace,
  ): Promise<ReceiptResult>;
};
let sequence = 0;

export function claimAccess(state: AuthState): Access {
  if (state.status === "demo") return { scope: null, mode: "demo" };
  const usable = state.status === "authenticated" || state.status === "busy";
  if (
    !usable ||
    !state.session ||
    Date.parse(state.session.expiresAt) <= Date.now()
  )
    return { scope: null, mode: "unavailable" };
  return { scope: sessionScope(state), mode: "live" };
}

export class ClaimHost {
  private connectionId = `form-${Date.now()}-${++sequence}`;
  private abort = new AbortController();
  private scope: string | null = null;
  private receipt?: {
    id: string;
    abort: AbortController;
    trace?: ReceiptTrace;
  };
  private receiptAcks = new Map<
    string,
    { scope: string; trace: ReceiptTrace }
  >();

  constructor(private ports: Ports) {}

  reset() {
    this.abort.abort();
    this.receipt?.abort.abort();
    this.receipt?.trace?.abort();
    for (const pending of this.receiptAcks.values()) pending.trace.abort();
    this.receiptAcks.clear();
    this.abort = new AbortController();
    this.connectionId = `form-${Date.now()}-${++sequence}`;
    this.scope = null;
  }

  announce() {
    const access = this.ports.access();
    this.scope = access.scope;
    this.ports.send({
      ...bridgeBase,
      type: "FORM_INIT",
      connectionId: this.connectionId,
      payload: { mode: access.mode },
    });
  }

  async receive(value: unknown, url: string) {
    if (!isAllowedApplyUrl(url, this.ports.origin)) return;
    const parsed = parseBridgeMessage(value);
    if (!parsed.success) return;
    const message = parsed.data;
    if (message.type === "WEB_READY") {
      this.announce();
      return;
    }
    if (
      message.type !== "FORM_LOAD" &&
      message.type !== "CLAIM_SUBMIT" &&
      message.type !== "RECEIPT_PICK" &&
      message.type !== "RECEIPT_CANCEL" &&
      message.type !== "RECEIPT_ACK"
    )
      return;
    if (message.connectionId !== this.connectionId) return;
    const connectionId = this.connectionId;
    const access = this.ports.access();
    const response = {
      ...bridgeBase,
      connectionId,
      requestId: message.requestId,
    };
    if (message.type === "RECEIPT_ACK") {
      const pending = this.receiptAcks.get(message.requestId);
      if (!pending) return;
      if (
        access.mode === "live" &&
        access.scope === pending.scope &&
        access.scope === this.scope
      )
        pending.trace.ack();
      else pending.trace.abort();
      return;
    }
    if (message.type === "RECEIPT_CANCEL") {
      if (this.receipt?.id === message.requestId) {
        this.receipt.abort.abort();
        this.receipt.trace?.abort();
      }
      this.receiptAcks.get(message.requestId)?.trace.abort();
      return;
    }
    if (
      access.mode !== "live" ||
      !access.scope ||
      access.scope !== this.scope
    ) {
      this.ports.send({
        ...response,
        type: message.type === "RECEIPT_PICK" ? "RECEIPT_ERROR" : "FORM_ERROR",
        payload: { code: "UNAUTHORIZED" },
      });
      return;
    }
    if (message.type === "RECEIPT_PICK") {
      if (this.receiptAcks.has(message.requestId)) return;
      if (this.receipt) {
        this.ports.send({
          ...response,
          type: "RECEIPT_ERROR",
          payload: { code: "BUSY" },
        });
        return;
      }
      const operation = {
        id: message.requestId,
        abort: new AbortController(),
        trace: this.ports.measureReceipt?.(message.payload.source),
      };
      let delivered = false;
      const receiptScope = access.scope;

      const sendReceipt = (
        reply: BridgeMessage,
        outcome: "uploaded" | "cancelled" | "error",
      ) => {
        const trace = operation.trace;
        if (trace) {
          this.receiptAcks.set(message.requestId, {
            scope: receiptScope,
            trace,
          });
          trace.sent(outcome, () => this.receiptAcks.delete(message.requestId));
        }
        this.ports.send(reply);
        delivered = true;
      };

      this.receipt = operation;
      const signal = AbortSignal.any([
        this.abort.signal,
        operation.abort.signal,
      ]);

      const current = () =>
        !signal.aborted && this.connectionId === connectionId;

      try {
        if (!this.ports.pickReceipt) throw new Error("Picker unavailable");
        const payload = await this.ports.pickReceipt(
          message.payload.source,
          signal,
          operation.trace,
        );
        if (!current()) return;
        const latest = this.ports.access();
        if (latest.mode !== "live") throw { code: "UNAUTHORIZED" };
        if (latest.scope === access.scope)
          sendReceipt(
            { ...response, type: "RECEIPT_RESULT", payload },
            payload.kind,
          );
      } catch (error) {
        const latest = this.ports.access();
        if (latest.mode === "live" && latest.scope !== access.scope) return;
        const code = receiptErrorSchema.safeParse(
          latest.mode !== "live"
            ? "UNAUTHORIZED"
            : (error as { code?: string })?.code,
        );
        if (current())
          sendReceipt(
            {
              ...response,
              type: "RECEIPT_ERROR",
              payload: { code: code.success ? code.data : "UPLOAD_FAILED" },
            },
            "error",
          );
      } finally {
        if (!delivered) operation.trace?.abort();
        if (this.receipt === operation) this.receipt = undefined;
      }
      return;
    }
    const signal = this.abort.signal;

    const active = () =>
      !signal.aborted && this.ports.access().scope === access.scope;

    try {
      if (message.type === "FORM_LOAD") {
        const payload = await this.ports.load(message.payload.month, signal);
        if (active())
          this.ports.send({ ...response, type: "FORM_CONTEXT", payload });
      } else {
        const payload = await this.ports.create(message.payload, signal);
        // A committed write remains a success even if refresh or navigation fails.
        if (active())
          this.ports.send({ ...response, type: "CLAIM_RESULT", payload });
      }
    } catch (error) {
      if (!active()) return;
      const code = formErrorCode.safeParse(
        (error as { data?: { code?: unknown } })?.data?.code,
      );
      this.ports.send({
        ...response,
        type: "FORM_ERROR",
        payload: { code: code.success ? code.data : "UNKNOWN" },
      });
    } finally {
      // A lost/aborted reply can hide a committed write. Refresh on every attempt.
      if (message.type === "CLAIM_SUBMIT")
        void this.ports.invalidate().catch(() => undefined);
    }
  }
}
