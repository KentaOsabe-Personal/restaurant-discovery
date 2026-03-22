# リサーチ & 設計判断ログ

---
**Feature**: `search-controller-integration`
**Discovery Scope**: Extension（既存スタブの置き換え）
**Key Findings**:
- SearchController・3サービス・エラークラスはすべて実装済み。コントローラのオーケストレーションロジックのみが欠けている
- 新規依存ライブラリは不要。既存の Rails 例外処理機構（`rescue_from` / inline rescue）を活用できる
- GooglePlacesService が空配列を返した場合は RecommendationService を呼ばないことで不要な OpenAI API コールを防止できる

---

## Research Log

### 既存サービスインターフェース確認

- **Context**: SearchController に組み込む前に各サービスのシグネチャを確認
- **Sources Consulted**: ソースコード直接参照
- **Findings**:
  - `QueryParserService#call(query: String)` → `{area:, genre:, price_level:, keyword:}` を返す。失敗時は `QueryParserError` を raise
  - `GooglePlacesService#call(conditions: Hash)` → `Array<Hash>` を返す。失敗時は `GooglePlacesError` を raise。戻り値の各要素は `{name:, rating:, price_level:, address:, google_maps_url:}` を含む
  - `RecommendationService#call(places: Array<Hash>, query: String)` → `Array<Hash>` を返す。`places` が空の場合は即 `[]` を返す。失敗時は `RecommendationError` を raise。戻り値には `reason:` が追加される
- **Implications**: コントローラ側は各サービスを `new.call(...)` で呼べばよい。型・形式の変換は不要

### エラーハンドリング手法の比較

- **Context**: 複数サービスの例外を一元的にハンドリングする方法を検討
- **Sources Consulted**: Rails ガイド（rescue_from）、既存 BaseController
- **Findings**:
  - `rescue_from` を BaseController に置く場合、将来の全 API コントローラに適用される
  - `rescue_from` を SearchController に置く場合、他コントローラへの影響がない
  - inline rescue（begin/rescue）は細粒度のハンドリングが可能だが冗長になりやすい
- **Implications**: 現時点では SearchController のみが外部 API を呼ぶため、SearchController に `rescue_from` を定義するのが最もスコープを絞れる

---

## Architecture Pattern Evaluation

| オプション | 説明 | 長所 | 短所 | 備考 |
|-----------|------|------|------|------|
| rescue_from（SearchController） | SearchController 内で 3 種の例外をハンドリング | スコープ最小、他コントローラ不影響 | コントローラが若干肥大化 | 現フェーズに最適 |
| rescue_from（BaseController） | 基底クラスで全サービス例外をハンドリング | 再利用性高い | 外部 API を使わないコントローラにも影響 | 将来の拡張時に検討 |
| inline rescue | create アクション内で逐次 rescue | 細粒度ハンドリング可能 | 冗長になりやすく可読性が下がる | 今回は不採用 |

---

## Design Decisions

### Decision: `rescue_from` を SearchController に定義する

- **Context**: 3 種のサービス例外（QueryParserError / GooglePlacesError / RecommendationError）を HTTP ステータスへ変換する責務の配置
- **Alternatives Considered**:
  1. BaseController に置く — 全コントローラに適用、将来の拡張に便利
  2. SearchController に置く — 現在の影響範囲を最小に抑える
  3. inline rescue — 細粒度だが冗長
- **Selected Approach**: SearchController に `rescue_from` を定義
- **Rationale**: 現在外部 API を呼ぶのは SearchController のみ。影響範囲を最小化し、BaseController を汚染しない
- **Trade-offs**: 将来 API コントローラが増えた場合、BaseController への移動が必要になる可能性がある
- **Follow-up**: コントローラが増えた段階で BaseController への昇格を再検討する

### Decision: candidates 空チェックはサービス側で完結

- **Context**: GooglePlacesService が 0 件を返した場合、RecommendationService を呼ぶかどうか
- **Alternatives Considered**:
  1. コントローラで空チェックして RecommendationService をスキップ
  2. RecommendationService 側で `places.empty?` を返す（既存実装）
- **Selected Approach**: コントローラで `places.empty?` を確認し、空の場合は RecommendationService をスキップして即レスポンスを返す
- **Rationale**: RecommendationService は既に空配列ガードを持つが、コントローラで明示的にスキップすることで不要な OpenAI API コール（費用）を確実に防ぐ
- **Trade-offs**: コントローラに条件分岐が1つ増えるが、コスト最適化の観点で許容範囲

---

## Risks & Mitigations

- **StandardError の捕捉範囲が広すぎる** — 500 ハンドラで全例外を捕捉するため、予期しないバグが隠れるリスクがある。ログ出力を必ず行うことで可観測性を確保する
- **既存の request spec が固定スタブを期待している** — 統合後はスタブテストを削除し、サービスモック付きの統合テストへ置き換える必要がある
- **parsed_conditions の `keyword` フィールドを含めない** — app-design.md の API 仕様では parsed_conditions に `keyword` を含まないため、QueryParserService の戻り値から意図的に除外する

---

## References

- app-design.md Chunk 6 仕様（Chunk 6: SearchController 統合）
- Rails rescue_from ドキュメント
- 既存サービス実装: `backend/app/services/`
