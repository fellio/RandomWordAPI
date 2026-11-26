# Word API

[English](./README.md) | **日本語**

634,367 語の英語単語リストからランダムな単語を返す、依存ライブラリ不要の小さな REST API です。[Cloudflare Pages Functions](https://developers.cloudflare.com/pages/functions/) 上で動作し、データベースも KV もビルド手順も不要です。

**[デモ](https://word-api.pages.dev)** · [MIT ライセンス](./LICENSE)

```bash
curl https://word-api.pages.dev/word
# {"word":"isothermally"}
```

## 特徴

- **634,367 語**を静的テキストファイルから直接配信
- **GET と POST** — パラメータはクエリ文字列でも JSON ボディでも指定可能
- **ストレージコストゼロ** — KV / D1 不使用。単語リストは静的アセットで、アイソレートごとにメモリへキャッシュ
- **CORS 対応** — 任意のブラウザオリジンから呼び出し可能
- **一貫した JSON エラー**と適切なステータスコード（`400` / `404` / `405`）

## エンドポイント

| メソッド | パス | 説明 |
|---|---|---|
| GET / POST | `/word` | ランダムな単語を1つ返す |
| GET / POST | `/word?count=N` | ランダムな単語を N 個（`1`〜`100`） |
| GET / POST | `/all?limit=100&offset=0` | 全単語をページネーション取得（`limit` は最大 1000、デフォルト 100） |
| GET / POST | `/search?q=app` | 単語検索（`mode=prefix\|contains\|suffix`、`limit` は最大 1000） |
| GET / POST | `/words/:word` | 単語がリストに存在するか確認 |
| GET | `/words.txt` | 生データ（1行1語） |
| GET | `/` | ランディングページ（ブラウザで試せます） |

`/words.txt` と `/` を除き、レスポンスはすべて JSON です。未対応メソッドは `405` を返します。

### 例

```bash
# ランダムな単語を1つ
curl https://word-api.pages.dev/word
# {"word":"freighting"}

# ランダムな単語を5つ
curl "https://word-api.pages.dev/word?count=5"
# {"words":["realist","trehalose","bew","cantare","quantometer"],"count":5}

# 全単語のページネーション
curl "https://word-api.pages.dev/all?limit=3&offset=0"
# {"words":["0day","0days","0x"],"count":3,"total":634367,"limit":3,"offset":0}

# 前方一致 / 部分一致 / 後方一致検索
curl "https://word-api.pages.dev/search?q=apple&limit=5"
# {"words":["apple","applebaum","applebee","applebees","appleberry"],"count":5,"query":"apple","mode":"prefix","limit":5}

curl "https://word-api.pages.dev/search?q=ing&mode=suffix&limit=3"
# {"words":["aahing","abalienating","abanding"],"count":3,"query":"ing","mode":"suffix","limit":3}

# 存在確認
curl https://word-api.pages.dev/words/apple
# {"word":"apple","exists":true,"length":5}

curl -w " [%{http_code}]\n" https://word-api.pages.dev/words/zzzznotaword
# {"word":"zzzznotaword","exists":false} [404]
```

### POST

クエリパラメータと同じ値を JSON ボディで渡せます。ボディの値がクエリより優先され、空ボディでも動作します。

```bash
curl -X POST https://word-api.pages.dev/word \
  -H 'content-type: application/json' -d '{"count":3}'
# {"words":["notaeums","chelodine","codd"],"count":3}

curl -X POST https://word-api.pages.dev/search \
  -H 'content-type: application/json' -d '{"q":"ing","mode":"suffix","limit":2}'

curl -X POST https://word-api.pages.dev/all \
  -H 'content-type: application/json' -d '{"limit":2,"offset":10}'
```

### エラー

| ステータス | ボディ | 原因 |
|---|---|---|
| `400` | `{"error":"count must be an integer between 1 and 100"}` | 範囲外または数値でないパラメータ |
| `400` | `{"error":"query parameter 'q' is required"}` | `q` なしの `/search` |
| `400` | `{"error":"invalid JSON body"}` | 不正な POST ボディ |
| `404` | `{"word":"...","exists":false}` | リストに存在しない単語 |
| `405` | `{"error":"method not allowed"}` | GET / POST / OPTIONS 以外 |

## 仕組み

- `data/words.txt`（約 6 MB、1行1語）をビルド時に `public/` へコピーし、静的アセットとして配信します。
- Functions はアイソレートごとに `env.ASSETS.fetch()` で一度だけ読み込み、パース済み配列をモジュールスコープに保持します。パースコストがかかるのはコールドスタート時のみです。
- 乱数は `crypto.getRandomValues()` とリジェクションサンプリングを使用（剰余の偏りなし）。
- リストは読み取り専用のため、KV / D1 / R2 は不要です。

## プロジェクト構成

```
.
├── data/
│   └── words.txt              # 元データ（634,367 行）
├── functions/
│   ├── _lib/words.ts          # 共有: 読み込み/キャッシュ、JSON応答、CORS、乱数
│   ├── word.ts                # GET/POST /word
│   ├── all.ts                 # GET/POST /all
│   ├── search.ts              # GET/POST /search
│   └── words/[word].ts        # GET/POST /words/:word
├── public/
│   ├── index.html             # ランディングページ
│   └── words.txt              # `npm run build` で生成（git 管理外）
├── wrangler.toml
├── package.json
└── tsconfig.json
```

## 開発

Node.js 18 以上が必要です。`node_modules` は任意で、すべて `npx` 経由で実行できます。

```bash
npm run build     # data/words.txt -> public/words.txt
npm run dev       # http://localhost:8788
```

依存関係をインストールすると、`wrangler` と TypeScript をローカルで使えます:

```bash
npm install
npx tsc --noEmit  # 型チェック
```

## デプロイ

```bash
# 初回のみ: Pages プロジェクト作成
npx -y wrangler@4.168.0 pages project create word-api --production-branch=main

# デプロイ
npm run build
npx -y wrangler@4.168.0 pages deploy public --project-name=word-api
```

`node_modules` をインストール済みなら `npm run deploy` でも可。

## 単語リストの更新

`data/words.txt`（1行1語）を差し替えてから、ビルドしてデプロイします:

```bash
npm run build
npm run deploy
```

## ライセンス

[MIT](./LICENSE)
