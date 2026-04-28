import type { Request } from "express";

const LEGACY_BASE_URL = process.env.LEGACY_BACKEND_URL ?? "http://localhost:4000";

function buildLegacyUrl(path: string): string {
  const base = LEGACY_BASE_URL.endsWith("/")
    ? LEGACY_BASE_URL.slice(0, -1)
    : LEGACY_BASE_URL;
  return `${base}/api${path}`;
}

function extractForwardHeaders(req: Request, includeJson = true): Record<string, string> {
  const headers: Record<string, string> = {};

  const auth = req.header("authorization");
  if (auth) headers.authorization = auth;

  const cookie = req.header("cookie");
  if (cookie) headers.cookie = cookie;

  if (includeJson) headers["content-type"] = "application/json";

  return headers;
}

async function parseJsonSafely(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return { success: false, message: "Legacy API returned invalid JSON", raw: text };
  }
}

export async function proxyLegacy(
  req: Request,
  path: string,
  method: "GET" | "POST" | "PUT" | "DELETE",
  body?: unknown,
): Promise<{ status: number; data: unknown }> {
  const response = await fetch(buildLegacyUrl(path), {
    method,
    headers: extractForwardHeaders(req, method !== "GET" && method !== "DELETE"),
    body: body != null && method !== "GET" && method !== "DELETE" ? JSON.stringify(body) : undefined,
  });

  return {
    status: response.status,
    data: await parseJsonSafely(response),
  };
}
