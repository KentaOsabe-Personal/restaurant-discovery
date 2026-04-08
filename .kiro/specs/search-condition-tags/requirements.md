# 要件定義書

## はじめに

本機能「解析条件タグ表示」は、ユーザーが自然文で入力した検索クエリをAIが解析した結果（エリア・ジャンル・価格帯・キーワード）を、検索結果画面に視覚的なタグ（チップ）として表示する機能です。これにより、ユーザーはAIが自分のクエリをどのように解釈したかを即座に確認でき、検索の透明性と使い勝手を向上させます。

現在、バックエンドの `QueryParserService` はクエリから `area`・`genre`・`price_level`・`keyword` の4フィールドを抽出していますが、`keyword` はAPIレスポンスに含まれておらず、フロントエンドの型定義にも存在しません。また、解析条件はUIに一切表示されていません。本機能はこのギャップを解消します。

## 要件

### 要件 1: APIレスポンスへの keyword フィールド追加

**目的:** ユーザーとして、キーワード条件もタグとして確認したいので、バックエンドが `keyword` を含む解析条件を返すようにしてほしい。

#### 受け入れ基準

1. The Search System shall include `keyword` field in the `parsed_conditions` object of the API response, alongside the existing `area`, `genre`, and `price_level` fields.
2. When `QueryParserService` extracts a null value for `keyword`, the Search System shall return `null` for that field in the response.
3. The Search System shall return `keyword` in all response paths (通常レスポンス・空結果レスポンスの両方).

---

### 要件 2: フロントエンド型定義の更新

**目的:** 開発者として、型安全な実装をしたいので、`ParsedConditions` 型に `keyword` フィールドが含まれていてほしい。

#### 受け入れ基準

1. The Frontend shall define `keyword: string | null` in the `ParsedConditions` type in `src/types/search.ts`.
2. The Frontend shall pass TypeScript strict-mode type checks with the updated `ParsedConditions` type including `keyword`.

---

### 要件 3: 解析条件タグの表示

**目的:** ユーザーとして、AIが自分のクエリをどう解釈したか知りたいので、検索結果画面に解析条件をタグとして表示してほしい。

#### 受け入れ基準

1. When 検索が成功し `parsed_conditions` に1件以上の非 null フィールドが存在する, the Search UI shall display a `SearchConditionTags` component showing each non-null parsed condition as an individual tag.
2. When `area` が非 null である, the Search UI shall display a tag with the area value.
3. When `genre` が非 null である, the Search UI shall display a tag with the genre value.
4. When `price_level` が非 null である, the Search UI shall display a tag with a human-readable Japanese label corresponding to the price level enum value.
5. When `keyword` が非 null である, the Search UI shall display a tag with the keyword value.
6. When すべての `parsed_conditions` フィールドが null である, the Search UI shall not render the `SearchConditionTags` component.
7. While 検索が実行中（isLoading が true）である, the Search UI shall not display the `SearchConditionTags` component.
8. When 新しい検索が開始される, the Search UI shall clear the previously displayed condition tags.

---

### 要件 4: 価格帯ラベルの変換

**目的:** ユーザーとして、価格帯を直感的に理解したいので、内部列挙値ではなく日本語ラベルで価格帯タグを表示してほしい。

#### 受け入れ基準

1. The Search UI shall map `PRICE_LEVEL_FREE` to `無料` for display.
2. The Search UI shall map `PRICE_LEVEL_INEXPENSIVE` to `リーズナブル` for display.
3. The Search UI shall map `PRICE_LEVEL_MODERATE` to `普通` for display.
4. The Search UI shall map `PRICE_LEVEL_EXPENSIVE` to `高め` for display.
5. The Search UI shall map `PRICE_LEVEL_VERY_EXPENSIVE` to `超高級` for display.

---

### 要件 5: タグの視覚的デザイン

**目的:** ユーザーとして、解析条件が他のUI要素と区別できるように見てほしいので、タグは視覚的に明確なスタイルで表示してほしい。

#### 受け入れ基準

1. The Search UI shall render each condition tag as a visually distinct chip element using Tailwind CSS classes.
2. The Search UI shall render condition tags in a horizontally wrapped layout that adjusts to different screen widths.
3. The Search UI shall display each tag with a label indicating the condition type (例: エリア・ジャンル・価格帯・キーワード) and its value.

