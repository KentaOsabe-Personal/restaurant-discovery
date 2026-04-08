# ギャップ分析: search-condition-tags

## 分析サマリー

- **スコープ**: バックエンド1ファイル修正・フロントエンド1型修正・1コンポーネント新規作成・Appステート拡張の4点
- **最大の発見**: `QueryParserService` は既に `keyword` を抽出・返却しているが、`SearchController` のレスポンス構築時に意図的に除外されている（2箇所）
- **既存テストの更新必須**: `search_spec.rb:48` に `not_to have_key("keyword")` のアサーションがあり、実装後は「含む」に反転させる必要がある
- **推奨アプローチ**: 既存ファイルの拡張（型・コントローラ・App）＋新規コンポーネント作成のハイブリッド (Option C)
- **工数/リスク**: S（1〜3日）/ Low

---

## 1. 現状調査

### 関連ファイル・モジュール

| ファイル | 用途 | 本機能との関係 |
|---|---|---|
| `backend/app/services/query_parser_service.rb` | クエリ解析（OpenAI） | `keyword` を既に抽出・返却済み |
| `backend/app/controllers/api/search_controller.rb` | 検索エンドポイント | `parsed_conditions` に `keyword` を含めていない（2箇所） |
| `backend/spec/requests/api/search_spec.rb` | コントローラのリクエストスペック | `not_to have_key("keyword")` アサーションが存在する |
| `frontend/src/types/search.ts` | TypeScript型定義 | `ParsedConditions` に `keyword` フィールドがない |
| `frontend/src/App.tsx` | アプリケーションルート | `parsed_conditions` をステートに保持していない |
| `frontend/src/App.test.tsx` | Appの統合テスト | `parsed_conditions` フィクスチャに `keyword` なし |
| `frontend/src/components/SearchHistoryChips.tsx` | 検索履歴チップUI | 類似チップUIのTailwindパターン参照可 |

### アーキテクチャ上の制約

- フロントエンドは TypeScript strict モード（`noUnusedLocals` 等）— 型変更は型チェックに即影響する
- バックエンドは `render json:` で直接レスポンス構築（jbuilder不使用）— 変更箇所が明確
- コンポーネントは `src/components/` に PascalCase で配置、テストは同階層に `*.test.tsx`

---

## 2. 要件フィージビリティ分析

### 要件→既存資産マッピング

| 要件 | 対応する既存資産 | ステータス |
|---|---|---|
| 要件1: APIレスポンスに `keyword` 追加 | `search_controller.rb` の2つの `render json:` ブロック（L31–38, L44–50） | **Missing** — 追加するだけ |
| 要件2: `ParsedConditions` 型に `keyword` 追加 | `frontend/src/types/search.ts:18–22` | **Missing** — 1行追加 |
| 要件3: `SearchConditionTags` コンポーネント | 存在しない | **Missing** — 新規作成 |
| 要件3: `App.tsx` での `parsed_conditions` 表示制御 | `App.tsx:36–42`（現在は `recommendations` のみ保持） | **Missing** — ステート追加・コンポーネント配置 |
| 要件4: 価格帯ラベル変換マッピング | 存在しない | **Missing** — コンポーネント内or別ファイルで定義 |
| 要件5: Tailwind CSS チップスタイル | `SearchHistoryChips.tsx` にchip UIパターンあり | **参照可能** |

### 技術ニーズ

- **データ変換**: `price_level` enum → 日本語ラベルのマッピング（純粋な定数オブジェクト）
- **UIコンポーネント**: 横並びFlexラップ + ラベル+値の2行または1行チップ
- **ステート管理**: `App.tsx` に `parsedConditions: ParsedConditions | null` ステート追加
- **テスト更新**: バックエンド1スペック + フロントエンド既存テストのフィクスチャ更新

---

## 3. 実装アプローチ案

### Option A: 既存コンポーネントの拡張のみ

