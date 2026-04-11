# Research Log — omakase-4areas

## Discovery Scope

Extension フィーチャー（既存システムへの機能追加）として light discovery を実施。
新規外部依存なし。既存の Google Places API・OpenAI API をそのまま流用。

## Key Findings

### 既存パターン

- `Api::SearchController` が rescue_from 階層・`render json:` パターンの参照実装
- `GooglePlacesService#call(conditions)` は `{area:, genre:, price_level:, keyword:}` Hash を受け取る
- `RecommendationService#call(places, query)` はプロンプト内の「3〜5 件」がハードコードされているため keyword args 追加が必要
- `GooglePlacesError` / `RecommendationError` は `app/services/` に独立ファイルとして定義されており Rails autoload で利用可能
- `Api::BaseController < ActionController::API` が存在し継承可能

### 境界判断

- `places.sample(5)` はコントローラー内で完結させる（専用サービス不要）
- `OmakaseService` は Pure function（ランダム抽選のみ、HTTP呼び出しなし）とすることで単体テストを容易化
- サブエリア定数は Ruby 定数（YAML 不要）。4エリア×数件、個人利用、変更頻度低

### Design Decisions

1. **RecommendationService 拡張方針**: `SYSTEM_PROMPT` 定数 → `SYSTEM_PROMPT_TEMPLATE` 定数に変更し `format(template, min: min_count, max: max_count)` でインスタンスごとに生成。既存呼び出しはデフォルト値 `min_count: 3, max_count: 5` で後方互換。
2. **フロント API 関数分離**: `fetchOmakase` を `src/api/omakase.ts` に独立させ、`SearchResponse` を継承した `OmakaseResponse` を返す。`App.tsx` への依存を最小化。
3. **検索履歴非追加**: おまかせ結果はエリアID由来であり自然文クエリ再実行に適さないため履歴非追加を設計上明示。
4. **QueryParserService 非呼び出し**: API コスト削減（OpenAI 呼び出し1回節約）。サブエリア文字列は直接 GooglePlacesService に渡す。
5. **エリア境界の保証方法**: `SUB_AREAS` 定数でエリアごとにサブエリア配列を完全に分離しているため、「ekimae ボタン → ekimae のサブエリアからランダム」という流れで他エリアの店舗が混入する可能性はない。地理的な境界はアプリコードではなくこの定数が担保する設計判断。
