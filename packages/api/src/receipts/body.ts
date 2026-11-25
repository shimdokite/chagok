import { TRPCError } from "@trpc/server";
import { MAX_RECEIPT_BYTES } from "@chagok/contracts/receipts";

export async function readReceiptBody(request: Request) {
  const signal = AbortSignal.any([request.signal, AbortSignal.timeout(30_000)]);
  signal.throwIfAborted();
  if (Number(request.headers.get("content-length")) > MAX_RECEIPT_BYTES)
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" });
  if (!request.body) throw new TRPCError({ code: "BAD_REQUEST" });
  const reader = request.body.getReader();

  const cancel = () => {
    void reader.cancel().catch(() => undefined);
  };

  signal.addEventListener("abort", cancel, { once: true });
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      signal.throwIfAborted();
      if (chunk.done) break;
      size += chunk.value.byteLength;
      if (size > MAX_RECEIPT_BYTES)
        throw new TRPCError({ code: "PAYLOAD_TOO_LARGE" });
      chunks.push(chunk.value);
    }
    if (!size) throw new TRPCError({ code: "BAD_REQUEST" });
    return Buffer.concat(chunks, size);
  } finally {
    signal.removeEventListener("abort", cancel);
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}
