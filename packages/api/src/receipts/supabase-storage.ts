import { z } from "zod";
import type { ReceiptStorage } from "./storage";

export function supabaseReceiptStorage(): ReceiptStorage {
  const project = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const secret = process.env.SUPABASE_SECRET_KEY;
  if (
    !project ||
    !/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(project) ||
    !secret?.startsWith("sb_secret_")
  )
    throw new Error(
      "Supabase receipt storage needs a project URL and server secret",
    );

  async function request(path: string, options: RequestInit) {
    const headers = new Headers(options.headers);
    headers.set("apikey", secret!);
    const response = await fetch(`${project}/storage/v1/${path}`, {
      ...options,
      headers,
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok)
      throw new Error(`Supabase receipt storage HTTP ${response.status}`);
    return response;
  }

  return {
    location: `${project}/receipts`,

    async put(key, bytes, mimeType) {
      z.uuid().parse(key);
      const signal = AbortSignal.timeout(20_000);
      const bucket = await (
        await request("bucket/receipts", { signal })
      ).json();
      if (bucket.id !== "receipts" || bucket.public !== false)
        throw new Error("The receipts bucket must be private");

      const response = await request(`object/receipts/${key}`, {
        method: "POST",
        headers: { "content-type": mimeType, "x-upsert": "false" },
        body: new Uint8Array(bytes),
        signal,
      });
      const saved = await response.json();
      if (saved.Key !== `receipts/${key}`)
        throw new Error("Unexpected stored receipt key");
    },

    async remove(key) {
      z.uuid().parse(key);
      const response = await request("object/receipts", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ prefixes: [key] }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!Array.isArray(await response.json()))
        throw new Error("Unexpected receipt deletion response");
    },
  };
}
