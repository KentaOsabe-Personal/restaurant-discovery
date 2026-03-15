# 今日どこ行く？ 要件定義・設計ドキュメント

## 1. 目的・コンセプト

### 目的

今日どこのお店に行くかを素早く決めるための個人用ツール。

### コンセプト

> 自然文で「渋谷で安くてうまいイタリアン」と入力するだけで、AIがお店を探して提案してくれるアプリ

### 方針

- **Google Places API** を利用して、お店を探すことに特化する
- 店舗情報の管理機能（CRUD）は持たない、**ステートレスな検索・提案アプリ**

---

## 2. 要件定義

### 機能要件

| # | 機能 | 説明 |
|---|------|------|
| F1 | 自然文入力 | ユーザーがテキストボックスに自然文で条件を入力する |
| F2 | AI条件解析 | OpenAI APIが自然文からエリア・ジャンル・予算等の検索条件を構造化データとして抽出する |
| F3 | お店検索 | 抽出された条件でGoogle Places API (New) を呼び出し、候補店を取得する |
| F4 | AI提案 | 検索結果からAIが3〜5件を厳選し、おすすめ理由付きで提案する |
| F5 | 店舗詳細表示 | 提案されたお店の評価・価格帯・住所・営業時間・写真を表示する |

### 非機能要件

- レスポンス: 検索〜提案表示まで10秒以内を目標
- 位置情報（GPS）は使用しない（エリアはテキスト入力）
- データベースに店舗情報を保存しない（ステートレス）
- 個人利用ツール（認証不要）

---

## 3. 技術スタック

| レイヤー | 技術 |
|----------|------|
| フロントエンド | React 19 + TypeScript + Vite |
| バックエンド | Rails 8 (APIモード) |
| データベース | MySQL 8（将来の拡張用。初期は検索履歴保存等に利用可能） |
| インフラ | Docker Compose |
| 外部API | Google Places API (New), OpenAI API |

---

## 4. アーキテクチャ

### システム構成図

```
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│  React SPA  │────▶│  Rails API      │────▶│ OpenAI API       │
│  (Vite)     │◀────│  Server         │◀────│ (gpt-5-nano)     │
└─────────────┘     │                 │     └──────────────────┘
                    │                 │     ┌──────────────────┐
                    │                 │────▶│ Google Places    │
                    │                 │◀────│ API (New)        │
                    └────────┬────────┘     └──────────────────┘
                             │
                    ┌────────▼────────┐
                    │  MySQL 8        │
                    │  (optional)     │
                    └─────────────────┘
```

### リクエストフロー

```
1. ユーザー入力: "渋谷で安くてうまいイタリアン"
         │
         ▼
2. POST /api/search  { query: "渋谷で安くてうまいイタリアン" }
         │
         ▼
3. QueryParserService (OpenAI API)
   自然文 → 構造化データに変換
   {
     area: "渋谷",
     genre: "イタリアン",
     price_level: "PRICE_LEVEL_INEXPENSIVE",
     keyword: "うまい"
   }
         │
         ▼
4. GooglePlacesService
   構造化データ → Google Places API Text Search
   → 候補店リスト取得（最大20件）
         │
         ▼
5. RecommendationService (OpenAI API)
   候補店リスト + ユーザーの元の自然文
   → AIが3〜5件を厳選 + おすすめ理由を生成
         │
         ▼
6. レスポンス → フロントエンドで提案表示
```

---

## 5. API設計

### エンドポイント

```
POST /api/search
```

### リクエスト

```json
{
  "query": "渋谷で安くてうまいイタリアン"
}
```

### レスポンス

```json
{
  "recommendations": [
    {
      "name": "トラットリア XX",
      "rating": 4.2,
      "price_level": "PRICE_LEVEL_MODERATE",
      "address": "東京都渋谷区...",
      "google_maps_url": "https://maps.google.com/?cid=...",
      "photo_url": "https://places.googleapis.com/...",
      "opening_hours": {
        "open_now": true,
        "weekday_text": ["月曜日: 11:00〜22:00", "..."]
      },
      "reason": "口コミ評価が高く、手頃な価格帯でイタリアンを楽しめる渋谷の人気店です"
    }
  ],
  "parsed_conditions": {
    "area": "渋谷",
    "genre": "イタリアン",
    "price_level": "PRICE_LEVEL_INEXPENSIVE"
  }
}
```

---

## 6. バックエンド設計

### ディレクトリ構成

```
backend/
  app/
    controllers/
      api/
        search_controller.rb      # POST /api/search
    services/
      query_parser_service.rb     # OpenAI: 自然文 → 構造化データ
      google_places_service.rb    # Google Places API 呼び出し
      recommendation_service.rb   # OpenAI: 候補 → 厳選提案
  config/
    routes.rb
```

