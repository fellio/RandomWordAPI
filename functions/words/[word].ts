import {
  loadWords,
  pickString,
  readJsonBody,
  json,
  errorJson,
  handleOptions,
  methodNotAllowed,
  type Env,
} from "../_lib/words";

export const onRequestOptions = () => handleOptions();
export const onRequest = methodNotAllowed;

async function handle(
  ctx: EventContext<Env, string, unknown>,
  body: Record<string, unknown>,
) {
  const url = new URL(ctx.request.url);
  const fromBody = pickString(body, url, "word");
  const word = (fromBody ?? String(ctx.params.word ?? "")).toLowerCase();
  if (!word) return errorJson("word is required");
  const words = await loadWords(ctx);
  const exists = words.includes(word);
  if (!exists) return json({ word, exists: false }, 404);
  return json({ word, exists: true, length: word.length });
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
