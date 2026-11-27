import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { handleReviewRequest } from "./http";
import type { AuthService } from "../auth/service";
import type { ReviewService } from "./service";

const token = "a".repeat(64);
const session = {
  user: { id: "reviewer", companyId: "company" },
  expiresAt: "2099-01-01T00:00:00.000Z",
};
const listing = {
  company: { id: "company", name: "회사", isSample: true },
  items: [],
  pendingCount: 0,
  nextCursor: null,
};

function ports(denied = false) {
  const auth: AuthService = {
    signIn: async () => ({ ...session, token }),

    session: async (value) => {
      if (value !== token) throw new TRPCError({ code: "UNAUTHORIZED" });
      return session;
    },

    signOut: async () => ({ ok: true as const }),
  };
  const review = {
    list: async () => {
      if (denied) throw new TRPCError({ code: "FORBIDDEN" });
      return listing;
    },

    async detail() {
      throw new Error("Unexpected detail");
    },

    async receipt() {
      throw new Error("Unexpected receipt");
    },

    async decide() {
      throw new Error("Unexpected decision");
    },
  } satisfies ReviewService;
  return {
    auth,
    review,

    readReceipt: async () => Buffer.from("image"),
  };
}

function request(
  body?: unknown,
  origin = "http://localhost:3000",
  cookie = `chagok_admin=${token}`,
) {
  return new Request("http://localhost:3000/api/admin?month=2026-11", {
    method: body ? "POST" : "GET",
    headers: { origin, cookie, "content-type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("담당자 웹 인증 경계", () => {
  it("로그인은 HttpOnly Strict 쿠키만 반환하고 응답에 토큰을 노출하지 않는다", async () => {
    const response = await handleReviewRequest(
      request({ action: "signIn", idToken: "google-token" }),
      ports(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain(
      "HttpOnly; SameSite=Strict",
    );
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.text()).not.toContain(token);
  });
  it("타 출처와 Origin 없는 mutation을 차단한다", async () => {
    for (const origin of ["https://evil.example", "null", ""]) {
      const response = await handleReviewRequest(
        request({ action: "signOut" }, origin),
        ports(),
      );
      expect(response.status).toBe(403);
    }
  });
  it("미로그인과 만료 쿠키는 401이고 직원은 403이다", async () => {
    expect(
      (await handleReviewRequest(request(undefined, undefined, ""), ports()))
        .status,
    ).toBe(401);
    expect(
      (
        await handleReviewRequest(
          request(undefined, undefined, `chagok_admin=${"b".repeat(64)}`),
          ports(),
        )
      ).status,
    ).toBe(401);
    expect((await handleReviewRequest(request(), ports(true))).status).toBe(
      403,
    );
  });
  it("권한 없는 Google 로그인은 쿠키를 발급하지 않는다", async () => {
    const response = await handleReviewRequest(
      request({ action: "signIn", idToken: "google-token" }),
      ports(true),
    );
    expect(response.status).toBe(403);
    expect(response.headers.get("set-cookie")).toBeNull();
  });
  it("로그아웃은 쿠키를 지우고 잘못된 요청은 400으로 응답한다", async () => {
    const response = await handleReviewRequest(
      request({ action: "signOut" }),
      ports(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("set-cookie")).toContain("Max-Age=0");
    expect(
      (await handleReviewRequest(request({ action: "unknown" }), ports()))
        .status,
    ).toBe(400);
  });
});

it("Next 내부 URL과 브라우저 Host가 달라도 같은 출처 요청을 허용한다", async () => {
  const req = new Request("http://0.0.0.0:3000/api/admin", {
    method: "POST",
    headers: {
      host: "localhost:3000",
      origin: "http://localhost:3000",
      "content-type": "application/json",
    },
    body: JSON.stringify({ action: "signOut" }),
  });
  expect((await handleReviewRequest(req, ports())).status).toBe(200);
});
