type Stage = "pickerMs" | "prepareMs" | "uploadMs";
type Outcome = "uploaded" | "cancelled" | "error" | "interrupted";
type Delivery = "acked" | "timeout" | "aborted";
export type ReceiptSample = Partial<Record<Stage | "bridgeAckMs", number>> & {
  source: "camera" | "library";
  outcome?: Outcome;
  delivery?: Delivery;
  mimeType?: "image/jpeg" | "image/png";
  byteSize?: number;
};

export class ReceiptTrace {
  private done = false;
  private sentAt?: number;
  private timer?: ReturnType<typeof setTimeout>;
  private onDelivered?: () => void;

  constructor(
    private sample: ReceiptSample,
    private now: () => number,
    private record: (sample: ReceiptSample) => void,
  ) {}

  async measure<T>(stage: Stage, operation: () => T | Promise<T>): Promise<T> {
    const start = this.now();
    try {
      return await operation();
    } finally {
      if (!this.done) this.sample[stage] = this.now() - start;
    }
  }

  metadata(value: { mimeType: "image/jpeg" | "image/png"; byteSize: number }) {
    if (this.done) return;
    this.sample.mimeType = value.mimeType;
    this.sample.byteSize = value.byteSize;
  }

  sent(outcome: Outcome, onDelivered?: () => void) {
    if (this.done || this.sentAt !== undefined) return;
    this.sample.outcome = outcome;
    this.sentAt = this.now();
    this.onDelivered = onDelivered;
    this.timer = setTimeout(() => this.finish("timeout"), 3000);
  }

  ack() {
    if (this.done || this.sentAt === undefined) return;
    const elapsed = this.now() - this.sentAt;
    if (elapsed >= 3000) {
      this.finish("timeout");
      return;
    }
    this.sample.bridgeAckMs = elapsed;
    this.finish("acked");
  }

  abort() {
    if (this.done) return;
    this.sample.outcome ??= "interrupted";
    this.finish("aborted");
  }

  private finish(delivery: Delivery) {
    if (this.done) return;
    this.done = true;
    clearTimeout(this.timer);
    this.onDelivered?.();
    this.record({ ...this.sample, delivery });
  }
}

export class ReceiptJournal {
  private samples: ReceiptSample[] = [];
  private started = 0;
  private dropped = 0;
  private saveFailed = false;

  constructor(
    private now: () => number = () => performance.now(),
    private persist?: (report: ReturnType<ReceiptJournal["snapshot"]>) => void,
  ) {}

  start(source: "camera" | "library") {
    if (this.started >= 100) {
      this.dropped++;
      this.save();
      return;
    }
    this.started++;
    return new ReceiptTrace({ source }, this.now, (sample) => {
      this.samples.push(sample);
      this.save();
    });
  }

  snapshot() {
    return {
      schemaVersion: 1,
      clock: "app performance.now",
      unit: "ms",
      boundary:
        "picker includes permission/user wait; prepare validates File metadata; upload includes token lookup and response parsing; ACK confirms web state, not paint",
      capacity: 100,
      started: this.started,
      pending: this.started - this.samples.length,
      dropped: this.dropped,
      saveFailed: this.saveFailed,
      samples: this.samples.map((sample) => ({ ...sample })),
    };
  }

  private save() {
    try {
      this.persist?.(this.snapshot());
    } catch {
      this.saveFailed = true;
    }
  }
}
