export type WebViewEventKind =
  | "mount"
  | "unmount"
  | "reload"
  | "close"
  | "load-start"
  | "load-end"
  | "navigation-allowed"
  | "navigation-blocked"
  | "ready"
  | "message-rejected"
  | "timer-armed"
  | "timer-cleared"
  | "ready-timeout"
  | "load-error"
  | "http-error"
  | "content-process-terminated"
  | "render-process-gone"
  | "app-active"
  | "app-background";
type Detail = {
  code?: number;
  status?: number;
  ready?: boolean;
  loading?: boolean;
};
type TraceEvent = Detail & {
  seq: number;
  ms: number;
  revision: number;
  kind: WebViewEventKind;
};

// No raw native event, URL, message body, token or user data is retained.
export class WebViewTrace {
  private readonly startedAt = new Date().toISOString();
  private readonly started: number;
  private sequence = 0;
  private events: TraceEvent[] = [];

  constructor(
    private readonly enabled: boolean,
    private readonly clock = () => performance.now(),
  ) {
    this.started = clock();
  }

  record(kind: WebViewEventKind, revision: number, detail: Detail = {}) {
    if (!this.enabled) return;
    const event: TraceEvent = {
      seq: ++this.sequence,
      ms: Math.round((this.clock() - this.started) * 1000) / 1000,
      revision,
      kind,
    };
    if (Number.isFinite(detail.code)) event.code = detail.code;
    if (Number.isFinite(detail.status)) event.status = detail.status;
    if (typeof detail.ready === "boolean") event.ready = detail.ready;
    if (typeof detail.loading === "boolean") event.loading = detail.loading;
    this.events.push(event);
    if (this.events.length > 200) this.events.shift();
  }

  snapshot() {
    return {
      startedAt: this.startedAt,
      dropped: this.sequence - this.events.length,
      events: this.events.map((e) => ({ ...e })),
    };
  }
}
