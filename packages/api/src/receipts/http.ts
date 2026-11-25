import { TRPCError } from "@trpc/server";
import type { AuthService } from "../auth/service";
import type { createReceiptService } from "./service";
import { readReceiptBody } from "./body";

type Ports = {
  auth: AuthService;
  service: ReturnType<typeof createReceiptService>;
};

export async function handleReceiptUpload(request: Request, ports: Ports) {
  const headers = { "Cache-Control": "no-store" };
  try {
    const token = request.headers
      .get("authorization")
      ?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
    if (!token) throw new TRPCError({ code: "UNAUTHORIZED" });
    const session = await ports.auth.session(token);
    const companyId = request.headers.get("x-chagok-company");
    if (!companyId || companyId !== session.user.companyId)
      throw new TRPCError({ code: "FORBIDDEN" });
    const bytes = await readReceiptBody(request);
    const receipt = await ports.service.upload(
      session.user.id,
      companyId,
      bytes,
      request.headers.get("content-type"),
    );
    return Response.json(receipt, { status: 201, headers });
  } catch (error) {
    const code =
      error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR";
    const statuses: Record<string, number> = {
      UNAUTHORIZED: 401,
      FORBIDDEN: 403,
      BAD_REQUEST: 400,
      PAYLOAD_TOO_LARGE: 413,
      CONFLICT: 409,
    };
    return Response.json({ code }, { status: statuses[code] ?? 500, headers });
  }
}
