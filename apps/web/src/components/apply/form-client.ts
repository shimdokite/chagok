import {
  bridgeBase,
  parseBridgeMessage,
  type BridgeMessage,
  type FormContext,
} from "@chagok/contracts";
import {
  createClaimInput,
  monthSchema,
  type CreateClaimInput,
} from "@chagok/contracts/benefits";

import type { UploadedReceipt } from "@chagok/contracts/receipts";
import { requestId } from "./request-id";

type Phase =
  | "interrupted"
  | "connecting"
  | "loading"
  | "ready"
  | "submitting"
  | "uncertain"
  | "success"
  | "error";
type State = {
  mode: "live" | "demo" | "unavailable";
  phase: Phase;
  context?: FormContext;
  error?: string;
  savedId?: string;
  receipt?: UploadedReceipt;
  receiptBusy?: boolean;
  receiptError?: string;
};
type Draft = Omit<CreateClaimInput, "requestId">;
const errors = {
  BAD_REQUEST: "입력이나 남은 한도를 확인해 주세요.",
  UNAUTHORIZED: "로그인이 만료됐어요. 화면을 닫고 다시 로그인해 주세요.",
  FORBIDDEN: "소속 회사 정보를 확인해 주세요.",
  PRECONDITION_FAILED: "사용일에 해당하는 복지 정책이 없어요.",
  CONFLICT: "이미 처리된 요청이에요. 내역을 확인해 주세요.",
  UNKNOWN: "결과를 확인하지 못했어요. 같은 내용으로 다시 확인해 주세요.",
};

export class FormClient {
  private state: State = { mode: "unavailable", phase: "connecting" };
  private listeners = new Set<() => void>();
  private connectionId = "";
  private pending?: {
    id: string;
    kind: "load" | "submit";
    month?: string;
    timer: ReturnType<typeof setTimeout>;
  };
  private input?: CreateClaimInput;
  private receiptRequest?: { id: string; timer: ReturnType<typeof setTimeout> };
  private month: string;
  private connectTimer?: ReturnType<typeof setTimeout>;
  private interrupted = false;

  constructor(
    private send: (message: BridgeMessage) => void,
    month: string,
  ) {
    this.month = month;
  }

  snapshot = () => this.state;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private set(state: State) {
    this.state = state;
    for (const listener of this.listeners) listener();
  }

  private clearPending() {
    if (this.pending) clearTimeout(this.pending.timer);
    this.pending = undefined;
  }

  start() {
    clearTimeout(this.connectTimer);
    this.connectTimer = setTimeout(() => {
      if (this.state.phase === "connecting")
        this.set({
          ...this.state,
          phase: "error",
          error:
            "앱과 연결하지 못했어요. 앱을 업데이트하거나 화면을 다시 열어 주세요.",
        });
    }, 12000);
    this.send({ ...bridgeBase, type: "WEB_READY" });
  }

  dispose() {
    this.interrupted ||=
      this.state.phase === "submitting" || this.state.phase === "uncertain";
    clearTimeout(this.connectTimer);
    this.clearPending();
    this.cancelReceipt();
    this.connectionId = "";
    this.input = undefined;
  }

  receive(value: unknown) {
    const parsed = parseBridgeMessage(value);
    if (!parsed.success) return;
    const message = parsed.data;
    if (message.type === "PING") {
      this.send({ ...bridgeBase, type: "PONG", requestId: message.requestId });
      return;
    }
    if (message.type === "FORM_INIT") {
      if (message.connectionId === this.connectionId) return;
      this.dispose();
      this.connectionId = message.connectionId;
      if (this.interrupted) {
        this.set({
          mode: message.payload.mode,
          phase: "interrupted",
          error:
            "이전 신청 결과가 아직 확인되지 않았어요. 화면을 닫고 신청 내역부터 확인해 주세요.",
        });
      } else {
        this.set({ mode: message.payload.mode, phase: "connecting" });
        this.load(this.month);
      }
      return;
    }
    if (
      (message.type === "RECEIPT_RESULT" || message.type === "RECEIPT_ERROR") &&
      message.connectionId === this.connectionId &&
      message.requestId === this.receiptRequest?.id
    ) {
      clearTimeout(this.receiptRequest.timer);
      this.receiptRequest = undefined;
      if (message.type === "RECEIPT_RESULT") {
        this.set({
          ...this.state,
          receiptBusy: false,
          receiptError: undefined,
          receipt:
            message.payload.kind === "uploaded"
              ? message.payload.receipt
              : this.state.receipt,
        });
      } else {
        const messages = {
          PERMISSION_DENIED: "카메라 권한을 허용한 뒤 다시 시도해 주세요.",
          PERMISSION_SETTINGS: "기기 설정에서 카메라 권한을 허용해 주세요.",
          UNSUPPORTED:
            "JPEG 또는 PNG 사진을 선택해 주세요. HEIC는 아직 지원하지 않아요.",
          TOO_LARGE: "10MiB 이하 사진을 선택해 주세요.",
          UNAUTHORIZED: "로그인이 만료됐어요. 다시 로그인해 주세요.",
          FORBIDDEN: "소속 회사가 변경됐어요. 화면을 다시 열어 주세요.",
          BUSY: "열린 사진 선택 창을 먼저 닫아 주세요.",
          UPLOAD_FAILED: "업로드하지 못했어요. 사진을 다시 선택해 주세요.",
        };
        this.set({
          ...this.state,
          receiptBusy: false,
          receiptError: messages[message.payload.code],
        });
      }
      this.send({
        ...bridgeBase,
        type: "RECEIPT_ACK",
        connectionId: message.connectionId,
        requestId: message.requestId,
      });
      return;
    }
    if (
      !("connectionId" in message) ||
      message.connectionId !== this.connectionId ||
      !("requestId" in message) ||
      message.requestId !== this.pending?.id
    )
      return;
    const pending = this.pending;
    if (
      message.type === "FORM_CONTEXT" &&
      pending.kind === "load" &&
      message.payload.month === pending.month
    ) {
      this.clearPending();
      this.set({
        ...this.state,
        phase: "ready",
        context: message.payload,
      });
    } else if (message.type === "CLAIM_RESULT" && pending.kind === "submit") {
      this.clearPending();
      this.input = undefined;
      this.set({
        ...this.state,
        phase: "success",
        savedId: message.payload.id,
        error: undefined,
      });
    } else if (message.type === "FORM_ERROR") {
      this.clearPending();
      const uncertain =
        pending.kind === "submit" && message.payload.code === "UNKNOWN";
      if (!uncertain) this.input = undefined;
      if (
        pending.kind === "submit" &&
        (message.payload.code === "BAD_REQUEST" ||
          message.payload.code === "PRECONDITION_FAILED")
      ) {
        this.set({ ...this.state, phase: "ready" });
        this.load(this.month, errors[message.payload.code]);
      } else {
        this.set({
          ...this.state,
          phase: uncertain ? "uncertain" : "error",
          error: errors[message.payload.code],
        });
      }
    }
  }

