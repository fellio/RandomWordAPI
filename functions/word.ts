import {
  loadWords,
  randomIndex,
  parseCountParam,
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
  const count = parseCountParam(pickNumber(body, url, "count"), 1, 100);
  if (count === null) return errorJson("count must be an integer between 1 and 100");
  const words = await loadWords(ctx);
  if (count === 1) {
    return json({ word: words[randomIndex(words.length)] });
  }
  const picked: string[] = [];
  for (let i = 0; i < count; i++) picked.push(words[randomIndex(words.length)]);
  return json({ words: picked, count: picked.length });
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
