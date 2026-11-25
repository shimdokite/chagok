import { mkdir, rm, writeFile } from "node:fs/promises";
import { isAbsolute, join } from "node:path";
import { z } from "zod";

export type ReceiptStorage = {
  put(key: string, bytes: Buffer, mimeType: string): Promise<void>;
  remove(key: string): Promise<void>;
};

export function localReceiptStorage(directory: string): ReceiptStorage {
  if (!isAbsolute(directory))
    throw new Error("Receipt directory must be absolute");

  function path(key: string) {
    return join(directory, z.uuid().parse(key));
  }

  return {
    async put(key, bytes) {
      await mkdir(directory, { recursive: true, mode: 0o700 });
      await writeFile(path(key), bytes, { flag: "wx", mode: 0o600 });
    },

    async remove(key) {
      await rm(path(key), { force: true });
    },
  };
}

export function configuredReceiptStorage() {
  const directory = process.env.RECEIPT_LOCAL_DIR;
  if (!directory || process.env.NODE_ENV === "production")
    throw new Error(
      "Private receipt storage is not configured for this environment",
    );
  return localReceiptStorage(directory);
}
