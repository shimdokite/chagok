import {
  uploadedReceiptSchema,
  type ReceiptMetadata,
} from "@chagok/contracts/receipts";

type Ports = {
  origin: string;
  token(): Promise<string | null>;
  fetch(url: string, options: RequestInit): Promise<Response>;
};

export async function uploadReceipt(
  body: BodyInit,
  metadata: ReceiptMetadata,
  companyId: string,
  signal: AbortSignal,
  ports: Ports,
) {
  signal.throwIfAborted();
  const token = await ports.token();
  signal.throwIfAborted();
  if (!token) throw { code: "UNAUTHORIZED" };
  const response = await ports.fetch(`${ports.origin}/api/receipts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": metadata.mimeType,
      "X-Chagok-Company": companyId,
    },
    body,
    signal: AbortSignal.any([signal, AbortSignal.timeout(35_000)]),
  });
  signal.throwIfAborted();
  if (response.status === 401) throw { code: "UNAUTHORIZED" };
  if (response.status === 403) throw { code: "FORBIDDEN" };
  if (response.status === 413) throw { code: "TOO_LARGE" };
  if (!response.ok) throw { code: "UPLOAD_FAILED" };
  const receipt = uploadedReceiptSchema.parse(await response.json());
  if (
    receipt.byteSize !== metadata.byteSize ||
    receipt.mimeType !== metadata.mimeType
  )
    throw { code: "UPLOAD_FAILED" };
  return receipt;
}
