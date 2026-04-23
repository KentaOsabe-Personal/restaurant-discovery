# Requirements Document

## Introduction
ラーメン検索精度向上（Tier 1: APIコスト変更なし）。
ラーメンモードで味・種類を指定した検索において、
Google Places へのクエリ合成とAI推薦プロンプトを改善し、
指定した味・種類に合致しない店の混入を減らす。
Google Places APIの追加フィールド取得は行わない。

## Boundary Context
- **In scope**:
  - ラーメンモード検索時のGoogle Placesクエリ合成（味修飾語・独立種類語の検出と合成）
  - ラーメンAI推薦プロンプトの選定基準・除外基準・推薦理由規則の強化
- **Out of scope**:
  - Google Places API追加フィールド取得（editorialSummary / reviews 等）
  - フロントエンドの変更
  - 居酒屋・バーモードのクエリロジック・プロンプト変更
- **Adjacent expectations**:
  - QueryParserServiceが自然文からキーワード（塩・醤油・まぜそば等）を正しく抽出していること（本スペックは抽出ロジックを変更しない）
  - ramen-search-modeスペックが確立したモードパラメータ（mode: "ramen"）を引き続き使用する

## Requirements

### Requirement 1: ラーメン検索クエリ合成

**Objective:** ユーザーとして、ラーメンモードで味・種類を指定したとき、意図した種類の店が候補として返ってきてほしい。「塩ラーメン」検索でまぜそば専門店や醤油専門店が多く混入しないようにするため。

#### Acceptance Criteria
1. While ラーメンモードで検索が実行される時, When キーワードが味修飾語（塩・醤油・味噌・豚骨・鶏白湯・鶏清湯・あっさり・こってり・辛）のいずれかである, the search service shall compose the Google Places text query as `[area] [keyword]ラーメン` (e.g., `新潟市中央区 塩ラーメン`) instead of `[area] ラーメン [keyword]`
2. While ラーメンモードで検索が実行される時, When キーワードが独立種類語（まぜそば・つけ麺・担々麺・油そば）のいずれかである, the search service shall compose the Google Places text query as `[area] [keyword]` without appending the genre `ラーメン` (e.g., `新潟市中央区 まぜそば`)
3. While ラーメンモードで検索が実行される時, When キーワードが味修飾語にも独立種類語にも該当しない, the search service shall compose the query using the existing join logic (`[area] [genre] [keyword]`)
4. While 居酒屋・バーモードで検索が実行される時, the search service shall compose the Google Places text query using the existing join logic unchanged regardless of keyword content

### Requirement 2: ラーメンAI推薦の味合致度優先化

**Objective:** ユーザーとして、ラーメンの推薦結果に指定した味・種類の看板メニューを持つ店を優先してほしい。店名から明らかに異なる種類の店を除外し、推薦理由に味・種類の根拠を含めてほしい。その方が選択ミスを減らし、より的確な店選びができるため。

#### Acceptance Criteria
1. While ラーメンモードでAI推薦を生成する時, When キーワードで味・種類が指定されている, the recommendation service shall prioritize stores that are likely to offer that flavor/type as a flagship or primary menu item
2. While ラーメンモードでAI推薦を生成する時, When 候補の中に指定された味・種類を提供していないことが店名または既知情報から明らかな店がある, the recommendation service shall exclude that store when candidates with higher match likelihood are available
3. While ラーメンモードでAI推薦を生成する時, the recommendation service shall include in each recommendation reason either the basis for why the store likely offers the specified flavor/type, or an explicit statement that the basis is unclear
4. While ラーメンモードでAI推薦を生成する時, the recommendation service shall apply rating and price_level exclusion rules with the same thresholds as before this change (rating < 3.5 and price mismatch remain as exclusion triggers)
