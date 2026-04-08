# リサーチ & 設計決定ログ: search-condition-tags

---
**目的**: 技術設計に影響するディスカバリー結果・アーキテクチャ調査・意思決定の根拠を記録する。

---

## サマリー

- **機能**: `search-condition-tags`
- **ディスカバリースコープ**: Extension（既存システムの拡張）
- **主要所見**:
  - `QueryParserService` は既に `keyword` を抽出・返却しているが、`SearchController` のレスポンス構築時に意図的に除外されている（L32–37, L44–49）
  - `search_spec.rb:48` に `not_to have_key("keyword")` アサーションが存在し、実装後に反転が必須
  - 新規外部依存は不要。全て既存スタック（TypeScript strict / React 19 / Tailwind CSS v4 / Rails 8.1）の範囲内

---

## リサーチログ

### トピック1: バックエンド — `keyword` 除外の経緯と修正箇所

- **契機**: ギャップ分析で `QueryParserService` の戻り値に `keyword` が含まれていることを確認したが、コントローラが除外していた
- **調査ファイル**: `backend/app/controllers/api/search_controller.rb`
- **所見**:
  - `parsed_conditions` ハッシュの構築箇所が2か所ある（空結果パス L31–38、通常パス L44–50）
  - 両方に `keyword: parsed_conditions[:keyword]` を追加するだけで対応可能
  - `QueryParserService` の変更は不要
- **影響**: バックエンドの変更は最小限。既存テストの `not_to have_key` を `to have_key` に反転する必要あり

### トピック2: フロントエンド — 既存チップUIパターンの調査

- **契機**: 要件5（視覚的タグデザイン）の実装に既存パターンを活用できるか確認
- **調査ファイル**: `frontend/src/components/SearchHistoryChips.tsx`
- **所見**:
  - `flex flex-wrap items-center gap-2` のレイアウトパターンが確立済み
  - `px-3 py-1 rounded-full border border-gray-300 bg-white text-sm` がチップの基本スタイル
  - `SearchConditionTags` は読み取り専用表示のため、ボタン要素不要（`div` または `span` で実装）
- **影響**: 既存スタイルパターンを踏襲することで一貫したUIを維持できる

### トピック3: フロントエンド — `App.tsx` のステート設計

- **契機**: 要件3-8「新しい検索が開始されたときにタグをクリアする」をどう実装するか
- **調査ファイル**: `frontend/src/App.tsx`
- **所見**:
  - `handleSearch` 関数の冒頭で `setRecommendations(null)` を呼んでいる
  - 同じタイミングで `setParsedConditions(null)` を追加することでクリア要件を自然に満たせる
  - `response.parsed_conditions` は `SearchResponse` 型に含まれているため、API取得後に `setParsedConditions(response.parsed_conditions)` でセットする
- **影響**: `App.tsx` に `useState<ParsedConditions | null>(null)` の追加のみで対応可能

### トピック4: 価格帯マッピングの配置判断

- **契機**: ギャップ分析で「コンポーネント内インライン vs. `src/utils/`」の判断を設計フェーズへ持越し
- **検討**:
  - 現時点で `price_level` マッピングを使用するコンポーネントは `SearchConditionTags` のみ
  - YAGNI原則: 単一コンポーネントでのみ使用される定数を別ファイルに分離する根拠なし
  - 将来 `RecommendationCard` 等でも同マッピングが必要になった場合に抽出可能
- **決定**: `SearchConditionTags.tsx` 内にモジュールスコープ定数として定義する（インライン）

---

## アーキテクチャパターン評価

| オプション | 概要 | 強み | リスク / 制限 | 備考 |
|---------|------|------|------------|------|
| Option A: 既存コンポーネント拡張 | `RecommendationList` 等に条件タグを埋め込む | 新規ファイル最小 | 単一責任原則違反、テスト容易性低下 | 不採用 |
| Option B: 全新規コンポーネント | `SearchConditionTags` を独立作成、`App.tsx` のみ変更 | 責務分離明確、独立テスト可 | ファイル数微増（許容） | ほぼOption Cと同等 |
| **Option C: ハイブリッド（採用）** | 小さな修正は既存ファイルに、新責務は新ファイルに | バランスのとれた変更範囲、既存パターン活用 | なし | ギャップ分析の推奨アプローチ |

---

## 設計決定

### 決定1: チップのラベル表示形式

- **コンテキスト**: 要件5-3「条件種別のラベルを表示する」の具体的な形式
- **検討した選択肢**:
  1. ラベルと値を別々の要素に分ける（例: `[エリア]` + `[渋谷]`）
  2. `{ラベル}: {値}` を1つのチップにまとめる（例: `エリア: 渋谷`）
- **採用アプローチ**: 選択肢2 — `{conditionLabel}: {value}` を1チップで表示
- **根拠**: コンパクトで読みやすく、既存の `SearchHistoryChips` の1チップ1情報パターンと整合する
- **トレードオフ**: ラベルと値が同じチップ内にあるためラベルのみのスタイリング差別化が難しい。現時点では許容範囲
- **フォローアップ**: 視覚的に区別したい場合は `<span className="text-gray-500">ラベル:</span>` のようにネストできる

### 決定2: `parsedConditions` レンダリング条件

- **コンテキスト**: 要件3-6「全フィールドが null の場合は非表示」と要件3-7「ローディング中は非表示」
- **採用アプローチ**: `App.tsx` 側でレンダリング条件を制御する（`parsedConditions` が非 null かつ `isLoading` が false の場合のみ `SearchConditionTags` をレンダリング）
- **根拠**: `App.tsx` は既に `isLoading` を管理しており、条件ロジックをコンポーネント外で集中管理することで `SearchConditionTags` を純粋な表示コンポーネントとして保てる
- **トレードオフ**: null チェックは `SearchConditionTags` 内の「全フィールド null 時に何も表示しない」ガードも必要（防御的設計）

---

## リスクと軽減策

- 既存テスト `search_spec.rb:48` の `not_to have_key("keyword")` アサーション — 実装後に必ず反転させること
- `App.test.tsx` のフィクスチャに `keyword` フィールドがない — 既存テストの型エラーとなるため更新が必須
- TypeScript strict モード — `keyword` 追加後に型チェックが通ることをビルドで確認する

---

## 参考資料

- `backend/app/controllers/api/search_controller.rb` — 修正対象コントローラ（L31–38, L44–50）
- `backend/app/services/query_parser_service.rb` — 既に `keyword` を返却済み（変更不要）
- `backend/spec/requests/api/search_spec.rb:48` — 反転が必要なアサーション
- `frontend/src/types/search.ts` — `ParsedConditions` 型定義（L18–22）
- `frontend/src/components/SearchHistoryChips.tsx` — チップUIのTailwindパターン参照元
- `frontend/src/App.tsx` — ステート管理の統合箇所
