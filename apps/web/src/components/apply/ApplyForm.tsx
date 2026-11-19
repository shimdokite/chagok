"use client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { bridgeBase } from "@chagok/contracts";
import { won } from "@chagok/contracts/demo";
import { BridgeReceiver } from "../bridge/BridgeReceiver";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { FormClient } from "./form-client";

const group = "grid min-w-0 gap-[10px]";

export function ApplyForm({ today }: { today: string }) {
  const [client] = useState(
    () =>
      new FormClient(
        (message) => {
          window.ReactNativeWebView?.postMessage(JSON.stringify(message));
        },
        today.slice(0, 7),
      ),
  );
  const state = useSyncExternalStore(
    client.subscribe,
    client.snapshot,
    client.snapshot,
  );
  const [usedOn, setUsedOn] = useState(today);
  const [category, setCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [title, setTitle] = useState("");
  const status = useRef<HTMLDivElement>(null);
  const policy = state.context?.kind === "ready" ? state.context : undefined;
  const selectedCategory = policy?.categories.includes(category)
    ? category
    : (policy?.categories[0] ?? "");
  const locked = !policy || state.phase !== "ready";
  const canSubmit = state.mode === "live" && !locked && policy.available > 0;
  const isDemo = state.mode === "demo";

  function handleDate(value: string) {
    setUsedOn(value);
    if (value.slice(0, 7) !== state.context?.month)
      client.load(value.slice(0, 7));
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    performance.mark("chagok:claim-submit");
    client.submit({
      usedOn,
      category: selectedCategory,
      amount: Number(amount),
      title,
    });
  }

  function close() {
    client.dispose();
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ ...bridgeBase, type: "CLOSE_WEBVIEW" }),
    );
  }

  useEffect(() => {
    if (state.phase === "ready" && policy && state.mode === "live") {
      performance.mark("chagok:form-ready");
      client.ready();
    }
    if (state.phase === "success") {
      performance.mark("chagok:claim-success");
      status.current?.focus();
    }
  }, [client, state.phase, state.mode, policy]);

  return (
    <>
      <BridgeReceiver client={client} />
      <div className="rounded-[10px] bg-muted px-3 py-[10px] text-xs leading-[1.6] text-muted-foreground">
        {isDemo
          ? "입력 미리보기예요. 실제 신청은 로그인한 앱에서 할 수 있어요."
          : "신청 금액은 회사 정책과 남은 한도를 다시 확인한 뒤 저장해요."}
      </div>
      <section className="my-[30px]">
        <h1 className="mb-3 text-[25px] leading-[1.45] font-semibold tracking-[-0.7px]">
          어떤 복지를 사용했나요?
        </h1>
        <p className="leading-[1.7] text-muted-foreground">
          사용 내역을 알려주세요. 영수증 첨부는 준비 중이에요.
        </p>
      </section>
      <div
        ref={status}
        tabIndex={-1}
        role={state.error ? "alert" : "status"}
        aria-live="polite"
        className="mb-4 text-sm leading-relaxed"
      >
        {state.phase === "connecting" || state.phase === "loading"
          ? "회사 정책을 확인하고 있어요."
          : null}
        {state.error ? <p>{state.error}</p> : null}
        {state.context?.kind === "noPolicy" ? (
          <p>선택한 사용월의 복지 정책이 없어요. 사용일을 확인해 주세요.</p>
        ) : null}
        {state.context?.kind === "unassigned" ? (
          <p>소속 회사가 등록되지 않았어요. 관리자에게 문의해 주세요.</p>
        ) : null}
        {state.phase === "success" ? (
          <>
            <p className="font-semibold">신청이 완료됐어요.</p>
            <p>홈과 신청 내역에서 확인할 수 있어요.</p>
          </>
        ) : null}
        {state.phase === "uncertain" ? (
          <p>
            중복 신청을 막기 위해 입력을 잠갔어요. 닫거나 새로고침했다면
            내역부터 확인해 주세요.
          </p>
        ) : null}
        {state.phase === "uncertain" || state.phase === "error" ? (
          <Button
            type="button"
            variant="outline"
            className="mt-3"
            onClick={() => client.retry()}
          >
            {state.phase === "uncertain"
              ? "같은 신청 결과 다시 확인"
              : "정책 다시 불러오기"}
          </Button>
        ) : null}
      </div>
      {state.phase !== "success" ? (
        <form
          onSubmit={handleSubmit}
          className="grid min-w-0 gap-[23px]"
          aria-busy={state.phase === "submitting"}
        >
          <div className={group}>
            <Label htmlFor="used-date">사용일</Label>
            <Input
              id="used-date"
              type="date"
              min="2000-01-01"
              max="2099-12-31"
              required
              value={usedOn}
              disabled={["submitting", "uncertain"].includes(state.phase)}
              onChange={(e) => handleDate(e.target.value)}
            />
          </div>
          <fieldset
            disabled={locked}
            className="m-0 grid min-w-0 gap-[23px] border-0 p-0"
          >
            <div className={group}>
              <Label htmlFor="benefit">복지 항목</Label>
              <select
                id="benefit"
                required
                value={selectedCategory}
                onChange={(e) => setCategory(e.target.value)}
                className="min-h-12 w-full min-w-0 rounded-[13px] border border-input bg-card p-[14px] text-[13px] text-foreground"
              >
                {!policy?.categories.length ? (
                  <option value="">선택 가능한 항목 없음</option>
                ) : null}
                {policy?.categories.map((value) => (
                  <option key={value}>{value}</option>
                ))}
              </select>
            </div>
            <div className={group}>
              <Label htmlFor="amount">신청 금액</Label>
              <div className="relative">
                <Input
                  id="amount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  max={Math.max(1, policy?.available ?? 1)}
                  step="1"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0"
                  className="pr-[45px]"
                  aria-describedby="amount-hint"
                />
                <span className="absolute top-[15px] right-4 text-[13px]">
                  원
                </span>
              </div>
              <small id="amount-hint" className="text-xs text-muted-foreground">
                {policy
                  ? `${isDemo ? "샘플" : policy.companyName} 신청 가능 금액 ${won(policy.available)}원`
                  : "사용일의 회사 정책을 먼저 확인해 주세요."}
              </small>
            </div>
            <div className={group}>
              <Label htmlFor="description">사용 내용</Label>
              <Input
                id="description"
                required
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="사용 내용을 입력해 주세요"
              />
            </div>
            <div className={group}>
              <Label htmlFor="receipt">영수증</Label>
              <Button
                id="receipt"
                type="button"
                disabled
                variant="outline"
                className="min-h-[70px] w-full text-muted-foreground disabled:opacity-100"
              >
                ◎　영수증 촬영·선택 · 준비 중
              </Button>
            </div>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="mt-[10px] w-full font-semibold"
            >
              {state.phase === "submitting" ? "신청 중…" : "복지비 신청하기"}
            </Button>
          </fieldset>
        </form>
      ) : null}
      {state.mode !== "demo" ? (
        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          onClick={close}
        >
          신청 화면 닫기
        </Button>
      ) : null}
    </>
  );
}
