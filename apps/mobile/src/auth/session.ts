export type Session = { user: { id: string }; expiresAt: string };
export type RestoreMetric = {
  runId: string;
  trigger: "startup" | "foreground" | "retry";
  status: "success" | "empty" | "expired" | "failure" | "timeout" | "cancelled";
  durationMs: number;
  measuredAt: string;
};
export type AuthState = {
  status: "signedOut" | "busy" | "authenticated" | "demo" | "error";
  session?: Session;
  message?: string;
  retry?: "restore" | "signIn" | "signOut";
};
export interface SessionPorts {
  storage: {
    get(): Promise<string | null>;
    set(token: string): Promise<void>;
    remove(): Promise<void>;
  };
  api: {
    signIn(idToken: string): Promise<Session & { token: string }>;
    session(token: string): Promise<Session>;
    signOut(token: string): Promise<unknown>;
  };
  google: {
    signIn(): Promise<
      { type: "success"; idToken: string } | { type: "cancelled" }
    >;
    signOut(): Promise<unknown>;
  };
  now(): number;
  wallNow(): number;
  onMeasurement(metric: RestoreMetric): void;
}
function errorCode(error: unknown): string | undefined {
  let current = error;
  for (
    let depth = 0;
    depth < 3 && current && typeof current === "object";
    depth++
  ) {
    const e = current as {
      code?: unknown;
      data?: { code?: string };
      name?: string;
      cause?: unknown;
    };
    if (e.data?.code) return e.data.code;
    if (e.name === "TimeoutError" || e.name === "AbortError") return e.name;
    if (typeof e.code === "string") return e.code;
    current = e.cause;
  }
  return undefined;
}
export function canAccessApp(state: AuthState) {
  return (
    state.status === "authenticated" ||
    state.status === "demo" ||
    (state.status === "busy" && !!state.session)
  );
}
export class SessionController {
  state: AuthState = { status: "busy" };
  private listeners = new Set<() => void>();
  private epoch = 0;
  private busy = false;
  private active: Promise<void> = Promise.resolve();
  constructor(private ports: SessionPorts) {}
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  snapshot = () => this.state;
  private set(state: AuthState) {
    this.state = state;
    this.listeners.forEach((fn) => fn());
  }
  private run(action: (epoch: number) => Promise<void>) {
    if (this.busy) return this.active;
    this.busy = true;
    const epoch = ++this.epoch;
    this.active = action(epoch).finally(() => {
      if (epoch === this.epoch) this.busy = false;
    });
    return this.active;
  }
  restore(trigger: RestoreMetric["trigger"]) {
    // A failed revocation must remain retryable instead of signing back in.
    if (this.state.status === "demo" || this.state.retry === "signOut")
      return Promise.resolve();
    return this.run(async (epoch) => {
      const start = this.ports.now();
      let status: RestoreMetric["status"] = "failure";
      // Keep the protected navigator mounted beneath its blocking overlay.
      // Only a failed validation removes the authenticated route/history.
      this.set({ status: "busy", session: this.state.session });
      try {
        const token = await this.ports.storage.get();
        if (epoch !== this.epoch) return;
        if (!token) {
          status = "empty";
          this.set({ status: "signedOut" });
          return;
        }
        const session = await this.ports.api.session(token);
        if (epoch !== this.epoch) return;
        if (
          !Number.isFinite(Date.parse(session.expiresAt)) ||
          Date.parse(session.expiresAt) <= this.ports.wallNow()
        )
          throw { code: "UNAUTHORIZED" };
        status = "success";
        this.set({ status: "authenticated", session });
      } catch (error) {
        if (epoch !== this.epoch) return;
        if (errorCode(error) === "UNAUTHORIZED") {
          status = "expired";
          try {
            await this.ports.storage.remove();
            if (epoch === this.epoch)
              this.set({
                status: "signedOut",
                message: "로그인이 만료됐어요. 다시 로그인해 주세요.",
              });
          } catch {
            status = "failure";
            if (epoch === this.epoch)
              this.set({
                status: "error",
                message: "저장된 로그인을 지우지 못했어요. 다시 시도해 주세요.",
                retry: "signOut",
              });
          }
        } else {
          if (
            ["TimeoutError", "AbortError", "TIMEOUT"].includes(
              errorCode(error) ?? "",
            )
          )
            status = "timeout";
          this.set({
            status: "error",
            message:
              "로그인을 확인하지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
            retry: "restore",
          });
        }
      } finally {
        this.ports.onMeasurement({
          runId: `restore-${this.ports.wallNow()}-${epoch}`,
          trigger,
          status: epoch === this.epoch ? status : "cancelled",
          durationMs: Math.max(0, this.ports.now() - start),
          measuredAt: new Date(this.ports.wallNow()).toISOString(),
        });
      }
    });
  }
  signIn() {
    return this.run(async (epoch) => {
      this.set({ status: "busy" });
      let issued: string | undefined;
      try {
        const google = await this.ports.google.signIn();
        if (epoch !== this.epoch) return;
        if (google.type === "cancelled") {
          this.set({ status: "signedOut", message: "로그인을 취소했어요." });
          return;
        }
        const result = await this.ports.api.signIn(google.idToken);
        issued = result.token;
        if (epoch !== this.epoch) {
          await this.ports.api.signOut(issued);
          return;
        }
        await this.ports.storage.set(result.token);
        if (epoch === this.epoch)
          this.set({
            status: "authenticated",
            session: { user: result.user, expiresAt: result.expiresAt },
          });
      } catch {
        if (issued)
          try {
            await this.ports.api.signOut(issued);
          } catch {
            /* server session still has its fixed expiry */
          }
        if (epoch === this.epoch)
          this.set({
            status: "error",
            message: "로그인을 완료하지 못했어요. 잠시 후 다시 시도해 주세요.",
            retry: "signIn",
          });
      }
    });
  }
  async signOut() {
    if (this.state.status === "busy" && this.state.retry === "signOut")
      return this.active;
    const epoch = ++this.epoch;
    this.busy = true;
    const previous = this.active;
    this.set({ status: "busy", retry: "signOut" });
    this.active = (async () => {
      await previous;
      try {
        const token = await this.ports.storage.get();
        if (token) await this.ports.api.signOut(token);
        await this.ports.storage.remove();
        try {
          await this.ports.google.signOut();
        } catch {
          /* Google SDK cleanup doesn't restore a revoked app session. */
        }
        if (epoch === this.epoch) this.set({ status: "signedOut" });
      } catch {
        if (epoch === this.epoch)
          this.set({
            status: "error",
            message:
              "로그아웃을 완료하지 못했어요. 연결을 확인하고 다시 시도해 주세요.",
            retry: "signOut",
          });
      } finally {
        if (epoch === this.epoch) this.busy = false;
      }
    })();
    return this.active;
  }
  enterDemo() {
    if (this.busy || this.state.retry === "signOut") return;
    this.set({ status: "demo" });
  }
  leaveDemo() {
    this.set({ status: "signedOut" });
  }
  expire() {
    if (this.state.status === "authenticated") void this.restore("foreground");
  }
}
