import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter, createApiContext } from "@chagok/api";

export const runtime = "nodejs";

function previewHeaders(req: Request) {
  const headers = new Headers();
  const origin = req.headers.get("origin");
  if (
    process.env.NODE_ENV !== "production" &&
    origin &&
    [
      "http://localhost:8081",
      "http://127.0.0.1:8081",
      "http://localhost:8082",
      "http://127.0.0.1:8082",
    ].includes(origin)
  ) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "content-type, authorization");
    headers.set("Vary", "Origin");
  }
  return headers;
}

async function handler(req: Request) {
  const response = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,

    createContext: () => createApiContext(req),
  });
  response.headers.set("Cache-Control", "no-store");
  previewHeaders(req).forEach((value, key) =>
    response.headers.append(key, value),
  );
  return response;
}

export function OPTIONS(req: Request) {
  return new Response(null, { status: 204, headers: previewHeaders(req) });
}

export { handler as GET, handler as POST };
