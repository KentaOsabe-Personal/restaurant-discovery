# Research Log: refine-recommendation

## Discovery Scope

- **分類**: Extension（既存AI検索パイプラインへの拡張）
- **Discovery種別**: Light（既存コードベース調査）
- **実施日**: 2026-04-15

## Codebase Analysis Findings

### 既存サービスの実装確認

| サービス | シグネチャ | 戻り値 | 再利用方針 |
|---------|-----------|--------|-----------|
| `QueryParserService` | `call(query)` | `{area:, genre:, price_level:, keyword:}` (各 string\|nil) | そのまま再利用（フィードバックを query に渡す） |
| `GooglePlacesService` | `call(conditions)` | Array[{name, rating, price_level, address, google_maps_url, lat, lng}] | そのまま再利用（マージ済み conditions を渡す） |
| `RecommendationService` | `call(places, query, min_count:3, max_count:5, parsed_conditions:nil)` | Array[{name, reason, ...}] | `feedback:nil` キーワード引数を追加 |

### SearchController パターン確認
- `rescue_from QueryParserError, GooglePlacesError, RecommendationError → 502 Bad Gateway`
- `rescue_from StandardError → 500 Internal Server Error`
- `render json: { recommendations, other_candidates, parsed_conditions }` の直接レンダリング
- RefineController はこのパターンを踏襲する

### フロントエンド状態管理確認
- `App.tsx` が管理する状態: `recommendations`, `otherCandidates`, `parsedConditions`, `query`, `isLoading`, `error`
- `SearchConditionTags` は `parsedConditions` を props として受け取り表示する（既存機能の再利用可能）
- `showOtherCandidates`, `selectedGoogleMapsUrl`, `infoWindowVisible` も管理対象（再レコメンド後にリセット必要）

### 型定義確認
- `ParsedConditions`: `{area, genre, price_level, keyword}` (各 `string | null`)
- `SearchResponse`: `{recommendations, other_candidates, parsed_conditions}`
- `RefineResponse` は `SearchResponse` と同一形状 → 型エイリアスで対応

## Design Decisions

### 1. GeneralizationA: RefineResponse = SearchResponse
- 再レコメンドのレスポンス形状は既存の SearchResponse と同一
- 型エイリアス `export type RefineResponse = SearchResponse` で管理
- フロントエンドの状態更新ロジックを共通化できる

### 2. Build vs Adopt: 条件マージロジック
- シンプルな Hash マージ（null でない値のみ上書き）のため、独立したサービスオブジェクト不要
- `RefineController` 内のプライベートメソッド `merge_conditions` として実装
- 理由: 1ファイルのみの使用、将来別コントローラーで使う設計根拠なし

### 3. モデル変更: RecommendationService
- `gpt-5-nano` → `gpt-5.4-nano` への変更
- 理由: ranking タスクへの適性向上、高度な reasoning、知識カットオフ更新 (2024/05 → 2025/08)
- コスト影響: 1検索あたり約 $0.000225 → $0.000705（月100回/日で約+$1.5）
- 変更は `RecommendationService` のみ。`QueryParserService` は単純タスクのため変更なし

### 4. Simplification: FeedbackInput は SearchInput.tsx パターンで実装
- Controlled input + 空文字無効化 + isLoading 状態表示
- 独自のカスタムフック不要（状態は App.tsx で管理）

## Integration Risk Assessment

| リスク | 影響 | 対処 |
|--------|------|------|
| RecommendationService 変更で既存コールが壊れる | 高 | `feedback: nil` デフォルト引数で後方互換維持 |
| フィードバック解析が全 null になる（フォールバック） | 低 | merged = original のまま継続、AIプロンプトのみ変化 |
| Google Places 追加コスト | 低 | ユーザー明示的アクション時のみ発生 |

## Boundary Decisions

- **In boundary**: POST /api/refine エンドポイント、条件マージロジック、FeedbackInput UI コンポーネント、RecommendationService の feedback 拡張
- **Out of boundary**: フィードバック履歴永続化、おまかせ機能への適用、ユーザー認証
- **Revalidation triggers**: `ParsedConditions` 型変更、`SearchResponse` 型変更、`RecommendationService` インターフェース変更
