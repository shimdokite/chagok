import { readFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";

export async function readStoredReceipt(receipt: {
  id: string;
  storageLocation: string;
  byteSize: number;
  mimeType: string;
}) {
  const id = z.uuid().parse(receipt.id);
  if (!["image/jpeg", "image/png"].includes(receipt.mimeType))
    throw new Error("Unsupported stored image");
  let bytes: Buffer;
  if (receipt.storageLocation === "local") {
    const directory = process.env.RECEIPT_LOCAL_DIR;
    if (
      !directory ||
      !isAbsolute(directory) ||
      process.env.NODE_ENV === "production"
    )
      throw new Error("Local receipts unavailable");
    bytes = await readFile(join(directory, id));
  } else {
    const project = process.env.SUPABASE_URL?.replace(/\/$/, "");
    const secret = process.env.SUPABASE_SECRET_KEY;
    if (
      !project ||
      !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(project) ||
      !secret?.startsWith("sb_secret_") ||
      receipt.storageLocation !== `${project}/receipts`
    )
      throw new Error("Unknown receipt location");
    const response = await fetch(
      `${project}/storage/v1/object/authenticated/receipts/${id}`,
      {
        headers: { apikey: secret },
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok) throw new Error("Receipt storage unavailable");
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (bytes.length !== receipt.byteSize)
    throw new Error("Receipt size mismatch");
  return bytes;
}
