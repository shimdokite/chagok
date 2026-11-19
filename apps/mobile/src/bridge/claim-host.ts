import {
  bridgeBase,
  formErrorCode,
  isAllowedApplyUrl,
  parseBridgeMessage,
  type BridgeMessage,
  type FormContext,
} from "@chagok/contracts";
import type { CreateClaimInput } from "@chagok/contracts/benefits";

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

  constructor(private ports: Ports) {}

  reset() {
    this.abort.abort();
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
    if (message.type !== "FORM_LOAD" && message.type !== "CLAIM_SUBMIT") return;
    if (message.connectionId !== this.connectionId) return;
    const connectionId = this.connectionId;
    const access = this.ports.access();
    const response = {
      ...bridgeBase,
      connectionId,
      requestId: message.requestId,
    };
    if (
      access.mode !== "live" ||
      !access.scope ||
      access.scope !== this.scope
    ) {
      this.ports.send({
        ...response,
        type: "FORM_ERROR",
        payload: { code: "UNAUTHORIZED" },
      });
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
