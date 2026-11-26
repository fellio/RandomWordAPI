export interface Env {
  ASSETS: Fetcher;
}

type Ctx = EventContext<Env, string, unknown>;

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export function json(data: unknown, status = 200, extra: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...JSON_HEADERS, ...extra },
  });
}

export function errorJson(message: string, status = 400): Response {
  return json({ error: message }, status);
}

export function handleOptions(): Response {
  return new Response(null, { status: 204, headers: JSON_HEADERS });
}

export function methodNotAllowed(): Response {
  return json({ error: "method not allowed" }, 405, { allow: "GET, POST, OPTIONS" });
}

let cache: string[] | null = null;
let loading: Promise<string[]> | null = null;

export function loadWords(ctx: Ctx): Promise<string[]> {
  if (cache) return Promise.resolve(cache);
  if (!loading) {
    loading = (async () => {
      const res = await ctx.env.ASSETS.fetch(new URL("/words.txt", ctx.request.url));
      if (!res.ok) throw new Error(`failed to load words.txt: ${res.status}`);
      const text = await res.text();
      const words: string[] = text.split("\n").filter(Boolean);
      cache = words;
      return words;
    })().catch((e) => {
      loading = null;
      throw e;
    });
  }
  return loading;
}

export function randomIndex(max: number): number {
  const limit = Math.floor(0x100000000 / max) * max;
  const buf = new Uint32Array(1);
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % max;
}

export function parseCountParam(raw: string | null, def = 1, max = 100): number | null {
  if (raw === null) return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < 1 || n > max) return null;
  return n;
}

export function parseIntParam(
  raw: string | null,
  def: number,
  min: number,
  max: number,
): number | null {
  if (raw === null) return def;
  const n = Number(raw);
  if (!Number.isInteger(n) || n < min || n > max) return null;
  return n;
}

export async function readJsonBody(request: Request): Promise<Record<string, unknown>> {
  const text = await request.text();
  if (!text.trim()) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("invalid JSON body");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  return parsed as Record<string, unknown>;
}

export function pickString(
  body: Record<string, unknown>,
  url: URL,
  key: string,
): string | null {
  const v = body[key];
  if (typeof v === "string") return v === "" ? null : v;
  if (v !== undefined) return null;
  return url.searchParams.get(key);
}

export function pickNumber(
  body: Record<string, unknown>,
  url: URL,
  key: string,
): string | null {
  const v = body[key];
  if (typeof v === "number") return String(v);
  if (typeof v === "string" && v !== "") return v;
  if (v !== undefined) return "__invalid__";
  return url.searchParams.get(key);
}
