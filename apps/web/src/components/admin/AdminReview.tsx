"use client";

import { useEffect, useState } from "react";
import {
  currentMonth,
  statusLabels,
  type ClaimStatus,
  type ReviewList,
  type ReviewDetail,
  type ReviewDecisionInput,
} from "@chagok/contracts/benefits";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { GoogleLogin } from "./GoogleLogin";
import { adminRequest, AdminError } from "./client";

export function AdminReview({ clientId }: { clientId: string }) {
  const [month, setMonth] = useState(currentMonth);
  const [status, setStatus] = useState<ClaimStatus | "">("");
  const [cursor, setCursor] = useState<ReviewList["nextCursor"]>(null);
  const [list, setList] = useState<ReviewList>();
  const [selected, setSelected] = useState<string>();
  const [detail, setDetail] = useState<ReviewDetail>();
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [signedOut, setSignedOut] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const [receiptFailed, setReceiptFailed] = useState(false);
  const [receiptReady, setReceiptReady] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const claim = detail?.claim;
  const canReview = claim?.status === "SUBMITTED" && !claim.isOwn;

  function report(error: unknown) {
    if (
      error instanceof AdminError &&
      (error.status === 401 || error.status === 403)
    ) {
      setList(undefined);
      setDetail(undefined);
      setSelected(undefined);
      setSignedOut(true);
    }
    setError(
      error instanceof Error ? error.message : "요청을 처리하지 못했어요.",
    );
  }

  function refresh() {
    setRevision((value) => value + 1);
  }

  function filter(nextMonth: string, nextStatus: ClaimStatus | "") {
    setMonth(nextMonth);
    setStatus(nextStatus);
    setCursor(null);
    setList(undefined);
    setSelected(undefined);
    setDetail(undefined);
    setNotice("");
  }

  async function decide(decision: "APPROVED" | "REJECTED") {
    if (!detail || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    const base = { id: detail.claim.id, expectedCompanyId: detail.company.id };
    const input: ReviewDecisionInput =
      decision === "REJECTED"
        ? { ...base, decision, reason: reason.trim() }
        : { ...base, decision };
    try {
      await adminRequest("", { action: "decide", input });
      setNotice(
        decision === "APPROVED"
          ? "승인했어요. 신청자의 사용 가능 한도는 그대로 유지돼요."
          : "반려했어요. 신청자의 사용 가능 한도가 복원됐어요.",
      );
      setReason("");
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
      setCursor(null);
      refresh();
    }
  }

  async function signOut() {
    setBusy(true);
    try {
      await adminRequest("", { action: "signOut" });
      setSignedOut(true);
      setList(undefined);
      setSelected(undefined);
      setDetail(undefined);
      setError("");
      setNotice("");
    } catch (error) {
      report(error);
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (signedOut) return;
    const controller = new AbortController();
    const query = new URLSearchParams({ month });
    if (status) query.set("status", status);
    if (cursor) query.set("cursor", JSON.stringify(cursor));
    setLoading(true);
    void adminRequest<ReviewList>(`?${query}`, undefined, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setList(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) report(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [month, status, cursor, revision, signedOut]);

  useEffect(() => {
    setDetail(undefined);
    setReason("");
    setReceiptFailed(false);
    setReceiptReady(false);
    setDetailLoading(false);
    if (!selected || signedOut) return;
    setDetailLoading(true);
    const controller = new AbortController();
    void adminRequest<ReviewDetail>(
      `?id=${encodeURIComponent(selected)}`,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) setDetail(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) report(error);
      })
      .finally(() => {
        if (!controller.signal.aborted) setDetailLoading(false);
      });
    return () => controller.abort();
  }, [selected, revision, signedOut]);

  return (
    <main className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border pb-6">
        <a href="/admin" className="text-3xl font-semibold tracking-tight">
          ▰ 차곡
        </a>
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-muted-foreground">
            {list?.company.name ?? "복지 담당자"}
          </span>
          {!signedOut ? (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void signOut()}
            >
              로그아웃
            </Button>
          ) : null}
        </div>
      </header>
      <h1 className="text-3xl font-semibold">복지비 신청 관리</h1>
      {error ? (
        <div
          role="alert"
          className="space-y-3 rounded-2xl border border-border p-4"
        >
          <p>{error}</p>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => {
              setError("");
              refresh();
            }}
          >
            다시 확인
          </Button>
        </div>
      ) : null}
      {notice ? (
        <p role="status" className="rounded-2xl bg-muted p-4">
          {notice}
        </p>
      ) : null}
      {signedOut ? (
        <GoogleLogin
          clientId={clientId}
          onLogin={() => {
            setSignedOut(false);
            setError("");
            setCursor(null);
            refresh();
          }}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="review-month">사용 월</Label>
              <Input
                id="review-month"
                type="month"
                min="2000-01"
                max="2099-12"
                value={month}
                disabled={busy}
                onChange={(event) => {
                  if (/^20\d{2}-(0[1-9]|1[0-2])$/.test(event.target.value))
                    filter(event.target.value, status);
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-status">신청 상태</Label>
              <select
                id="review-status"
                className="h-12 rounded-xl border border-border bg-card px-3"
                value={status}
                disabled={busy}
                onChange={(event) =>
                  filter(month, event.target.value as ClaimStatus | "")
                }
              >
                <option value="">전체</option>
                {Object.entries(statusLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              disabled={busy || loading}
              onClick={() => {
                setError("");
                refresh();
              }}
            >
              새로고침
            </Button>
          </div>
          {loading ? <p role="status">신청을 불러오는 중…</p> : null}
          {list ? (
            <section
              aria-label="신청 목록"
              className="rounded-3xl border border-border bg-card p-5 sm:p-8"
            >
              <h2 className="mb-4 text-xl">
                검토할 신청{" "}
                <strong className="ml-3 text-3xl">{list.pendingCount}건</strong>
              </h2>
              {list.items.length === 0 ? (
                <p className="py-6 text-muted-foreground">
                  선택한 조건의 신청이 없어요.
                </p>
              ) : (
                list.items.map((item) => (
                  <article
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-5"
                  >
                    <div className="min-w-0 flex-1 basis-52">
                      <h3 className="break-words text-lg font-semibold">
                        {item.title}
                      </h3>
                      <p className="mt-2 break-words text-muted-foreground">
                        {item.applicantLabel} / {item.category} /{" "}
                        {item.amount.toLocaleString("ko-KR")}원
                      </p>
                    </div>
                    <span className="rounded-lg bg-muted px-3 py-2">
                      {statusLabels[item.status]}
                    </span>
                    <Button
                      variant="outline"
                      disabled={busy}
                      aria-expanded={selected === item.id}
                      onClick={() => {
                        setSelected(selected === item.id ? undefined : item.id);
                        setError("");
                        setNotice("");
                      }}
                    >
                      {selected === item.id ? "접기" : "검토하기"}
                    </Button>
                  </article>
                ))
              )}
              <div className="mt-5 flex flex-wrap gap-3">
                {cursor ? (
                  <Button
                    variant="outline"
                    disabled={busy || loading}
                    onClick={() => {
                      setCursor(null);
                      setSelected(undefined);
                    }}
                  >
                    처음으로
                  </Button>
                ) : null}
                {list.nextCursor ? (
                  <Button
                    variant="outline"
                    disabled={busy || loading}
                    onClick={() => {
                      setCursor(list.nextCursor);
                      setSelected(undefined);
                    }}
                  >
                    다음 페이지
                  </Button>
                ) : null}
              </div>
            </section>
          ) : null}
          {detailLoading ? <p role="status">상세 내용을 불러오는 중…</p> : null}
          {detail && claim ? (
            <section
              aria-label="신청 상세"
              className="space-y-5 rounded-3xl border border-border bg-card p-5 sm:p-8"
            >
              <div className="flex flex-wrap justify-between gap-3">
                <h2 className="text-2xl font-semibold">신청 상세</h2>
                <span>{statusLabels[claim.status]}</span>
              </div>
              <p className="break-words text-xl font-semibold">
                {claim.title} / {claim.amount.toLocaleString("ko-KR")}원
              </p>
              <p>
                {claim.applicantLabel} / {claim.category} / 사용일{" "}
                {claim.usedOn}
              </p>
              {claim.hasReceipt ? (
                <>
                  {receiptFailed ? (
                    <p role="alert">
                      영수증을 불러오지 못했어요. 새로고침해 다시 확인해 주세요.
                    </p>
                  ) : (
                    <img
                      key={`${claim.id}:${revision}`}
                      src={`/api/admin?id=${encodeURIComponent(claim.id)}&receipt=1`}
                      alt="신청자가 첨부한 영수증"
                      className="mx-auto max-h-[600px] max-w-full rounded-2xl border border-border object-contain"
                      onLoad={() => setReceiptReady(true)}
                      onError={() => setReceiptFailed(true)}
                    />
                  )}
                </>
              ) : (
                <p className="rounded-2xl bg-muted p-6">
                  첨부된 영수증이 없는 신청이에요.
                </p>
              )}
              {claim.rejectionReason ? (
                <p className="whitespace-pre-wrap break-words rounded-2xl bg-muted p-4">
                  반려 사유: {claim.rejectionReason}
                </p>
              ) : null}
              {claim.reviewedAt ? (
                <p className="text-muted-foreground">
                  처리 시각:{" "}
                  {new Date(claim.reviewedAt).toLocaleString("ko-KR")}
                </p>
              ) : null}
              {claim.isOwn && claim.status === "SUBMITTED" ? (
                <p>본인 신청은 다른 담당자가 검토해야 해요.</p>
              ) : null}
              {canReview ? (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="rejection-reason">반려 사유</Label>
                    <p className="text-muted-foreground">
                      반려할 때만 입력해 주세요. 최대 500자예요.
                    </p>
                    <textarea
                      id="rejection-reason"
                      className="min-h-28 w-full rounded-2xl border border-border bg-background p-4"
                      maxLength={500}
                      value={reason}
                      disabled={busy}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="수정이 필요한 내용을 알려주세요."
                    />
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      className="min-w-36 flex-1"
                      variant="outline"
                      disabled={busy || !reason.trim()}
                      onClick={() => void decide("REJECTED")}
                    >
                      반려하기
                    </Button>
                    <Button
                      className="min-w-36 flex-1"
                      disabled={
                        busy ||
                        receiptFailed ||
                        (claim.hasReceipt && !receiptReady)
                      }
                      onClick={() => void decide("APPROVED")}
                    >
                      {busy ? "처리 중…" : "승인하기"}
                    </Button>
                  </div>
                </>
              ) : null}
            </section>
          ) : null}
        </>
      )}
      <footer className="text-sm text-muted-foreground">
        접수 시 한도를 예약하고 승인 시 유지, 반려 시 복원해요. 실제 송금은
        포함하지 않아요.
      </footer>
    </main>
  );
}
