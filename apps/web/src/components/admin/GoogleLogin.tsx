"use client";

import { useRef, useState } from "react";
import Script from "next/script";
import { adminRequest } from "./client";

type GoogleIdentity = {
  initialize(options: {
    client_id: string;
    callback: (result: { credential: string }) => void;
    auto_select: boolean;
  }): void;
  renderButton(
    element: HTMLElement,
    options: { theme: string; size: string; locale: string },
  ): void;
};

export function GoogleLogin({
  clientId,
  onLogin,
}: {
  clientId: string;
  onLogin: () => void;
}) {
  const button = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function signIn(credential: string) {
    setBusy(true);
    setError("");
    try {
      await adminRequest("", { action: "signIn", idToken: credential });
      onLogin();
    } catch (error) {
      setError(error instanceof Error ? error.message : "로그인하지 못했어요.");
    } finally {
      setBusy(false);
    }
  }

  function initialize() {
    const google = (
      window as unknown as { google?: { accounts: { id: GoogleIdentity } } }
    ).google;
    if (!google || !button.current) return;
    google.accounts.id.initialize({
      client_id: clientId,
      auto_select: false,

      callback: ({ credential }) => void signIn(credential),
    });
    google.accounts.id.renderButton(button.current, {
      theme: "outline",
      size: "large",
      locale: "ko",
    });
  }

  return (
    <section className="space-y-5 rounded-3xl border border-border bg-card p-6">
      <h2 className="text-xl font-semibold">담당자 로그인</h2>
      <p className="text-muted-foreground">
        회사에서 지정한 복지 담당자 계정으로 로그인해 주세요.
      </p>
      {clientId ? (
        <>
          <Script
            src="https://accounts.google.com/gsi/client"
            onReady={initialize}
            onError={() =>
              setError(
                "Google 로그인 화면을 불러오지 못했어요. 새로고침 후 다시 시도해 주세요.",
              )
            }
          />
          <div
            ref={button}
            className={busy ? "pointer-events-none opacity-50" : ""}
          />
        </>
      ) : (
        <p>Google 로그인 설정이 필요해요. 운영 담당자에게 문의해 주세요.</p>
      )}
      {busy ? <p role="status">로그인 확인 중…</p> : null}
      {error ? (
        <p role="alert" className="text-red-700 dark:text-red-300">
          {error}
        </p>
      ) : null}
    </section>
  );
}
