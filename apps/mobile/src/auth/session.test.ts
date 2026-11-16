import { expect, it, vi } from "vitest";
import { SessionController, type SessionPorts } from "./session";
const response = {
  token: "a".repeat(64),
  user: { id: "user-1" },
  expiresAt: "2026-11-23T00:00:00Z",
};
function fixture(overrides: Partial<SessionPorts> = {}) {
  let stored: string | null = response.token;
  const metrics: unknown[] = [];
  const ports: SessionPorts = {
    storage: {
      get: async () => stored,
      set: async (v) => {
        stored = v;
      },
      remove: async () => {
        stored = null;
      },
    },
    api: {
      signIn: async () => response,
      session: async () => ({
        user: response.user,
        expiresAt: response.expiresAt,
      }),
      signOut: async () => {},
    },
    google: {
      signIn: async () => ({ type: "success", idToken: "google-token" }),
      signOut: async () => {},
    },
    now: () => 100,
    wallNow: () => Date.parse("2026-11-16T00:00:00Z"),
    onMeasurement: (m) => {
      metrics.push(m);
    },
    ...overrides,
  };
  return {
    controller: new SessionController(ports),
    ports,
    metrics,
    stored: () => stored,
  };
}
it("restores only after server validation and records anonymous duration", async () => {
  const { controller, metrics } = fixture();
  await controller.restore("startup");
  expect(controller.state.status).toBe("authenticated");
  expect(metrics).toEqual([
    expect.objectContaining({
      status: "success",
      durationMs: 0,
      trigger: "startup",
    }),
  ]);
  expect(JSON.stringify(metrics)).not.toContain(response.token);
  expect(JSON.stringify(metrics)).not.toContain("user-1");
});
it("clears rejected sessions but keeps network failures for retry", async () => {
  for (const code of ["UNAUTHORIZED", "NETWORK"]) {
    const { controller, stored } = fixture({
      api: {
        signIn: async () => response,
        session: async () => {
          throw { code };
        },
        signOut: async () => {},
      },
    });
    await controller.restore("startup");
    expect(controller.state.status).toBe(
      code === "UNAUTHORIZED" ? "signedOut" : "error",
    );
    expect(stored()).toBe(code === "UNAUTHORIZED" ? null : response.token);
  }
});
it("leaves cancellation signed out and never exchanges a token", async () => {
  const signIn = vi.fn();
  const { controller, ports } = fixture({
    google: {
      signIn: async () => ({ type: "cancelled" }),
      signOut: async () => {},
    },
  });
  await ports.storage.remove();
  ports.api.signIn = signIn;
  await controller.signIn();
  expect(controller.state.status).toBe("signedOut");
  expect(signIn).not.toHaveBeenCalled();
});
it("does not authenticate when secure storage fails", async () => {
  const { controller, ports } = fixture();
  await ports.storage.remove();
  ports.storage.set = async () => {
    throw new Error("disk");
  };
  await controller.signIn();
  expect(controller.state.status).toBe("error");
});
it("logout invalidates an in-flight restore and clears storage after server revocation", async () => {
  let complete!: (v: Omit<typeof response, "token">) => void;
  const { controller, ports, stored, metrics } = fixture();
  ports.api.session = () =>
    new Promise((resolve) => {
      complete = resolve;
    });
  const restoring = controller.restore("startup");
  await Promise.resolve();
  const logout = controller.signOut();
  complete(response);
  await restoring;
  await logout;
  expect(controller.state.status).toBe("signedOut");
  expect(stored()).toBeNull();
  expect(metrics).toEqual([expect.objectContaining({ status: "cancelled" })]);
});
it("does not claim server logout on network failure and can retry", async () => {
  const { controller, ports, stored } = fixture();
  ports.api.signOut = async () => {
    throw new Error("offline");
  };
  await controller.signOut();
  expect(controller.state.status).toBe("error");
  expect(stored()).toBe(response.token);
  ports.api.signOut = async () => {};
  await controller.signOut();
  expect(stored()).toBeNull();
});
it("preserves failed logout across foreground and demo attempts until revocation succeeds", async () => {
  const { controller, ports, stored, metrics } = fixture();
  await controller.restore("startup");
  ports.api.signOut = async () => {
    throw new Error("offline");
  };
  await controller.signOut();
  const failedLogout = controller.state;
  expect(failedLogout.retry).toBe("signOut");
  await controller.restore("foreground");
  expect(controller.state).toEqual(failedLogout);
  controller.enterDemo();
  expect(controller.state).toEqual(failedLogout);
  expect(stored()).toBe(response.token);
  expect(metrics).toHaveLength(1);
  ports.api.signOut = async () => {};
  await controller.signOut();
  expect(controller.state.status).toBe("signedOut");
  expect(stored()).toBeNull();
  controller.enterDemo();
  expect(controller.state.status).toBe("demo");
});
it("blocks duplicate login attempts", async () => {
  let finish!: (v: { type: "cancelled" }) => void;
  let calls = 0;
  const { controller } = fixture({
    google: {
      signIn: () => {
        calls++;
        return new Promise((r) => {
          finish = r;
        });
      },
      signOut: async () => {},
    },
  });
  const pending = controller.signIn();
  const duplicate = controller.signIn();
  expect(calls).toBe(1);
  finish({ type: "cancelled" });
  await Promise.all([pending, duplicate]);
});
it("never restores an expired server response", async () => {
  const { controller, ports, stored } = fixture();
  ports.api.session = async () => ({
    ...response,
    expiresAt: "2026-11-16T00:00:00Z",
  });
  await controller.restore("foreground");
  expect(controller.state.status).toBe("signedOut");
  expect(stored()).toBeNull();
});
it("keeps the current authenticated route behind the busy overlay during foreground validation", async () => {
  const { controller, ports } = fixture();
  await controller.restore("startup");
  let finish!: (s: Omit<typeof response, "token">) => void;
  ports.api.session = () =>
    new Promise((resolve) => {
      finish = resolve;
    });
  const pending = controller.restore("foreground");
  await Promise.resolve();
  expect(controller.state.status).toBe("busy");
  expect(controller.state.session).toEqual({
    user: response.user,
    expiresAt: response.expiresAt,
  });
  finish(response);
  await pending;
  expect(controller.state.status).toBe("authenticated");
  ports.api.session = async () => {
    throw { code: "UNAUTHORIZED" };
  };
  await controller.restore("foreground");
  expect(controller.state.session).toBeUndefined();
  expect(controller.state.status).toBe("signedOut");
});
it("records actual tRPC-wrapped network timeout separately from general failures", async () => {
  const { TRPCClientError } = await import("@trpc/client");
  const { controller, ports, metrics } = fixture();
  ports.api.session = async () => {
    throw TRPCClientError.from(new DOMException("timed out", "TimeoutError"));
  };
  await controller.restore("startup");
  expect(metrics).toEqual([expect.objectContaining({ status: "timeout" })]);
  expect(controller.state.status).toBe("error");
});
