# Word API

634,367 語の単語リストからランダムなワードを返す API。Cloudflare Pages (Pages Functions) 上で動作します。

- 本番 URL: https://word-api.pages.dev
- データ: `words.txt` / `words.json` / `words.ndjson` / `words_pretty.json`（元データ、`public/words.txt` が API 用コピー）

## Endpoints

| Method | Path | 説明 |
|---|---|---|
| GET / POST | `/word` | ランダムな単語を1つ返す |
| GET / POST | `/word?count=N` | ランダムな単語を N 個返す（1〜100） |
| GET / POST | `/all?limit=100&offset=0` | 全単語をページネーション取得（limit 最大 1000、デフォルト 100） |
| GET / POST | `/search?q=app` | 単語検索。`mode=prefix\|contains\|suffix`（デフォルト prefix）、`limit`（最大 1000） |
| GET / POST | `/words/:word` | 指定した単語がリストに存在するか確認 |
| GET | `/words.txt` | 生データ（1行1語、634,367 行） |
| GET | `/` | ランディングページ（ブラウザで `/word` を試せます） |

全レスポンスは JSON（`/words.txt` と `/` を除く）、CORS 対応（`Access-Control-Allow-Origin: *`）。
GET / POST 以外のメソッドは `405 {"error":"method not allowed"}` を返します。

### POST の使い方

POST では JSON ボディでパラメータを渡せます（ボディが優先、無ければクエリパラメータを使用。ボディ無しでも可）:

```bash
curl -X POST https://word-api.pages.dev/word -H 'content-type: application/json' -d '{"count":3}'
curl -X POST https://word-api.pages.dev/search -H 'content-type: application/json' -d '{"q":"ing","mode":"suffix","limit":5}'
curl -X POST https://word-api.pages.dev/all -H 'content-type: application/json' -d '{"limit":100,"offset":200}'
curl -X POST https://word-api.pages.dev/words/apple -H 'content-type: application/json' -d '{}'
# /words/:word はボディ {"word":"banana"} でパスより優先して判定も可能
```

### レスポンス例

```bash
# ランダムな単語を1つ
curl https://word-api.pages.dev/word
# {"word":"isothermally"}

# ランダムな単語を5つ
curl "https://word-api.pages.dev/word?count=5"
# {"words":["realist","trehalose","bew","cantare","quantometer"],"count":5}

# 全単語（ページネーション）
curl "https://word-api.pages.dev/all?limit=3&offset=0"
# {"words":["0day","0days","0x"],"count":3,"total":634367,"limit":3,"offset":0}

# 前方一致検索
curl "https://word-api.pages.dev/search?q=apple&limit=5"
# {"words":["apple","applebaum","applebee","applebees","appleberry"],"count":5,"query":"apple","mode":"prefix","limit":5}

# 存在確認
curl https://word-api.pages.dev/words/apple
# {"word":"apple","exists":true,"length":5}

curl https://word-api.pages.dev/words/zzzznotaword
# {"word":"zzzznotaword","exists":false}  (HTTP 404)
```

### エラー

不正なパラメータは `400` と `{"error":"..."}` を返します。

```bash
curl "https://word-api.pages.dev/word?count=999"
# {"error":"count must be an integer between 1 and 100"}

curl "https://word-api.pages.dev/search"
# {"error":"query parameter 'q' is required"}

curl -X POST https://word-api.pages.dev/word -H 'content-type: application/json' -d 'not-json'
# {"error":"invalid JSON body"}

curl -X PUT https://word-api.pages.dev/word
# {"error":"method not allowed"}  (HTTP 405)
```

## 仕組み

- `public/words.txt`（約 5.9 MB）を静的アセットとして配信
- Pages Functions が `env.ASSETS.fetch()` で読み込み、モジュールスコープにキャッシュ（コールドスタート時のみ約 6 MB をパース）
- ランダム選択は `crypto.getRandomValues()` を使用
- KV / D1 は使わない（データが静的で読み取り専用のため）

## 開発

```bash
npm install
npm run dev   # wrangler pages dev public --port 8788 相当（デフォルトポートは wrangler 依存）
```

型チェック:

```bash
npx tsc --noEmit
```

## デプロイ

`node_modules` を作らず `npx` 経由でデプロイできます（事前に `npx wrangler login` でログインしておくこと）:

```bash
# 初回のみ: Pages プロジェクト作成
npx -y wrangler@4.168.0 pages project create word-api --production-branch=main

# デプロイ
npx -y wrangler@4.168.0 pages deploy public --project-name=word-api
# または npm install 済みなら:
npm run deploy
```

## プロジェクト構成

```
.
├── functions/
│   ├── _lib/words.ts      # 共有: データ読み込み/キャッシュ、JSON応答、CORS、乱数
│   ├── word.ts            # GET/POST /word
│   ├── all.ts             # GET/POST /all
│   ├── search.ts          # GET/POST /search
│   └── words/[word].ts    # GET/POST /words/:word
├── public/
│   ├── index.html         # ランディングページ
│   └── words.txt          # 単語データ（API用コピー）
├── wrangler.toml
├── package.json
└── tsconfig.json
```

## データの更新

元データ（`words.json` 等）を差し替えたら、API 用コピーを再生成してください:

```bash
cp words.txt public/words.txt   # words.txt 形式（1行1語）の場合
npx -y wrangler@4.168.0 pages deploy public --project-name=word-api
```