**概要**: `RecommendationList` 等に条件タグを埋め込む

- **対象ファイル**: `RecommendationList.tsx`、`App.tsx`、型定義
- **問題**: `SearchConditionTags` は検索結果と独立した責務を持つため、既存コンポーネントに埋め込むと単一責任原則に違反する
- ✅ 新規ファイル最小
- ❌ `RecommendationList` の責務が曖昧になる
- ❌ テスト容易性が低下

### Option B: 全て新規コンポーネントで作成

**概要**: `SearchConditionTags` を独立コンポーネントとして作成、`App.tsx` のみ変更

- **対象ファイル**: 新規 `SearchConditionTags.tsx` + テスト、既存 `App.tsx`・型・コントローラの修正
- **統合点**: `App.tsx` から `parsedConditions` と `isLoading` を渡す
- ✅ 明確な責務分離、単独テスト可
- ✅ 既存コンポーネントへの影響なし
- ❌ ファイル数が微増（許容範囲）

### Option C: ハイブリッドアプローチ（推奨）

**概要**: 「小さな修正は既存ファイルに」「新責務は新ファイルに」の原則に従う

**既存ファイルの変更:**
1. `search_controller.rb` — `parsed_conditions` に `keyword` を追加（2箇所）
2. `frontend/src/types/search.ts` — `ParsedConditions` に `keyword: string | null` を追加
3. `frontend/src/App.tsx` — `parsedConditions` ステート追加、`SearchConditionTags` を配置
4. テスト更新（`search_spec.rb` アサーション反転、`App.test.tsx` フィクスチャ）

**新規作成:**
5. `frontend/src/components/SearchConditionTags.tsx` — タグ表示コンポーネント（価格帯マッピング内包）
6. `frontend/src/components/SearchConditionTags.test.tsx` — テスト

- ✅ バランスのとれた変更範囲
- ✅ 既存パターンを活用（チップUI: `SearchHistoryChips.tsx` 参照）
- ✅ 小さな変更は最小限の修正で対応

---

## 4. 注意点・設計フェーズへの持越し事項

### 既存テストとの競合（要注意）

`backend/spec/requests/api/search_spec.rb:48`:
```ruby
expect(json["parsed_conditions"]).not_to have_key("keyword")
```
このアサーションは現在のコントローラ実装を正確に反映しているが、要件1の実装後は **`to have_key("keyword")` に反転** させる必要がある。

### `App.tsx` のステート設計

現在 `App.tsx` は `parsed_conditions` を完全に無視している。新検索開始時にタグをクリアする要件（要件3-8）は、`setRecommendations(null)` と同じタイミングで `setParsedConditions(null)` を呼ぶことで対応可能。

### 価格帯マッピングの配置

`SearchConditionTags.tsx` 内にインラインで定義するか、`src/utils/priceLevelLabels.ts` として分離するか判断が必要。マッピングが1コンポーネントでのみ使用される場合はインライン推奨（YAGNI原則）。

---

## 5. 複雑度・リスク評価

| 項目 | 評価 | 根拠 |
|---|---|---|
| **工数** | **S（1〜3日）** | 既存パターンの踏襲のみ、外部依存なし、全て確立済みのスタック |
| **リスク** | **Low** | コントローラは単純な追加、型変更は型チェックで即検証可、UIは新規独立コンポーネント |

---

## 6. 設計フェーズへの推奨事項

- **推奨アプローチ**: Option C（ハイブリッド）を採用
- **設計フェーズで決定すべきこと**:
  1. `SearchConditionTags` のチップデザイン詳細（ラベル+値を1つのチップにするか、ラベルを接頭辞にするか）
  2. 価格帯マッピングのファイル配置（コンポーネント内インライン vs. `src/utils/`）
  3. `App.tsx` での `parsed_conditions` ステート型（`ParsedConditions | null`）
- **Research Needed**: なし（全て既知の技術・パターン）
