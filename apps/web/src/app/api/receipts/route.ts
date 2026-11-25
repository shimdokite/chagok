import {
  configuredReceiptStorage,
  createApiContext,
  createReceiptService,
  getDb,
  handleReceiptUpload,
} from "@chagok/api";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    return await handleReceiptUpload(request, {
      auth: createApiContext(request).getAuth(),
      service: createReceiptService(getDb(), configuredReceiptStorage()),
    });
  } catch {
    return Response.json(
      { code: "SERVICE_UNAVAILABLE" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
