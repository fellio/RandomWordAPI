import {
  loadWords,
  parseIntParam,
  pickNumber,
  pickString,
  readJsonBody,
  json,
  errorJson,
  handleOptions,
  methodNotAllowed,
  type Env,
} from "./_lib/words";

export const onRequestOptions = () => handleOptions();
export const onRequest = methodNotAllowed;

async function handle(ctx: EventContext<Env, string, unknown>, body: Record<string, unknown>) {
  const url = new URL(ctx.request.url);
  const q = pickString(body, url, "q");
  if (!q) return errorJson("query parameter 'q' is required");
  const mode = pickString(body, url, "mode") ?? "prefix";
  if (!["prefix", "contains", "suffix"].includes(mode)) {
    return errorJson("mode must be one of: prefix, contains, suffix");
  }
  const limit = parseIntParam(pickNumber(body, url, "limit"), 100, 1, 1000);
  if (limit === null) return errorJson("limit must be an integer between 1 and 1000");
  const needle = q.toLowerCase();
  const words = await loadWords(ctx);
  const matched: string[] = [];
  for (const w of words) {
    const hit =
      mode === "prefix" ? w.startsWith(needle) : mode === "suffix" ? w.endsWith(needle) : w.includes(needle);
    if (hit) {
      matched.push(w);
      if (matched.length >= limit) break;
    }
  }
  return json({ words: matched, count: matched.length, query: q, mode, limit });
}

export const onRequestGet: PagesFunction<Env> = async (ctx) => handle(ctx, {});

export const onRequestPost: PagesFunction<Env> = async (ctx) => {
  let body: Record<string, unknown>;
  try {
    body = await readJsonBody(ctx.request);
  } catch (e) {
    return errorJson(e instanceof Error ? e.message : "invalid JSON body");
  }
  return handle(ctx, body);
};
