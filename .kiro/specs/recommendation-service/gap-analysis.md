# ギャップ分析: recommendation-service

## 1. 現状調査

### 既存アセット

| ファイル | 役割 | RecommendationService との関連 |
|---|---|---|
| `app/services/query_parser_service.rb` | OpenAI API Structured Outputs でテキストを解析 | **直接の実装テンプレート** — 同じgem・APIキー・エラー処理パターン |
| `app/services/query_parser_error.rb` | `StandardError` 継承のカスタム例外 | `RecommendationError` の実装モデル |
| `app/services/google_places_service.rb` | Faraday で Google Places API を呼び出し | 入力データ（`places` 配列）の供給元 |
| `app/services/google_places_error.rb` | `StandardError` 継承のカスタム例外 | 同上パターン |
| `app/controllers/api/search_controller.rb` | スタブ `recommendations: []` を返す | Chunk 6 で本サービスの出力を使用 |
| `Gemfile` | `ruby-openai ~> 8.3` インストール済み | gem 追加不要 |

### 確立済みのパターン・規約

**サービスオブジェクト構造（QueryParserService より）:**
```ruby
class FooService
  MODEL = "gpt-5-nano"
  API_KEY_PATH = "/openai_apikey"    # ← RecommendationService でも同じ
  SYSTEM_PROMPT = <<~PROMPT ... PROMPT
  RESPONSE_SCHEMA = { type: "json_schema", json_schema: { ... } }.freeze

  def call(input)
    client = build_client
    response = client.chat(parameters: { model:, messages:, response_format: })
    parse_response(response)
  rescue Faraday::Error => e  ... raise FooError
  rescue JSON::ParserError => e ... raise FooError
  rescue Errno::ENOENT => e ... raise FooError

  private
  def build_client; OpenAI::Client.new(access_token: File.read(API_KEY_PATH).strip); end
  def parse_response(response); ...; end
end
```

**テストパターン（query_parser_service_spec.rb より）:**
- `allow(File).to receive(:read).with("/openai_apikey").and_return("...")`
- `stub_request(:post, openai_endpoint)` で WebMock スタブ
- `stub_openai_success(...)` ヘルパーメソッドで正常系スタブを共通化

**GooglePlacesService の出力（RecommendationService の入力）:**
```ruby
[
  {
    name: "トラットリア XX",
    rating: 4.2,           # Float or nil
    price_level: "PRICE_LEVEL_MODERATE",  # String or nil
    address: "東京都渋谷区...",
    google_maps_url: "https://maps.google.com/?cid=..."
  },
  ...  # 最大20件
]
```

---

## 2. 要件フィージビリティ分析

### 要件 → 技術ニーズマッピング

| 要件 | 技術ニーズ | 状態 |
|---|---|---|
| 候補店から3〜5件厳選 | OpenAI APIへのプロンプト設計 | **新規** |
| 日本語推薦理由の生成 | システムプロンプトに日本語指示 | **新規** |
| Structured Outputs (JSON Schema) | `ruby-openai` gem `response_format` | ✅ 既存パターン |
| `gpt-5-nano` 使用 | モデル定数 | ✅ 既存パターン |
| `/openai_apikey` ファイル読み取り | `File.read(API_KEY_PATH)` | ✅ 既存パターン |
| 候補0件 → 空配列 | `places.empty?` 早期リターン | **新規（単純）** |
| RecommendationError 例外クラス | `< StandardError` | **新規（1行）** |
| `Faraday::Error` / `JSON::ParserError` / `Errno::ENOENT` ハンドリング | rescue チェーン | ✅ 既存パターン |

### ギャップ

**不足しているファイル:**
- `app/services/recommendation_service.rb` — **Missing**
- `app/services/recommendation_error.rb` — **Missing**
- `spec/services/recommendation_service_spec.rb` — **Missing**
- `spec/services/recommendation_error_spec.rb` — **Missing**

**設計上の判断が必要な箇所（Research Needed）:**

1. **JSON Schema の設計** — RecommendationService の出力をどう構造化するか選択肢がある:
   - **Option A（名前ルックアップ）**: AIは `name` と `reason` のみ返す → 元の `places` 配列から一致する店舗データを結合
   - **Option B（全フィールド返却）**: AIが全フィールドを返す → シンプルだがAIが店舗情報を改変するリスクあり
   - 設計フェーズで決定推奨

2. **候補が3件未満の場合の挙動** — 要件上は「存在するすべての件数を返す」だが、プロンプトで何件選ぶか指示する際の表現が必要

---

## 3. 実装アプローチオプション

### Option A: 既存コンポーネントを拡張
**該当なし** — QueryParserService に RecommendationService の責務を混在させるのは SRP 違反のため非推奨。

### Option B: 新規コンポーネントを作成 ✅ 推奨

**新規作成ファイル:**
- `app/services/recommendation_error.rb` — `GooglePlacesError` と全く同じパターン（1行）
- `app/services/recommendation_service.rb` — `QueryParserService` をテンプレートとし、入出力と System Prompt を変更
- `spec/services/recommendation_error_spec.rb` — エラークラスの基本テスト
- `spec/services/recommendation_service_spec.rb` — WebMock + `stub_openai_success` パターンで実装

**インテグレーションポイント:**
- 入力: `GooglePlacesService#call` の戻り値（`places` 配列）+ `SearchController` が渡す `query` 文字列
- 出力: `SearchController` の `recommendations` キーで使用（Chunk 6）
- APIキー: `/openai_apikey` — QueryParserService と同じファイル（競合なし）

**責務境界:**
```
GooglePlacesService → [places 配列] → RecommendationService → [reason 付きハッシュ配列] → SearchController（Chunk 6）
```

**Trade-offs:**
- ✅ QueryParserService と完全に分離された責務
- ✅ 独立してテスト可能（WebMock でモック）
- ✅ Chunk 6 統合時に SearchController への変更が局所化される
- ❌ ファイル数が増える（ただし 2 ファイル + テスト 2 ファイルのみ）

### Option C: ハイブリッドアプローチ
**該当なし** — シンプルな新規作成で十分。ハイブリッドが必要な複雑さはない。

---

## 4. 複雑度・リスク評価

| 観点 | 評価 | 根拠 |
|---|---|---|
| **実装工数** | **S**（1〜3日） | 既存の QueryParserService を実質コピー・カスタマイズするだけ。新規パターン・依存関係なし |
| **リスク** | **Low** | 同じ gem・APIキー・エラー処理パターン。テストも確立済みの WebMock パターンで実装可能 |

---

## 5. 設計フェーズへの推奨事項

**優先すべき設計判断:**
1. **JSON Schema の構造** — 「名前ルックアップ方式（Option A）」vs「全フィールド返却方式（Option B）」を決定する。AIによるデータ改変リスクを避けるなら Option A が安全
2. **System Prompt の設計** — 3〜5件の厳選ロジック（評価・価格帯・クエリ一致度）をプロンプトでどう指示するか

**設計フェーズへの持ち越し研究項目:**
- JSON Schema 構造の選定（名前ルックアップ vs 全フィールド）
- System Prompt の具体的な日本語テキストと厳選指示の設計