### 主要サービス

#### QueryParserService

- **入力**: 自然文 (string)
- **出力**: 構造化された検索条件 (hash)
- **処理**: OpenAI APIにJSON Schema付きで問い合わせ、エリア・ジャンル・予算・キーワードを抽出

#### GooglePlacesService

- **入力**: 構造化された検索条件
- **出力**: Google Places の検索結果（店舗リスト）
- **処理**: Places API (New) の Text Search を使用
- **取得フィールド**: displayName, rating, priceLevel, formattedAddress, googleMapsUri, photos, currentOpeningHours, reviews

#### RecommendationService

- **入力**: 候補店リスト + 元の自然文
- **出力**: 3〜5件の推薦結果（理由付き）
- **処理**: OpenAI APIに候補店情報と元のクエリを渡し、厳選・理由生成

---

## 7. フロントエンド設計

### ディレクトリ構成

```
frontend/
  src/
    App.tsx                    # メイン画面（ルーティング不要、1画面構成）
    components/
      SearchInput.tsx          # 自然文入力フォーム
      RecommendationList.tsx   # 提案結果リスト
      PlaceCard.tsx            # 各店舗のカード表示
      LoadingState.tsx         # 検索中の表示
    api/
      search.ts                # POST /api/search の呼び出し
    types/
      search.ts                # 型定義
```

### 画面構成（1画面）

```
┌─────────────────────────────────────┐
│  🍽  今日どこ行く？                  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 渋谷で安くてうまいイタリアン    │    │
│  └─────────────────────────────┘    │
│           [ 探す → ]                │
│                                     │
│  ── AIのおすすめ ──                  │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📷 写真                      │    │
│  │ トラットリア XX               │    │
│  │ ⭐ 4.2  💰 ¥1,000〜2,000     │    │
│  │ 📍 渋谷区道玄坂...           │    │
│  │ 🕐 営業中 〜22:00            │    │
│  │                              │    │
│  │ 「コスパ最高の本格イタリアン。  │    │
│  │  パスタが特に評判です」        │    │
│  │                              │    │
│  │ [Google Mapsで見る]           │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │ 📷 写真                      │    │
│  │ ピッツェリア YY               │    │
│  │ ...                          │    │
│  └─────────────────────────────┘    │
└─────────────────────────────────────┘
```

### 型定義

```typescript
// 検索リクエスト
type SearchRequest = {
  query: string;
};

// 提案結果
type Recommendation = {
  name: string;
  rating: number | null;
  price_level: string | null;
  address: string;
  google_maps_url: string;
  photo_url: string | null;
  opening_hours: {
    open_now: boolean;
    weekday_text: string[];
  } | null;
  reason: string;
};

// 検索レスポンス
type SearchResponse = {
  recommendations: Recommendation[];
  parsed_conditions: {
    area: string | null;
    genre: string | null;
    price_level: string | null;
  };
};
```

---

## 8. 外部API セットアップ

### Google Places API (New)

