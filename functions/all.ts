import {
  loadWords,
  parseIntParam,
  pickNumber,
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
  const limit = parseIntParam(pickNumber(body, url, "limit"), 100, 1, 1000);
  if (limit === null) return errorJson("limit must be an integer between 1 and 1000");
  const offset = parseIntParam(pickNumber(body, url, "offset"), 0, 0, Number.MAX_SAFE_INTEGER);
  if (offset === null) return errorJson("offset must be a non-negative integer");
  const words = await loadWords(ctx);
  const slice = words.slice(offset, offset + limit);
  return json({ words: slice, count: slice.length, total: words.length, limit, offset });
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
