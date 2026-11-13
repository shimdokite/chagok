import {
  bridgeBase,
  parseBridgeMessage,
  type BridgeMessage,
} from "@chagok/contracts";
export type Environment = {
  device: string;
  OS: string;
  appBuild: string;
  webBuildMode: string;
  sourceRef: string;
};
export type Sample = Environment & {
  experimentId: string;
  sessionId: string;
  sampleId: string;
  requestId: string;
  sentAtMonotonicMs: number;
  receivedAtMonotonicMs: number | null;
  durationMs: number | null;
  status: "success" | "failure" | "timeout" | "cancelled";
  reason: string | null;
  measuredAtKst: string;
};
export function summarize(samples: Sample[]) {
  const values = samples
    .filter((s) => s.status === "success")
    .map((s) => s.durationMs!)
    .sort((a, b) => a - b);
  const n = values.length;
  return {
    attempts: samples.length,
    success: n,
    failure: samples.filter((s) => s.status === "failure").length,
    timeout: samples.filter((s) => s.status === "timeout").length,
    cancelled: samples.filter((s) => s.status === "cancelled").length,
    medianMs: n
      ? (values[Math.floor((n - 1) / 2)] + values[Math.floor(n / 2)]) / 2
      : null,
    minMs: n ? values[0] : null,
    maxMs: n ? values[n - 1] : null,
  };
}
export type BenchmarkResult = {
  experimentId: string;
  status: "completed" | "cancelled";
  reason: string | null;
  requestedCount: number;
  warmupCount: number;
  intervalMs: number;
  timeoutMs: number;
  environment: Environment;
  warmups: Sample[];
  samples: Sample[];
  summary: ReturnType<typeof summarize>;
};
let sequence = 0;
const uniqueId = () => `${Date.now().toString(36)}-${++sequence}`;
const kstNow = () =>
  new Date(Date.now() + 9 * 3600000).toISOString().replace("Z", "+09:00");
export class BridgeBenchmark {
  ready = false;
  running = false;
  private sessionId = uniqueId();
  private generation = 0;
  private cancellationReason: string | null = null;
  private pending = new Map<
    string,
    (status: Sample["status"], reason?: string) => void
  >();
  private cancelSleep: (() => void) | undefined;
  constructor(
    private send: (message: BridgeMessage) => void,
    private environment: Environment,
    private now = () => performance.now(),
  ) {}
  receive(value: unknown): boolean {
    const result = parseBridgeMessage(value);
    if (!result.success) return false;
    const message = result.data;
    if (message.type === "WEB_READY") {
      this.ready = true;
      return true;
    }
    if (message.type === "PONG") {
      this.pending.get(message.requestId)?.("success");
      return true;
    }
    return false;
  }
  reset(reason: string) {
    if (this.running && this.cancellationReason === null)
      this.cancellationReason = reason;
    this.ready = false;
    this.generation++;
    this.sessionId = uniqueId();
    for (const finish of this.pending.values()) finish("cancelled", reason);
    this.cancelSleep?.();
    this.cancelSleep = undefined;
  }
  private sample(
    experimentId: string,
    sampleId: string,
    timeoutMs: number,
  ): Promise<Sample> {
    const requestId = uniqueId();
    return new Promise((resolve) => {
      const sentAtMonotonicMs = this.now();
      const seed = {
        ...this.environment,
        experimentId,
        sessionId: this.sessionId,
        sampleId,
        requestId,
        sentAtMonotonicMs,
        measuredAtKst: kstNow(),
      };
      const timer = setTimeout(
        () => finish("timeout", "response-timeout"),
        timeoutMs,
      );
      const finish = (status: Sample["status"], reason?: string) => {
        if (!this.pending.has(requestId)) return;
        const receivedAtMonotonicMs = status === "success" ? this.now() : null;
        if (
          receivedAtMonotonicMs !== null &&
          receivedAtMonotonicMs - sentAtMonotonicMs > timeoutMs
        ) {
          status = "timeout";
          reason = "response-after-deadline";
        }
        clearTimeout(timer);
        this.pending.delete(requestId);
        resolve({
          ...seed,
          status,
          reason: reason ?? null,
          receivedAtMonotonicMs,
          durationMs:
            receivedAtMonotonicMs === null
              ? null
              : receivedAtMonotonicMs - sentAtMonotonicMs,
        });
      };
      this.pending.set(requestId, finish);
      try {
        this.send({ ...bridgeBase, type: "PING", requestId });
      } catch {
        finish("failure", "send-unavailable");
      }
    });
  }
  async runBridgeBenchmark({
    count = 20,
    intervalMs = 100,
    timeoutMs = 3000,
    warmupCount = 3,
  } = {}): Promise<BenchmarkResult> {
    if (this.running) throw new Error("already-running");
    if (!this.ready) throw new Error("not-ready");
    if (
      !Number.isInteger(count) ||
      count < 1 ||
      count > 100 ||
      !Number.isInteger(warmupCount) ||
      warmupCount < 0 ||
      intervalMs < 100 ||
      timeoutMs < 1
    )
      throw new Error("invalid-options");
    this.running = true;
    this.cancellationReason = null;
    const generation = this.generation;
    const experimentId = uniqueId();
    const warmups: Sample[] = [];
    const samples: Sample[] = [];
    try {
      for (let i = 0; i < warmupCount + count; i++) {
        if (generation !== this.generation) break;
        const warmup = i < warmupCount;
        const sample = await this.sample(
          experimentId,
          `${warmup ? "warmup" : "sample"}-${warmup ? i + 1 : i - warmupCount + 1}`,
          timeoutMs,
        );
        (warmup ? warmups : samples).push(sample);
        if (generation !== this.generation || i === warmupCount + count - 1)
          break;
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => {
            this.cancelSleep = undefined;
            resolve();
          }, intervalMs);
          this.cancelSleep = () => {
            clearTimeout(timer);
            resolve();
          };
        });
      }
      return {
        experimentId,
        status: this.cancellationReason === null ? "completed" : "cancelled",
        reason: this.cancellationReason,
        requestedCount: count,
        warmupCount,
        intervalMs,
        timeoutMs,
        environment: this.environment,
        warmups,
        samples,
        summary: summarize(samples),
      };
    } finally {
      this.running = false;
    }
  }
}
