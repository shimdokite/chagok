import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { getDb, prismaAuthStore } from "../auth/store";
import { createAuthService } from "../auth/service";
import { assertLocalDatabase } from "../benefits/seed";
import { createClaim } from "../benefits/create-claim";
import { createReceiptService } from "./service";
import { localReceiptStorage } from "./storage";
import { handleReceiptUpload } from "./http";

describe.skipIf(!process.env.CHAGOK_TEST_DATABASE_URL)(
  "private receipt storage and claim ownership",
  () => {
    let db: ReturnType<typeof getDb>;
    let dir: string;
    let prefix: string;
    let companyId: string;
    let userId: string;
    let otherId: string;
    let auth: ReturnType<typeof createAuthService>;
    let token: string;
    let service: ReturnType<typeof createReceiptService>;
    let bytes: Buffer;

    function input(attachmentId?: string) {
      return {
        requestId: randomUUID(),
        title: "영수증 테스트",
        category: "식비",
        amount: 100,
        usedOn: "2026-11-20",
        attachmentId,
      };
    }

    function request(
      body: Uint8Array = new Uint8Array(bytes),
      bearer = token,
      company = companyId,
    ) {
      return new Request("http://localhost/api/receipts", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${bearer}`,
          "Content-Type": "image/png",
          "X-Chagok-Company": company,
        },
        body: body as BodyInit,
      });
    }

    beforeAll(async () => {
      assertLocalDatabase(process.env.CHAGOK_TEST_DATABASE_URL);
      process.env.DATABASE_URL = process.env.CHAGOK_TEST_DATABASE_URL;
      db = getDb();
      bytes = await sharp({
        create: { width: 16, height: 16, channels: 3, background: "white" },
      })
        .png()
        .toBuffer();
    });
    beforeEach(async () => {
      prefix = `day05-${randomUUID()}`;
      dir = await mkdtemp(join(tmpdir(), "chagok-receipts-"));
      auth = createAuthService({
        store: prismaAuthStore(db),

        verifyGoogle: async (sub) => ({ sub: `${prefix}-${sub}` }),
      });
      const a = await auth.signIn("a");
      const b = await auth.signIn("b");
      token = a.token;
      userId = a.user.id;
      otherId = b.user.id;
      const company = await db.company.create({
        data: {
          slug: prefix,
          name: "첨부 검증 회사",
          memberships: { create: [{ userId }, { userId: otherId }] },
          policies: {
            create: {
              month: "2026-11",
              allowance: 1000,
              categories: ["식비"],
              guidance: "test",
            },
          },
        },
      });
      companyId = company.id;
      service = createReceiptService(db, localReceiptStorage(dir));
    });
    afterEach(async () => {
      await db.claim.deleteMany({ where: { companyId } });
      await db.attachment.deleteMany({ where: { companyId } });
      await db.user.deleteMany({
        where: { googleSub: { startsWith: prefix } },
      });
      await db.company.deleteMany({ where: { id: companyId } });
      await rm(dir, { recursive: true, force: true });
    });
    afterAll(async () => {
      await db?.$disconnect();
    });

    it("authenticates before reading, rejects company changes, and returns only public metadata", async () => {
      const ports = { auth, service };
      expect(
        (await handleReceiptUpload(request(bytes, "invalid"), ports)).status,
      ).toBe(401);
      expect(
        (
          await handleReceiptUpload(
            request(bytes, token, "other-company"),
            ports,
          )
        ).status,
      ).toBe(403);
      expect(await db.attachment.count({ where: { companyId } })).toBe(0);
      const response = await handleReceiptUpload(request(), ports);
      expect(response.status).toBe(201);
      const result = await response.json();
      expect(Object.keys(result).sort()).toEqual([
        "attachmentId",
        "byteSize",
        "mimeType",
      ]);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await readFile(join(dir, result.attachmentId))).toEqual(bytes);
      const row = await db.attachment.findUniqueOrThrow({
        where: { id: result.attachmentId },
      });
      expect(row).toMatchObject({ userId, companyId, state: "READY" });
      await expect(
        localReceiptStorage(dir).put(result.attachmentId, bytes, "image/png"),
      ).rejects.toBeDefined();
    });
    it("rejects a genuinely expired database session before creating an attachment", async () => {
      await db.session.updateMany({
        where: { userId },
        data: { expiresAt: new Date("2000-01-01T00:00:00Z") },
      });
      const response = await handleReceiptUpload(request(), { auth, service });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ code: "UNAUTHORIZED" });
      expect(await db.attachment.count({ where: { userId } })).toBe(0);
      expect(await readdir(dir)).toEqual([]);
    });
    it.each(["before", "during body"])(
      "rejects a real membership change %s upload",
      async (timing) => {
        const next = await db.company.create({
          data: { slug: `${prefix}-next`, name: "다음 검증 회사" },
        });
        let authenticated = false;
        const observedAuth = {
          ...auth,

          async session(bearer: string) {
            const result = await auth.session(bearer);
            authenticated = true;
            return result;
          },
        };

        const move = () =>
          db.membership.update({
            where: { userId },
            data: { companyId: next.id },
          });

        try {
          let upload: Request;
          if (timing === "before") {
            await move();
            upload = request();
          } else {
            // highWaterMark=0 delays the mutation until the authenticated
            // handler actually consumes the body, before the service recheck.
            const body = new ReadableStream<Uint8Array>(
              {
                async pull(controller) {
                  expect(authenticated).toBe(true);
                  await move();
                  controller.enqueue(new Uint8Array(bytes));
                  controller.close();
                },
              },
              { highWaterMark: 0 },
            );
            upload = new Request(request(), {
              body,
              duplex: "half",
            } as RequestInit);
          }
          const response = await handleReceiptUpload(upload, {
            auth: observedAuth,
            service,
          });
          expect(response.status).toBe(403);
          expect(await response.json()).toEqual({ code: "FORBIDDEN" });
          expect((await auth.session(token)).user.companyId).toBe(next.id);
          expect(await db.attachment.count({ where: { userId } })).toBe(0);
          expect(await readdir(dir)).toEqual([]);
        } finally {
          await db.membership.update({
            where: { userId },
            data: { companyId },
          });
          await db.company.delete({ where: { id: next.id } });
        }
      },
    );
    it("links once, returns an identical retry, and rejects changed or foreign attachments", async () => {
      const receipt = await service.upload(
        userId,
        companyId,
        bytes,
        "image/png",
      );
      await expect(
        createClaim(db, otherId, input(receipt.attachmentId)),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      const request = input(receipt.attachmentId);
      const result = await createClaim(db, userId, request);
      expect(await createClaim(db, userId, request)).toEqual(result);
      await expect(
        createClaim(db, userId, { ...request, attachmentId: undefined }),
      ).rejects.toMatchObject({ code: "CONFLICT" });
      await expect(
        createClaim(db, userId, input(receipt.attachmentId)),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(await db.claim.count({ where: { companyId } })).toBe(1);
      expect(
        await db.attachment.findUnique({ where: { id: receipt.attachmentId } }),
      ).toMatchObject({ state: "LINKED" });
    });
    it("rejects foreign company, unfinished, missing and expired attachments", async () => {
      for (const change of [
        { companyId: "foreign" },
        { state: "PENDING" as const },
        { createdAt: new Date(0) },
      ]) {
        const receipt = await service.upload(
          userId,
          companyId,
          bytes,
          "image/png",
        );
        await db.attachment.update({
          where: { id: receipt.attachmentId },
          data: change,
        });
        await expect(
          createClaim(db, userId, input(receipt.attachmentId)),
        ).rejects.toMatchObject({ code: "BAD_REQUEST" });
        await db.attachment.update({
          where: { id: receipt.attachmentId },
          data: { companyId },
        });
      }
      await expect(
        createClaim(db, userId, input(randomUUID())),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    });
    it("serializes two claims for the same attachment", async () => {
      const receipt = await service.upload(
        userId,
        companyId,
        bytes,
        "image/png",
      );
      const results = await Promise.allSettled([
        createClaim(db, userId, input(receipt.attachmentId)),
        createClaim(db, userId, input(receipt.attachmentId)),
      ]);
      expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await db.claim.count({ where: { companyId } })).toBe(1);
    });
    it("records the storage location and cleans only objects in the selected store", async () => {
      const otherStorage = {
        ...localReceiptStorage(dir),
        location: "https://fixture.supabase.co/receipts",
      };
      const remote = createReceiptService(db, otherStorage);
      const localFile = await service.upload(
        userId,
        companyId,
        bytes,
        "image/png",
      );
      const remoteFile = await remote.upload(
        userId,
        companyId,
        bytes,
        "image/png",
      );
      expect(
        await db.attachment.findUnique({
          where: { id: remoteFile.attachmentId },
        }),
      ).toMatchObject({ storageLocation: otherStorage.location });
      const ids = [localFile.attachmentId, remoteFile.attachmentId];
      const future = new Date(Date.now() + 86400001);
      expect(await remote.cleanup(future, ids)).toEqual({
        deleted: 1,
        failed: 0,
      });
      expect(await readdir(dir)).toEqual([localFile.attachmentId]);
      expect(await service.cleanup(future, ids)).toEqual({
        deleted: 1,
        failed: 0,
      });
    });

    it("cleans at 24h, preserves linked and younger files, and retries failed deletion", async () => {
      const old = await service.upload(userId, companyId, bytes, "image/png");
      const young = await service.upload(userId, companyId, bytes, "image/png");
      const linked = await service.upload(
        userId,
        companyId,
        bytes,
        "image/png",
      );
      await createClaim(db, userId, input(linked.attachmentId));
      const now = new Date();
      const cutoff = new Date(now.getTime() - 86400000);
      await db.attachment.updateMany({
        where: { id: { in: [old.attachmentId, linked.attachmentId] } },
        data: { createdAt: cutoff },
      });
      const broken = createReceiptService(db, {
        ...localReceiptStorage(dir),

        remove: async () => {
          throw new Error("storage offline");
        },
      });
      expect(
        await broken.cleanup(now, [
          old.attachmentId,
          linked.attachmentId,
          young.attachmentId,
        ]),
      ).toMatchObject({
        deleted: 0,
        failed: 1,
      });
      expect(
        await service.cleanup(now, [
          old.attachmentId,
          linked.attachmentId,
          young.attachmentId,
        ]),
      ).toMatchObject({
        deleted: 1,
        failed: 0,
      });
      expect((await readdir(dir)).sort()).toEqual(
        [young.attachmentId, linked.attachmentId].sort(),
      );
    });
    it("tracks partial storage failures for cleanup instead of completing the attachment", async () => {
      const storage = localReceiptStorage(dir);
      const broken = createReceiptService(db, {
        ...storage,

        put: async (key, data) => {
          await storage.put(key, data, "image/png");
          throw new Error("lost write response");
        },
      });
      await expect(
        broken.upload(userId, companyId, bytes, "image/png"),
      ).rejects.toBeDefined();
      const row = await db.attachment.findFirstOrThrow({
        where: { companyId },
      });
      expect(row.state).toBe("PENDING");
      await expect(
        createClaim(db, userId, input(row.id)),
      ).rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(
        await service.cleanup(new Date(Date.now() + 86400001), [row.id]),
      ).toEqual({
        deleted: 1,
        failed: 0,
      });
      expect(await readdir(dir)).toEqual([]);
    });
    it("cleanup and a claim never delete a linked object", async () => {
      const receipt = await service.upload(
        userId,
        companyId,
        bytes,
        "image/png",
      );
      const future = new Date(Date.now() + 86400001);
      const [claim] = await Promise.allSettled([
        createClaim(db, userId, input(receipt.attachmentId)),
        service.cleanup(future, [receipt.attachmentId]),
      ]);
      if (claim.status === "fulfilled") {
        expect(await readFile(join(dir, receipt.attachmentId))).toEqual(bytes);
        expect(
          await db.attachment.findUnique({
            where: { id: receipt.attachmentId },
          }),
        ).toMatchObject({ state: "LINKED" });
      } else {
        expect(await db.claim.count({ where: { companyId } })).toBe(0);
      }
    });
  },
);
