import {
  createApiContext,
  getDb,
  createReviewService,
  handleReviewRequest,
  readStoredReceipt,
} from "@chagok/api";

export const runtime = "nodejs";

async function handler(request: Request) {
  try {
    return await handleReviewRequest(request, {
      auth: createApiContext(request).getAuth(),
      review: createReviewService(getDb()),
      readReceipt: readStoredReceipt,
    });
  } catch {
    return Response.json(
      {
        code: "SERVICE_UNAVAILABLE",
        message: "서버에 연결할 수 없어요. 잠시 후 다시 시도해 주세요.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export { handler as GET, handler as POST };
