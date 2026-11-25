import { describe, expect, it } from "vitest";
import { applyMessageUrl } from "./message-source";

const origin = "http://localhost:3000";
const documentUrl = `${origin}/apply`;

describe("message source and active apply document", () => {
  it.each([
    ["android", origin],
    ["android", `${origin}/`],
    ["android", documentUrl],
    ["ios", documentUrl],
  ])(
    "accepts %s source %s only in the loaded apply document",
    (platform, source) => {
      expect(applyMessageUrl(source, documentUrl, origin, platform)).toBe(
        documentUrl,
      );
    },
  );
  it.each([
    "https://untrusted.test",
    "http://localhost:3001",
    `${origin}/other`,
    `${origin}/apply?next=1`,
    `${origin}/apply#fragment`,
    "http://user:pass@localhost:3000",
    "null",
    "about:blank",
    "javascript:alert(1)",
    "",
  ])("rejects untrusted or non-apply source %s", (source) => {
    expect(applyMessageUrl(source, documentUrl, origin, "android")).toBeNull();
  });
  it.each([
    null,
    `${origin}/other`,
    "https://untrusted.test/apply",
    `${origin}/apply?next=1`,
  ])(
    "rejects even a matching source if the active document is %s",
    (current) => {
      expect(applyMessageUrl(origin, current, origin, "android")).toBeNull();
      expect(applyMessageUrl(documentUrl, current, origin, "ios")).toBeNull();
    },
  );
  it("does not extend the Android origin exception to iOS", () => {
    expect(applyMessageUrl(origin, documentUrl, origin, "ios")).toBeNull();
  });
});
