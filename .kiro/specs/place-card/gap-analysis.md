# ギャップ分析: place-card

## 分析サマリー

- **スコープ**: `frontend/src/components/PlaceCard.tsx` の新規作成。既存ファイルへの変更は最小限
- **主要ギャップ**: `PlaceCard` コンポーネント本体が未実装。ただし依存する型定義・テストインフラはすべて整備済み
- **注意点**: 既存の `Recommendation` 型（`types/search.ts`）に `photo_url` / `opening_hours` が含まれているが、PlaceCard の Props はスコープ外の6フィールドのみに絞る
- **設計判断が必要**: `price_level` 文字列（`PRICE_LEVEL_MODERATE` 等）のユーザー向け表示変換をどう行うか
- **推奨アプローチ**: Option B（新規コンポーネント作成）。SearchInput と同一パターンで実装可能

---

## 1. 現状調査

### 既存アセット

| ファイル | 用途 | place-card との関係 |
|---|---|---|
| `frontend/src/types/search.ts` | `Recommendation` 型定義 | Props 型として利用可能（要注意: スコープ外フィールドあり） |
| `frontend/src/components/SearchInput.tsx` | 検索入力コンポーネント | 実装パターンの直接テンプレート |
| `frontend/src/components/SearchInput.test.tsx` | SearchInput のテスト | テスト記述パターンのテンプレート |
| `frontend/src/api/search.ts` | APIクライアント | PlaceCard は直接依存しない |
| `frontend/src/test/setup.ts` | jest-dom 初期化 | 既存のまま利用 |

### 確立済みパターン（SearchInput から）

```typescript
// Props インターフェースを同ファイルで export
export interface SearchInputProps { ... }

// 関数コンポーネント（React.FC 未使用）
function SearchInput({ prop1, prop2 = defaultValue }: SearchInputProps) { ... }

// default export
export default SearchInput;
```

```typescript
// テスト（SearchInput.test.tsx）
import { render, screen, fireEvent } from '@testing-library/react';
import SearchInput from './SearchInput';

describe('SearchInput', () => {
  const mockFn = vi.fn();
  describe('グループ名', () => {
    beforeEach(() => { ... });
    it('テストケース', () => { ... });
  });
});
```

### 命名・配置規約（steering/structure.md 準拠）

- コンポーネントファイル: `PascalCase.tsx`（例: `PlaceCard.tsx`）
- テストファイル: 同階層に `*.test.tsx`（例: `PlaceCard.test.tsx`）
- Props インターフェース: 同ファイルで export（`PlaceCardProps`）

---

## 2. 要件フィージビリティ分析

### 要件対アセットマップ

| 要件 | 技術的ニーズ | 既存アセット | ギャップ |
|---|---|---|---|
| 1: 店舗基本情報の表示 | JSX テキスト表示、Props 受け取り | SearchInput パターン | **Missing**: PlaceCard 本体 |
| 2: 評価の表示 | `null` 条件分岐 | `Recommendation.rating: number \| null` 型 | **Missing**: PlaceCard 本体 |
| 3: 価格帯の表示 | `null` 条件分岐、文字列変換 | `Recommendation.price_level: string \| null` 型 | **Missing**: PlaceCard 本体 + **Unknown**: 表示文字列変換ロジック |
| 4: Google Maps リンク | `<a target="_blank" rel="...">` | — | **Missing**: PlaceCard 本体 |
| 5: Props インターフェース | TypeScript strict 準拠 | `Recommendation` 型（部分利用） | **Constraint**: 既存型に不要フィールドあり |
| 6: アクセシビリティ | `rel`, 見出し要素 | SearchInput の aria パターン | **Missing**: PlaceCard 本体 |

### 制約事項

**Constraint: `Recommendation` 型の不整合**

既存の `frontend/src/types/search.ts` の `Recommendation` 型には `photo_url: string | null` と `opening_hours: OpeningHours | null` が含まれているが、バックエンド API Contract はこれらフィールドを返さない（google-places-service フィールドマスク最小化方針による）。

PlaceCard の Props 設計で2つのアプローチが考えられる:
- **A**: `Recommendation` 型をそのまま Props として受け取り（`photo_url` / `opening_hours` は無視）
- **B**: PlaceCard 専用の Props インターフェースを6フィールドで定義

**Unknown: `price_level` の表示変換**

APIから返る値は `"PRICE_LEVEL_INEXPENSIVE"` / `"PRICE_LEVEL_MODERATE"` / `"PRICE_LEVEL_EXPENSIVE"` / `"PRICE_LEVEL_VERY_EXPENSIVE"` の enum 文字列。ユーザー向けにそのまま表示するか、日本語（例: 「安め」「普通」）や記号（例: `¥` / `¥¥` / `¥¥¥`）に変換するかは設計フェーズでの決定が必要。

---

## 3. 実装アプローチの選択肢

### Option A: `SearchInput.tsx` を拡張

`SearchInput.tsx` にカード表示ロジックを追加。

- ✅ ファイル数が増えない
- ❌ 単一責任原則に違反（検索入力とカード表示が混在）
- ❌ Chunk 8 の実装と混在し、テストが複雑化

**評価**: 不適切。責務が全く異なる。

---

### Option B: 新規コンポーネント作成（推奨）

`frontend/src/components/PlaceCard.tsx` を新規作成。`SearchInput.tsx` と同一パターンで実装。

- ✅ 単一責任: カード表示のみを担当
- ✅ SearchInput の確立済みパターンをそのまま踏襲
- ✅ 独立テストが容易
- ✅ Chunk 10 での `RecommendationList` 組み込みがシンプル
- ❌ ファイルが1つ増える（許容範囲）

**評価**: 適切。プロジェクト規約と完全一致。

---

### Option C: ハイブリッド（PlaceCard + 変換ユーティリティ）

`PlaceCard.tsx` に加え、`price_level` 変換用のユーティリティ関数を別ファイルに切り出す。

- ✅ 変換ロジックが再利用可能
- ❌ 初期実装に余分な複雑さを追加（YAGNI 原則）

**評価**: 変換が複雑になる場合の将来オプション。初期実装では Option B の中に inline で実装するのが適切。

---

## 4. 実装複雑度 & リスク

| 観点 | 評価 | 根拠 |
|---|---|---|
| **努力量** | S（1〜3日） | SearchInput パターンの踏襲。外部依存なし。JSX + 条件分岐のみ |
| **リスク** | Low | 確立済みパターン、既存型定義・テストインフラ完備、外部統合なし |

---

## 5. 設計フェーズへの推奨事項

### 採用アプローチ
**Option B** — 新規コンポーネント作成（SearchInput パターン踏襲）

### 設計フェーズでの決定事項

1. **Props 設計**: `Recommendation` 型をそのまま利用 vs 専用 `PlaceCardProps` の定義
   - 推奨: `PlaceCardProps` を6フィールドで独立定義（スコープ外フィールドを Props に含めない）

2. **`price_level` の表示変換**: enum 文字列をどう見せるか
   - 候補: 日本語ラベル（安め/普通/高め/とても高め）または `¥` 記号
   - inline 変換関数（`formatPriceLevel(price_level: string | null): string`）で実装

3. **見出しレベル**: `<h2>` か `<h3>` か
   - App.tsx の DOM 構造（Chunk 10 実装後）との関係で決定

### Research Needed（設計フェーズ）

- `price_level` 表示フォーマット: プロジェクト内で統一方針があるか確認（app-design.md 参照）
