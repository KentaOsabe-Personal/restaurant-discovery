# Research & Design Decisions

## Summary
- **Feature**: `ramen-search-precision`
- **Discovery Scope**: Extension（既存システム拡張）
- **Key Findings**:
  - `build_text_query` は 4行の単純 compact + join メソッド。ラーメン固有ロジックなし
  - `RAMEN_SYSTEM_PROMPT_TEMPLATE` の選定基準1位が `area/price_level` 一致であり、味/種類の合致度が主基準になっていない
  - 既存テストカバレッジが十分（262行 + 527行）。新テストは既存パターン（webmock + include? 検証）に準拠

## Research Log

### `build_text_query` 現状調査
- **Context**: Req 1.1–1.4 のクエリ合成設計に必要
- **Findings**:
  - L56-60: `[conditions[:area], conditions[:genre], conditions[:keyword]].compact.join(" ")`
  - シグネチャ: `build_text_query(conditions)` → String（変更しない）
  - `conditions[:genre]` は QueryParserService が "ラーメン" を set した状態で渡される
- **Implications**: `genre == "ラーメン"` を gate として定数ルックアップを追加する最小変更で対応可能

### `RAMEN_SYSTEM_PROMPT_TEMPLATE` 現状調査
- **Context**: Req 2.1–2.4 のプロンプト設計に必要
- **Findings**:
  - L24-41: 選定基準優先1位が `area/price_level` 一致。味・種類は2位
  - 除外基準: null rating と価格帯のみ。味/種類の除外指示なし
  - reason: 味の系統・麺の太さを含める指示はあるが「根拠を含める」「根拠不明な場合の明記」指示なし
  - `%<min>d` / `%<max>d` フォーマット変数あり → 維持必須
- **Implications**: 選定基準の優先順位を再構成し、除外基準と reason 規則に追記する

### テストカバレッジ調査
- **Findings**:
  - `google_places_service_spec.rb` L63-99: `build_text_query` の compact join と nil 除去をカバー
  - `recommendation_service_spec.rb` L410-494: ramen/izakaya mode dispatch テストあり
  - プロンプト内容の検証は `include?` によるキーワード存在確認パターン
- **Implications**: 新テストは同パターンで追加可能。既存テストへの影響なし

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| genre gate（採用） | `conditions[:genre] == "ラーメン"` を条件に定数ルックアップ | シグネチャ変更なし、後方互換 | キーワードの正規化がアップストリーム依存 | 最小変更 |
| mode パラメータ追加 | `build_text_query(conditions, mode)` にシグネチャ変更 | 意図が明示的 | 既存呼び出し全箇所の変更が必要 | オーバーキル |
| QueryParser での合成 | QueryParserService でクエリを合成 | 合成ロジックを集約 | QueryParser の責務を超える | 境界違反 |

## Design Decisions

### Decision: `conditions[:genre]` gate vs mode パラメータ
- **Context**: `build_text_query` のシグネチャを変更せずにラーメン固有ロジックを追加する方法
- **Alternatives Considered**:
  1. `genre == "ラーメン"` を条件に分岐（採用）
  2. `mode` パラメータを `build_text_query` に追加
- **Selected Approach**: `conditions[:genre] == "ラーメン"` gate
- **Rationale**: ramen-search-mode スペックが `conditions[:genre]` を "ラーメン" に set することを保証している。シグネチャ変更と呼び出し側修正を避けられる
- **Trade-offs**: キーワードの正規化（"辛口" → "辛" 等）がアップストリームに依存するが、Tier 1 の制約内では許容範囲
- **Follow-up**: QueryParserService が返すキーワードの形式が変わった場合は定数の見直しが必要

### Decision: RAMEN_STANDALONE_TYPES でジャンルを省略
- **Context**: "まぜそば" 検索に "ラーメン" を付与すると "まぜそばラーメン" という不自然なクエリになる
- **Selected Approach**: RAMEN_STANDALONE_TYPES に該当するキーワードはジャンルを省略し、キーワード単体で検索
- **Rationale**: Google Places は "新潟市中央区 まぜそば" で十分な精度の候補を返す
- **Trade-offs**: ラーメン店以外の店（例: 居酒屋のまぜそばメニュー）が混入する可能性があるが、実用上問題ないレベルとする

## Risks & Mitigations
- **キーワード正規化ずれ** — QueryParserService が "辛口" を返した場合 RAMEN_FLAVOR_MODIFIERS にヒットせず fallback に入る。Tier 1 では許容（Tier 2 で正規化強化を検討）
- **プロンプト除外強化による推薦数不足** — 候補が `min_count` を下回る可能性。`RecommendationService#call` の `min_count: 3` ガードが影響範囲外で維持されており問題なし
- **定数リストの網羅性** — RAMEN_FLAVOR_MODIFIERS / RAMEN_STANDALONE_TYPES は代表語のみ。新語追加は定数更新で対応可能
