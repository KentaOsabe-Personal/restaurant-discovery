# Brief: ramen-search-precision

## Problem
ラーメン検索で味・種類を指定しても意図しない店が候補に混入する。
「塩ラーメン」と検索しても醤油専門店・まぜそば専門店が候補に上がり、LLMが除外根拠を持てないため推薦精度が低い。

## Current State
- `GooglePlacesService#build_text_query` は genre + keyword を単純連結（例: `新潟市中央区 ラーメン 塩`）。Google Places がラーメンを主クエリとして広く検索するため、味・種類の絞り込みが効かない。
- `RAMEN_SYSTEM_PROMPT_TEMPLATE` に「指定の味と明らかに異なる店を除外する」指示がない。
- LLM に渡す候補情報は店名・評価・価格帯・住所のみ（メニュー情報なし）。

## Desired Outcome
- 「塩ラーメン」→ `新潟市中央区 塩ラーメン` で検索し、塩専門店が上位候補に入る
- 「まぜそば」→ `新潟市中央区 まぜそば` で検索し、ラーメン店が混入しない
- LLM が店名・情報から明らかに異なる味・種類の店を除外できる
- Google Places API の追加フィールド取得なし（APIコスト変更なし）

## Approach
**Tier 1 改善（APIコスト変更なし）**:
- **2-A**: `build_text_query` に `RAMEN_FLAVOR_MODIFIERS` / `RAMEN_STANDALONE_TYPES` 定数を追加し、ラーメン × 味/種類キーワードを合成クエリに変換
- **2-B**: `RAMEN_SYSTEM_PROMPT_TEMPLATE` の選定基準・除外基準・出力規則を更新し、LLM が味/種類の合致度を主基準として使えるよう明示

## Scope
- **In**:
  - `backend/app/services/google_places_service.rb` — `RAMEN_FLAVOR_MODIFIERS` / `RAMEN_STANDALONE_TYPES` 定数追加、`build_text_query` 改修
  - `backend/app/services/recommendation_service.rb` — `RAMEN_SYSTEM_PROMPT_TEMPLATE` の選定基準・除外基準・出力規則を更新
- **Out**:
  - Google Places 追加フィールド取得（`editorialSummary`, `reviews` 等） — Tier 2 以降
  - フロントエンド変更
  - 居酒屋・バーモードへの影響

## Boundary Candidates
- `build_text_query` のクエリ合成ロジック（`google_places_service.rb`）
- `RAMEN_SYSTEM_PROMPT_TEMPLATE` のプロンプト文字列（`recommendation_service.rb`）

## Out of Boundary
- メニュー情報を LLM に渡す機能（Tier 2: `editorialSummary` 追加が前提）
- 「推しの店」判定（Tier 2: `reviews` 追加が前提）
- まぜそば・つけ麺等のサブジャンル別タブ

## Upstream / Downstream
- **Upstream**: `ramen-search-mode`（RAMEN_SYSTEM_PROMPT・build_text_query の原型を実装）
- **Downstream**: 将来の Tier 2 改善（editorialSummary / reviews 追加）

## Existing Spec Touchpoints
- **Extends**: `ramen-search-mode`（google_places_service / recommendation_service のラーメン固有ロジックを強化）
- **Adjacent**: `recommendation-tuning`（一般的な推薦チューニング）、`google-places-service`（Places API 基盤）

## Constraints
- Google Places API 追加フィールド取得禁止（APIコスト抑制方針）
- 居酒屋・バーモードの既存動作に影響を与えないこと
- `RAMEN_FLAVOR_MODIFIERS` / `RAMEN_STANDALONE_TYPES` に含まれないキーワードは従来の連結ロジックに fallback
