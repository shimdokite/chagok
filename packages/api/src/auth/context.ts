import { createAuthService } from "./service";
import { verifyGoogle } from "./google";
import { getDb, prismaAuthStore } from "./store";

export function createApiContext(req: Request) {
  const authorization = req.headers.get("authorization");
  const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  return {
    token,
    // Lazy: public health and static web builds do not require a DB or OAuth config.
    getAuth: () =>
      createAuthService({ store: prismaAuthStore(getDb()), verifyGoogle }),
  };
}