1. [Google Cloud Console](https://console.cloud.google.com/) でプロジェクト作成
2. 「Places API (New)」を有効化
3. APIキーを作成（APIキーの制限でPlaces API (New)のみに絞ることを推奨）
4. 使用するエンドポイント: **Text Search (New)**
   - `POST https://places.googleapis.com/v1/places:searchText`
5. 料金: Text Search は $32 / 1,000リクエスト（SKU基本料金）

### OpenAI API

- 既存のAPIキーをそのまま流用
- モデル: `gpt-5-nano`（コスト効率重視）

### APIキーの管理

```
project-root/
  google_places_apikey    # Google Places APIキー
  openai_apikey           # OpenAI APIキー（既存流用）
```

Docker Compose でバックエンドコンテナにマウント（read-only）。

---

## 9. Docker Compose 構成

```yaml
services:
  frontend:
    build: ./frontend
    ports:
      - "5174:5173"
    volumes:
      - ./frontend:/app
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "30000:3000"
    volumes:
      - ./google_places_apikey:/google_places_apikey:ro
      - ./openai_apikey:/openai_apikey:ro
    depends_on:
      db:
        condition: service_healthy

  db:
    image: mysql:8.4
    environment:
      MYSQL_ROOT_PASSWORD: rootpassword
      MYSQL_DATABASE: app_development
      MYSQL_USER: app
      MYSQL_PASSWORD: apppassword
    ports:
      - "3306:3306"
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "localhost"]
    volumes:
      - db_data:/var/lib/mysql

volumes:
  db_data:
```

---

## 10. テスト方針

| 対象 | ツール | 方針 |
|------|--------|------|
| バックエンド サービス | RSpec | QueryParserService, GooglePlacesService, RecommendationService を外部APIモック付きでテスト |
| バックエンド コントローラ | RSpec (request spec) | POST /api/search の正常系・異常系 |
| フロントエンド コンポーネント | Vitest + Testing Library | SearchInput, PlaceCard, RecommendationList の表示テスト |
| フロントエンド 統合 | Vitest | 検索フロー全体のモック付きテスト |

---

## 11. 実装チャンク（cc-sdd 用）

機能を独立して実装・テストできる単位に分割する。各チャンクは「仕様 → テスト → 実装」の順で進める。

### フェーズ1: プロジェクトセットアップ

#### Chunk 1: インフラ構築

**概要**: Docker Compose + Rails API + React/Vite の動作確認まで

**完了条件**:
- `docker compose up` で frontend / backend / db の3サービスが起動する
- `GET /api/health` が `{ status: "ok" }` を返す
- フロントエンドから `/api/health` を呼び出してコンソールにレスポンスが表示される

**テストケース**:
- `GET /api/health` → 200 OK
- フロントエンドの Vite dev proxy が `/api/*` をバックエンドに転送する

---

### フェーズ2: バックエンド

#### Chunk 2: SearchController（スタブ）

**概要**: `POST /api/search` のエンドポイントを実装。サービス層は呼ばず固定レスポンスを返す

**入力**:
```json
{ "query": "渋谷でイタリアン" }
```

**出力（固定スタブ）**:
```json
{
  "recommendations": [],
  "parsed_conditions": { "area": null, "genre": null, "price_level": null }
}
```

**完了条件**:
- `query` が空の場合 422 を返す
- `query` がある場合 200 + 上記スタブ構造を返す

**テストケース（request spec）**:
- `query` あり → 200 OK、レスポンス構造が正しい
- `query` なし → 422 Unprocessable Entity
- `query` が文字列以外 → 422

---

#### Chunk 3: QueryParserService

**概要**: 自然文を OpenAI API に渡し、構造化された検索条件を返す

**入力**: `"渋谷で安くてうまいイタリアン"` (string)

**出力**:
```ruby
{
  area: "渋谷",
  genre: "イタリアン",
  price_level: "PRICE_LEVEL_INEXPENSIVE",  # PRICE_LEVEL_FREE / INEXPENSIVE / MODERATE / EXPENSIVE / VERY_EXPENSIVE
  keyword: "うまい"  # nil 可
}
```

**完了条件**:
- OpenAI API を JSON Schema モードで呼び出し、上記フォーマットで返る
- 条件が読み取れないフィールドは `nil` になる
- OpenAI API エラー時は例外を raise する

**テストケース（service spec、OpenAI をモック）**:
- エリア・ジャンル・価格帯を含む文 → 全フィールドが正しく抽出される
- エリアのみの文 → genre / price_level / keyword が nil
- 空文字 → 全フィールドが nil
- OpenAI エラー → 例外が raise される

---

#### Chunk 4: GooglePlacesService

**概要**: 構造化された検索条件で Google Places API (Text Search) を呼び出し、候補店リストを返す

**入力**:
```ruby
{ area: "渋谷", genre: "イタリアン", price_level: "PRICE_LEVEL_INEXPENSIVE", keyword: nil }
```

**出力**: Google Places API のレスポンスを整形した配列（最大20件）
```ruby
[
  {
    name: "トラットリア XX",
    rating: 4.2,
    price_level: "PRICE_LEVEL_MODERATE",
    address: "東京都渋谷区...",
    google_maps_url: "https://maps.google.com/?cid=...",
    photo_name: "places/xxx/photos/yyy",  # 写真取得用
    open_now: true
  },
  ...
]
```

**完了条件**:
- Text Search エンドポイントへの POST リクエストが正しいパラメータで送られる
- フィールドマスク（`X-Goog-FieldMask`）が適切に設定されている
- 結果が0件の場合は空配列を返す
- Google Places API エラー時は例外を raise する

**テストケース（service spec、HTTP をモック）**:
- 正常なレスポンス → 整形済み配列が返る
- 結果0件 → 空配列
- `price_level` が nil → クエリ文字列がエリア + ジャンルのみになる
- API エラー（4xx/5xx） → 例外が raise される

---

#### Chunk 5: RecommendationService

**概要**: 候補店リストと元の自然文を OpenAI API に渡し、3〜5件の推薦結果（理由付き）を返す

**入力**:
```ruby
places: [...],  # Chunk 4 の出力
query:  "渋谷で安くてうまいイタリアン"
```

**出力**:
```ruby
[
  {
    name: "トラットリア XX",
    rating: 4.2,
    price_level: "PRICE_LEVEL_MODERATE",
    address: "東京都渋谷区...",
    google_maps_url: "https://maps.google.com/?cid=...",
    photo_url: nil,  # 写真URLは別途取得 or nil
    opening_hours: { open_now: true, weekday_text: [] },
    reason: "コスパが高く口コミ評価も良い人気店です"
  }
]
```

**完了条件**:
- 候補店リストが空の場合は空配列を返す
- OpenAI API を JSON Schema モードで呼び出し、3〜5件を返す
- `reason` は日本語で生成される

**テストケース（service spec、OpenAI をモック）**:
- 候補10件 → 3〜5件が返る
- 候補0件 → 空配列
- OpenAI エラー → 例外が raise される

---

#### Chunk 6: SearchController 統合

**概要**: Chunk 2〜5 を SearchController に結合し、エンドツーエンドのフローを完成させる

**完了条件**:
- `POST /api/search` が QueryParser → GooglePlaces → Recommendation の順に呼び出す
- 各サービスのエラーを適切な HTTP ステータスに変換する
  - Google Places エラー → 502
  - OpenAI エラー → 502
  - その他 → 500

**テストケース（request spec、外部APIをモック）**:
- 正常系: 200 + 推薦リストが返る
- Google Places エラー → 502
- OpenAI エラー → 502
- `query` なし → 422

---

### フェーズ3: フロントエンド

#### Chunk 7: 型定義 + APIクライアント

**概要**: TypeScript 型定義と `POST /api/search` を呼び出す関数を実装する

**完了条件**:
- `SearchRequest`, `Recommendation`, `SearchResponse` の型が定義されている
- `searchPlaces(query: string): Promise<SearchResponse>` が実装されている
- API エラー時は例外を throw する

**テストケース（Vitest、fetch をモック）**:
- 正常レスポンス → `SearchResponse` 型のオブジェクトが返る
- 422 → エラーが throw される
- ネットワークエラー → エラーが throw される

---

#### Chunk 8: SearchInput コンポーネント

**概要**: 自然文入力フォームの UI コンポーネント

**完了条件**:
- テキスト入力と送信ボタンを持つ
- 入力が空のとき送信ボタンが disabled になる
- `onSubmit(query: string)` を props で受け取り、送信時に呼ぶ
- `isLoading` が true のとき入力・ボタンが disabled になる

**テストケース（Vitest + Testing Library）**:
- 入力が空 → ボタンが disabled
- 入力後 → ボタンが enabled
- ボタン押下 → `onSubmit` が入力値付きで呼ばれる
- `isLoading=true` → 入力・ボタンが disabled

---

#### Chunk 9: PlaceCard コンポーネント

**概要**: 1件の推薦店舗を表示するカードコンポーネント

**完了条件**:
- 店舗名・評価・価格帯・住所・営業状況・推薦理由を表示する
- `google_maps_url` へのリンクを表示する
- `rating` / `price_level` / `opening_hours` が null のときに壊れない

**テストケース（Vitest + Testing Library）**:
- 全フィールドあり → すべて表示される
- `rating` が null → 評価欄が表示されない（またはデフォルト表示）
- `opening_hours` が null → 営業時間欄が表示されない
- Google Maps リンクが正しい URL になっている

---

#### Chunk 10: App.tsx 統合

**概要**: SearchInput → APIコール → RecommendationList の全フローを App.tsx で結合する

**完了条件**:
- 初期表示: SearchInput のみ表示
- 検索中: ローディング表示
- 結果あり: PlaceCard のリストを表示
- 結果0件: 「該当するお店が見つかりませんでした」を表示
- エラー: エラーメッセージを表示
- 再検索: 新しいクエリで上書き表示される

**テストケース（Vitest + Testing Library、API をモック）**:
- 検索送信 → ローディング表示 → 結果表示
- API エラー → エラーメッセージ表示
- 結果0件 → 空状態メッセージ表示
- 再検索 → 前の結果がクリアされる

---

### チャンク依存関係

```
Chunk 1 (インフラ)
    │
    ├── Chunk 2 (SearchController スタブ)
    │       │
    │       ├── Chunk 3 (QueryParserService)
    │       ├── Chunk 4 (GooglePlacesService)
    │       ├── Chunk 5 (RecommendationService)
    │       └── Chunk 6 (SearchController 統合) ← 3, 4, 5 完了後
    │
    └── Chunk 7 (型定義 + APIクライアント)
            │
            ├── Chunk 8 (SearchInput)
            ├── Chunk 9 (PlaceCard)
            └── Chunk 10 (App.tsx 統合) ← 7, 8, 9 完了後
```

---

## 12. 将来の拡張候補（スコープ外）

- 検索履歴の保存（MySQL活用）
- お気に入り店舗のブックマーク
- 現在地ベースの検索（GPS）
- 複数人での投票機能
