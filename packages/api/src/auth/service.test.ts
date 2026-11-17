import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { createAuthService, type AuthStore } from "./service";

function setup() {
  const users = new Map<string, { id: string }>();
  const sessions = new Map<string, { userId: string; expiresAt: Date }>();
  let now = Date.parse("2026-11-16T00:00:00Z");
  const store: AuthStore = {
    async createSession(sub, hash, expiresAt) {
      let user = users.get(sub);
      if (!user) {
        user = { id: `user-${users.size + 1}` };
        users.set(sub, user);
      }
      sessions.set(hash, { userId: user.id, expiresAt });
      return user;
    },

    async findSession(hash) {
      return sessions.get(hash) ?? null;
    },

    async deleteSession(hash) {
      sessions.delete(hash);
    },
  };
  const service = createAuthService({
    store,

    now: () => now,

    verifyGoogle: async (token) => {
      if (token !== "valid-google-token")
        throw new Error("secret provider detail");
      return { sub: "stable-google-sub" };
    },
  });
  return {
    service,
    users,
    sessions,

    advance: (ms: number) => {
      now += ms;
    },
  };
}

describe("authentication service", () => {
  it("reuses a Google subject and stores only hashes of distinct random sessions", async () => {
    const { service, users, sessions } = setup();
    const [a, b] = await Promise.all([
      service.signIn("valid-google-token"),
      service.signIn("valid-google-token"),
    ]);
    expect(users.size).toBe(1);
    expect(a.user.id).toBe(b.user.id);
    expect(a.token).not.toBe(b.token);
    expect(a.token).toMatch(/^[a-f0-9]{64}$/);
    expect(sessions.has(a.token)).toBe(false);
    expect(
      sessions.has(createHash("sha256").update(a.token).digest("hex")),
    ).toBe(true);
    expect(a.expiresAt).toBe("2026-11-23T00:00:00.000Z");
    expect(await service.session(a.token)).toEqual({
      user: { id: a.user.id },
      expiresAt: a.expiresAt,
    });
  });
  it("rejects invalid Google credentials without creating users or leaking provider errors", async () => {
    const { service, users, sessions } = setup();
    await expect(service.signIn("invalid")).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "인증 정보를 확인할 수 없어요.",
    });
    expect(users.size).toBe(0);
    expect(sessions.size).toBe(0);
  });
  it("rejects missing, malformed, and unknown bearer tokens", async () => {
    const { service } = setup();
    for (const token of [undefined, "", "wrong", "a".repeat(64)])
      await expect(service.session(token)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
  });
  it("rejects the exact expiry boundary and never extends the lifetime", async () => {
    const { service, advance } = setup();
    const a = await service.signIn("valid-google-token");
    advance(7 * 86400000 - 1);
    expect((await service.session(a.token)).expiresAt).toBe(a.expiresAt);
    advance(1);
    await expect(service.session(a.token)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });
  it("revokes only the current session and allows repeated logout", async () => {
    const { service } = setup();
    const a = await service.signIn("valid-google-token");
    const b = await service.signIn("valid-google-token");
    await service.signOut(a.token);
    await service.signOut(a.token);
    await expect(service.session(a.token)).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    expect((await service.session(b.token)).user.id).toBe(b.user.id);
  });
});
