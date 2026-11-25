import { describe, expect, it } from "vitest";
import { crc32 } from "node:zlib";
import sharp from "sharp";
import { validateImage } from "./image";
import { readReceiptBody } from "./body";
import { MAX_RECEIPT_BYTES } from "@chagok/contracts/receipts";

describe("receipt bytes", () => {
  it.each(["jpeg", "png"] as const)(
    "decodes real %s without changing bytes",
    async (format) => {
      const bytes = await sharp({
        create: { width: 8, height: 8, channels: 3, background: "white" },
      })
        [format]()
        .toBuffer();
      expect(await validateImage(bytes, `image/${format}`)).toEqual({
        mimeType: `image/${format}`,
        byteSize: bytes.length,
      });
    },
  );
  it("rejects forged MIME, truncated data, empty bytes and excessive pixels", async () => {
    const png = await sharp({
      create: { width: 8, height: 8, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    const huge = await sharp({
      create: { width: 5000, height: 5000, channels: 3, background: "white" },
    })
      .png()
      .toBuffer();
    for (const [bytes, mime] of [
      [png, "image/jpeg"],
      [png.subarray(0, 40), "image/png"],
      [Buffer.alloc(0), "image/png"],
      [huge, "image/png"],
    ] as const)
      await expect(validateImage(bytes, mime)).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
  });
  it("bounds streams without trusting Content-Length", async () => {
    const request = new Request("http://localhost", {
      method: "POST",
      body: new Uint8Array(MAX_RECEIPT_BYTES + 1),
    });
    await expect(readReceiptBody(request)).rejects.toMatchObject({
      code: "PAYLOAD_TOO_LARGE",
    });
    const ok = new Request("http://localhost", {
      method: "POST",
      body: new Uint8Array([1, 2]),
    });
    expect(await readReceiptBody(ok)).toEqual(Buffer.from([1, 2]));
  });
  it("rejects a broken stream and an aborted request", async () => {
    const broken = new ReadableStream({
      start(controller) {
        controller.error(new Error("broken"));
      },
    });
    const request = new Request("http://localhost", {
      method: "POST",
      body: broken,
      duplex: "half",
    } as RequestInit);
    await expect(readReceiptBody(request)).rejects.toBeDefined();
    const controller = new AbortController();
    controller.abort();
    await expect(
      readReceiptBody(
        new Request("http://localhost", {
          method: "POST",
          body: "x",
          signal: controller.signal,
        }),
      ),
    ).rejects.toBeDefined();
  });
});

it("rejects a valid animated PNG instead of inspecting only its default frame", async () => {
  const png = await sharp({
    create: { width: 1, height: 1, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();

  function chunk(type: string, data: Buffer) {
    const body = Buffer.concat([Buffer.from(type), data]);
    const size = Buffer.alloc(4);
    size.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([size, body, crc]);
  }

  const idat: Buffer[] = [];
  for (let offset = 8; offset + 12 <= png.length;) {
    const size = png.readUInt32BE(offset);
    if (png.toString("ascii", offset + 4, offset + 8) === "IDAT")
      idat.push(png.subarray(offset + 8, offset + 8 + size));
    offset += size + 12;
  }
  const control = Buffer.alloc(8);
  control.writeUInt32BE(2);
  const frame = Buffer.alloc(26);
  frame.writeUInt32BE(1, 4);
  frame.writeUInt32BE(1, 8);
  frame.writeUInt16BE(1, 20);
  frame.writeUInt16BE(10, 22);
  const frame2 = Buffer.from(frame);
  frame2.writeUInt32BE(1);
  const sequence = Buffer.alloc(4);
  sequence.writeUInt32BE(2);
  const animated = Buffer.concat([
    png.subarray(0, 33),
    chunk("acTL", control),
    chunk("fcTL", frame),
    chunk("IDAT", Buffer.concat(idat)),
    chunk("fcTL", frame2),
    chunk("fdAT", Buffer.concat([sequence, ...idat])),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  await expect(validateImage(animated, "image/png")).rejects.toMatchObject({
    code: "BAD_REQUEST",
  });
});