  private request(kind: "load" | "submit", month?: string) {
    this.clearPending();
    const id = requestId();
    const timer = setTimeout(() => {
      this.pending = undefined;
      this.set({
        ...this.state,
        phase: kind === "submit" ? "uncertain" : "error",
        error:
          kind === "submit"
            ? errors.UNKNOWN
            : "정책을 불러오지 못했어요. 다시 시도해 주세요.",
      });
    }, 12000);
    this.pending = { id, kind, month, timer };
    return { ...bridgeBase, connectionId: this.connectionId, requestId: id };
  }

  load(month: string, error?: string) {
    if (
      ["submitting", "uncertain", "success", "interrupted"].includes(
        this.state.phase,
      )
    )
      return;
    this.clearPending();
    this.cancelReceipt();
    this.month = month;
    if (!monthSchema.safeParse(month).success) {
      this.set({
        ...this.state,
        phase: "error",
        context: undefined,
        error: "사용일을 확인해 주세요.",
      });
      return;
    }
    if (this.state.mode === "demo") {
      this.set({
        mode: "demo",
        phase: "ready",
        context: {
          kind: "ready",
          month,
          companyName: "미리보기",
          categories: ["식비", "도서비", "운동비"],
          available: 65000,
        },
      });
      return;
    }
    if (this.state.mode !== "live") {
      this.set({
        mode: "unavailable",
        phase: "error",
        error: errors.UNAUTHORIZED,
      });
      return;
    }
    this.set({ ...this.state, mode: "live", phase: "loading", error });
    this.send({
      ...this.request("load", month),
      type: "FORM_LOAD",
      payload: { month },
    });
  }

  submit(draft: Draft) {
    if (
      this.state.mode !== "live" ||
      this.state.phase !== "ready" ||
      this.state.receiptBusy
    )
      return;
    const result = createClaimInput.safeParse({
      ...draft,
      attachmentId: this.state.receipt?.attachmentId,
      requestId: requestId(),
    });
    const context = this.state.context;
    if (
      !result.success ||
      context?.kind !== "ready" ||
      !context.categories.includes(draft.category) ||
      draft.amount > context.available ||
      draft.usedOn.slice(0, 7) !== context.month
    ) {
      this.set({
        ...this.state,
        error: "사용일, 항목, 내용과 신청 가능한 금액을 확인해 주세요.",
      });
      return;
    }
    this.input = result.data;
    this.sendClaim();
  }

  pickReceipt(source: "camera" | "library") {
    if (
      this.state.mode !== "live" ||
      this.state.phase !== "ready" ||
      this.state.receiptBusy ||
      this.state.context?.kind !== "ready"
    )
      return;
    const id = requestId();
    const timer = setTimeout(() => {
      this.cancelReceipt();
      this.set({
        ...this.state,
        receiptError: "첨부가 오래 걸려 중단했어요. 다시 선택해 주세요.",
      });
    }, 120_000);
    this.receiptRequest = { id, timer };
    this.set({ ...this.state, receiptBusy: true, receiptError: undefined });
    this.send({
      ...bridgeBase,
      type: "RECEIPT_PICK",
      connectionId: this.connectionId,
      requestId: id,
      payload: { source },
    });
  }

  cancelReceipt() {
    if (!this.receiptRequest) return;
    const { id, timer } = this.receiptRequest;
    clearTimeout(timer);
    this.receiptRequest = undefined;
    this.send({
      ...bridgeBase,
      type: "RECEIPT_CANCEL",
      connectionId: this.connectionId,
      requestId: id,
    });
    this.set({ ...this.state, receiptBusy: false });
  }

  removeReceipt() {
    if (this.state.phase !== "ready" || this.state.receiptBusy) return;
    this.set({ ...this.state, receipt: undefined, receiptError: undefined });
  }

  private sendClaim() {
    if (!this.input) return;
    this.set({ ...this.state, phase: "submitting", error: undefined });
    this.send({
      ...this.request("submit"),
      type: "CLAIM_SUBMIT",
      payload: this.input,
    });
  }

  retry() {
    if (this.state.phase === "uncertain") this.sendClaim();
    else if (this.state.phase === "error") this.load(this.month);
  }

  ready() {
    if (
      this.state.mode === "live" &&
      this.state.phase === "ready" &&
      this.state.context?.kind === "ready"
    )
      this.send({
        ...bridgeBase,
        type: "FORM_READY",
        connectionId: this.connectionId,
      });
  }
}
