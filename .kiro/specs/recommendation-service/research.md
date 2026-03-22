# Research & Design Decisions: recommendation-service

---
**Purpose**: RecommendationService 設計フェーズの調査記録と設計判断の根拠を残す。

---

## Summary

- **Feature**: `recommendation-service`
- **Discovery Scope**: Extension（既存 `QueryParserService` パターンの拡張）
- **Key Findings**:
  - `ruby-openai ~> 8.3` は既にインストール済み。新規 gem 追加不要
  - `QueryParserService` が直接の実装テンプレートとなる（定数・クライアント構築・エラー処理パターンが同一）
  - JSON Schema 設計で「名前ルックアップ方式」を選択し、AI によるデータ改変リスクを排除

---

## Research Log

### OpenAI Structured Outputs の挙動確認

- **Context**: `recommendations` 配列の JSON Schema を設計するにあたり、既存の `QueryParserService` のスキーマ構造を参照
- **Sources Consulted**: 既存コード `query_parser_service.rb`（`RESPONSE_SCHEMA` 定数）
- **Findings**:
  - `ruby-openai` の `chat` メソッドで `response_format:` パラメータに JSON Schema を渡す
  - `strict: true` + `additionalProperties: false` + 全フィールドを `required` に指定することで構造が保証される
  - 配列型の場合は `type: "array", items: { type: "object", properties: {...} }` で表現可能
- **Implications**: `QueryParserService` と同一のパターンで `RESPONSE_SCHEMA` 定数を定義できる。型は `{ type: %w[string null] }` の nullable 形式も使用可能

### `/openai_apikey` ファイル共有の競合チェック

- **Context**: `QueryParserService` と同じ `/openai_apikey` を使用するため競合がないか確認
- **Sources Consulted**: 既存コード `query_parser_service.rb` の `API_KEY_PATH`、`docker-compose.yml`
- **Findings**:
  - 両サービスは同じファイルを読み取るが、各リクエスト時に独立して `File.read` を呼ぶため競合なし
  - Docker Compose の `./openai_apikey:/openai_apikey:ro` マウントは既に設定済み
- **Implications**: インフラ変更不要

---

## Architecture Pattern Evaluation

| Option | 説明 | 強み | リスク/制約 | 備考 |
|--------|------|------|------------|------|
| A: 名前ルックアップ | AI は `name` + `reason` のみ返す。元の `places` 配列から一致する店舗データを結合 | AI によるデータ改変リスクなし。JSON Schema が軽量 | 名前が完全一致しない場合に結合失敗の可能性 | **採用** |
| B: 全フィールド返却 | AI が全フィールド（名前・評価・住所等）を返す | 単純な実装 | AI が rating・address を微妙に変形する hallucination リスクあり | 不採用 |

---

## Design Decisions

### Decision: JSON Schema 構造 — 名前ルックアップ方式の採用

- **Context**: RecommendationService の出力に `reason` フィールドを追加するにあたり、AI にどの情報を返させるかを決定する必要があった
- **Alternatives Considered**:
  1. 全フィールド返却方式 — AI が全フィールドを出力する
  2. 名前ルックアップ方式 — AI は `name` と `reason` のみ出力し、元の `places` 配列から他フィールドを結合する
- **Selected Approach**: 名前ルックアップ方式。OpenAI は `recommendations: [{ name: "...", reason: "..." }]` のみ返す。Ruby 側でこの `name` を使って `places` 配列から該当ハッシュを検索し、`reason` を付加して返す
- **Rationale**: Google Places API から取得した評価・住所・URL は正確な値として保持すべき。AI に再出力させると hallucination により値が変形するリスクがある。名前ルックアップ方式はこのリスクを完全に排除する
- **Trade-offs**:
  - ✅ データ正確性が保証される
  - ✅ JSON Schema が軽量（2フィールドのみ）
  - ❌ `name` の完全一致が前提。AI が名前を微妙に変形した場合、結合失敗となる
- **Follow-up**: System Prompt に「候補リストに含まれる店舗名を変更せずそのまま使用すること」を明示する

### Decision: 候補が名前で一致しない場合の挙動

- **Context**: 名前ルックアップ方式で `places` 配列に存在しない名前を AI が返した場合の処理
- **Alternatives Considered**:
  1. 一致しない店舗はスキップし、一致した分のみ返す
  2. 例外を raise する
- **Selected Approach**: 一致しない名前はスキップする。`Array#filter_map` で一致するものだけを返す
- **Rationale**: AI の出力品質依存で実行時エラーを出すのは UX を損なう。スキップして残りを返す方がより堅牢
- **Trade-offs**:
  - ✅ 部分的な hallucination に対して堅牢
  - ❌ 期待より少ない件数が返る可能性（ただし要件 1.2 で「3件未満でも正常終了」と定義済み）

---

## Risks & Mitigations

- **AI による店舗名の微変形** — System Prompt に「提供された candidates リストの name フィールドをそのまま使用すること」を明記する
- **推薦件数が0件になるケース** — 名前が全て不一致の場合は空配列を返す。SearchController（Chunk 6）はこれを正常として扱う
- **OpenAI API のレート制限** — 個人利用ツールのため初期スコープでは対処しない（QueryParserService と同方針）

---

## References

- `backend/app/services/query_parser_service.rb` — 実装テンプレート
- `backend/app/services/google_places_service.rb` — 入力データの供給元
- `.kiro/specs/recommendation-service/gap-analysis.md` — 実装アプローチ評価
- `app-design.md` Section 11 Chunk 5 — 入出力仕様の原典
