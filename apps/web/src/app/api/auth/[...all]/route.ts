import { toNextJsHandler } from "better-auth/next-js";
import { getEnv } from "@/lib/bindings";
import { getBetterAuth } from "@/lib/better-auth";

const handler = async (request: Request): Promise<Response> => {
  const env = await getEnv();
  if (env.AUTH_MODE !== "multi-user") {
    return new Response("Not Found", { status: 404 });
  }

  const auth = await getBetterAuth();
  return auth.handler(request);
};

export const { GET, POST, PATCH, PUT, DELETE } = toNextJsHandler(handler);
