import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  currentMonth,
  historyInput,
  reviewDecisionInput,
} from "@chagok/contracts/benefits";
import type { AuthService } from "../auth/service";
import type { ReviewService } from "./service";

const idInput = z.string().min(1).max(100);
const postInput = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("signIn"),
      idToken: z.string().min(1).max(8192),
    })
    .strict(),
  z.object({ action: z.literal("signOut") }).strict(),
  z
    .object({ action: z.literal("decide"), input: reviewDecisionInput })
    .strict(),
]);
type Ports = {
  auth: AuthService;
  review: ReviewService;
  readReceipt: (
    receipt: Awaited<ReturnType<ReviewService["receipt"]>>,
  ) => Promise<Buffer>;
};

function cookie(value: string, age: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `chagok_admin=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${secure}`;
}

export async function handleReviewRequest(request: Request, ports: Ports) {
  const headers = new Headers({
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  const token = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)chagok_admin=([a-f0-9]{64})(?:;|$)/)?.[1];
  try {
    const url = new URL(request.url);
    if (request.method === "POST") {
      // Next may normalize request.url to its bind address (0.0.0.0).
      // Host is the browser-facing authority; never trust forwarded-host here.
      const protocol =
        process.env.NODE_ENV === "production" ? "https:" : url.protocol;
      const expectedOrigin =
        process.env.ADMIN_ORIGIN ||
        `${protocol}//${request.headers.get("host") ?? url.host}`;
      if (request.headers.get("origin") !== expectedOrigin)
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "이 화면에서 다시 시도해 주세요.",
        });
      const input = postInput.parse(await request.json());
      if (input.action === "signIn") {
        const session = await ports.auth.signIn(input.idToken);
        try {
          await ports.review.list(session.user.id, {
            month: currentMonth(),
            limit: 1,
          });
        } catch (error) {
          await ports.auth.signOut(session.token);
          throw error;
        }
        if (token && token !== session.token) await ports.auth.signOut(token);
        headers.set(
          "Set-Cookie",
          cookie(
            session.token,
            Math.max(
              0,
              Math.floor((Date.parse(session.expiresAt) - Date.now()) / 1000),
            ),
          ),
        );
        return Response.json({ ok: true }, { headers });
      }
      if (input.action === "signOut") {
        if (token) await ports.auth.signOut(token);
        headers.set("Set-Cookie", cookie("", 0));
        return Response.json({ ok: true }, { headers });
      }
      const session = await ports.auth.session(token);
      const claim = await ports.review.decide(session.user.id, input.input);
      return Response.json({ claim }, { headers });
    }
    if (request.method !== "GET")
      return new Response(null, { status: 405, headers });
    const session = await ports.auth.session(token);
    const id = url.searchParams.get("id");
    if (id !== null) {
      idInput.parse(id);
      if (url.searchParams.get("receipt") === "1") {
        const receipt = await ports.review.receipt(session.user.id, id);
        const bytes = await ports.readReceipt(receipt);
        headers.set("Content-Type", receipt.mimeType);
        headers.set("Content-Disposition", 'inline; filename="receipt"');
        return new Response(new Uint8Array(bytes), { headers });
      }
      return Response.json(await ports.review.detail(session.user.id, id), {
        headers,
      });
    }
    const cursor = url.searchParams.get("cursor");
    const input = historyInput.parse({
      month: url.searchParams.get("month") ?? currentMonth(),
      status: url.searchParams.get("status") ?? undefined,
      cursor: cursor ? JSON.parse(cursor) : undefined,
    });
    return Response.json(await ports.review.list(session.user.id, input), {
      headers,
    });
  } catch (error) {
    let code = "INTERNAL_SERVER_ERROR";
    let message = "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.";
    if (error instanceof TRPCError) {
      code = error.code;
      if (code !== "INTERNAL_SERVER_ERROR") message = error.message;
    } else if (error instanceof z.ZodError || error instanceof SyntaxError) {
      code = "BAD_REQUEST";
      message = "입력 내용을 확인해 주세요.";
    }
    const statuses: Record<string, number> = {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      BAD_REQUEST: 400,
      CONFLICT: 409,
    };
    if (code === "UNAUTHORIZED") headers.set("Set-Cookie", cookie("", 0));
    return Response.json(
      { code, message },
      { status: statuses[code] ?? 500, headers },
    );
  }
}
