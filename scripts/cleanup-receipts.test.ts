import { expect, it } from "vitest";
import { spawnSync } from "node:child_process";
import { mkdtempSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

it("refuses a remote database before starting local receipt cleanup", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--experimental-transform-types",
      "packages/api/scripts/cleanup-receipts.mjs",
    ],
    {
      env: {
        ...process.env,
        NODE_ENV: "development",
        DATABASE_URL: "postgresql://test:test@invalid.invalid/chagok",
        RECEIPT_LOCAL_DIR: "/tmp/chagok-no-remote-cleanup",
      },
      encoding: "utf8",
      timeout: 15000,
    },
  );
  expect(result.status).toBe(1);
  expect(result.stderr).toContain("dedicated local chagok database");
  expect(result.stderr).not.toContain("getaddrinfo");
});

it("returns an uncached 503 from the real upload route with production local storage", () => {
  const directory = mkdtempSync(join(tmpdir(), "chagok-production-storage-"));
  const storage = join(directory, "receipts");
  try {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-transform-types",
        "--input-type=module",
        "-e",
        `
        import { registerHooks } from "node:module";
        registerHooks({
          resolve(specifier, context, next) {
            try { return next(specifier, context); }
            catch (error) {
              if (error.code !== "ERR_MODULE_NOT_FOUND" || !specifier.startsWith(".")) throw error;
              return next(specifier + ".ts", context);
            }
          }
        });
        const { configuredReceiptStorage } = await import("./packages/api/src/receipts/storage.ts");
        let rejected = false;
        try { configuredReceiptStorage(); } catch { rejected = true; }
        const { POST } = await import("./apps/web/src/app/api/receipts/route.ts");
        const response = await POST(new Request("http://localhost/api/receipts", {
          method: "POST", headers: { "Content-Type": "image/png" }, body: "test"
        }));
        console.log(JSON.stringify({
          rejected, status: response.status, cache: response.headers.get("cache-control"),
          body: await response.json()
        }));
      `,
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: "production",
          DATABASE_URL: "postgresql://test:test@127.0.0.1:1/chagok",
          RECEIPT_LOCAL_DIR: storage,
        },
        encoding: "utf8",
        timeout: 15000,
      },
    );
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout)).toEqual({
      rejected: true,
      status: 503,
      cache: "no-store",
      body: { code: "SERVICE_UNAVAILABLE" },
    });
    expect(existsSync(storage)).toBe(false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

it.each([
  {
    name: "production",
    mode: "production",
    directory: "/tmp/chagok-denied-cleanup",
  },
  { name: "missing storage", mode: "development", directory: "" },
])(
  "refuses $name cleanup before accessing the database",
  ({ mode, directory }) => {
    const result = spawnSync(
      process.execPath,
      [
        "--experimental-transform-types",
        "packages/api/scripts/cleanup-receipts.mjs",
      ],
      {
        env: {
          ...process.env,
          NODE_ENV: mode,
          DATABASE_URL: "postgresql://test:test@127.0.0.1:1/chagok",
          RECEIPT_LOCAL_DIR: directory,
        },
        encoding: "utf8",
        timeout: 15000,
      },
    );
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(
      "Private receipt storage is not configured for this environment",
    );
    expect(result.stderr).not.toContain("ECONNREFUSED");
  },
);
