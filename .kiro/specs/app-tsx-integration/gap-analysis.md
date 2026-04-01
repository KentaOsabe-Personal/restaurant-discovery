# ギャップ分析レポート: app-tsx-integration

## 分析サマリー

- **スコープ**: `App.tsx`（スタブ）を完全な統合コンポーネントへ拡張し、`App.test.tsx`・任意で`RecommendationList.tsx`を新規作成する
- **前提コンポーネント**: `SearchInput`・`PlaceCard`・`searchPlaces`・型定義はすべて実装済みで、インターフェースが要件と完全に一致している
- **主な課題**: `App.tsx`は現在ほぼスタブ状態であり、状態管理・非同期処理・条件分岐レンダリングをゼロから追加する必要がある
- **推奨アプローチ**: Option B（`RecommendationList.tsx`を新規作成して`App.tsx`に統合）が責務分離・テスト容易性の観点から最適
- **工数/リスク**: S（1〜3日）/ Low（すべての依存物が揃っており、パターンも確立済み）

---

## 1. 現状調査

### 既存アセット

| ファイル | 状態 | 要件との適合性 |
|---|---|---|
| `frontend/src/App.tsx` | スタブ（`<h1>`のみ） | 大幅な拡張が必要 |
| `frontend/src/api/search.ts` | 実装済み | `searchPlaces(query): Promise<SearchResponse>` — 完全一致 |
| `frontend/src/types/search.ts` | 実装済み | `Recommendation`・`SearchResponse`（`photo_url`/`opening_hours`削除済み）— 完全一致 |
| `frontend/src/components/SearchInput.tsx` | 実装済み | `onSubmit: (query: string) => void`・`isLoading?: boolean` — 完全一致 |
| `frontend/src/components/PlaceCard.tsx` | 実装済み | `PlaceCardProps = Recommendation`（全フィールド）— 完全一致 |
| `frontend/src/test/setup.ts` | 実装済み | `@testing-library/jest-dom` を import |

### 既存テストパターン

- `vi.fn()` でコールバックをモック
- `render` / `screen` / `fireEvent` を使用（`@testing-library/react`）
- `describe` / `it` / `expect` はインポート不要（Vitest globals）
- 非同期テストには `waitFor` / `findBy*` が利用可能（未使用だが設定済み）
- `vi.mock()` によるモジュールモックは未使用だが、Vitest の標準機能として利用可能

---

## 2. 要件別フィージビリティ分析

### 要件→アセットマッピング

| 要件 | 必要なもの | 現状 | ギャップ |
|---|---|---|---|
| R1: SearchInput 統合 | `<SearchInput onSubmit={...} isLoading={...} />` | `SearchInput` 実装済み | App.tsx への import・レンダリングが未実装 |
| R2: 状態管理・searchPlaces 呼び出し | `useState` + `searchPlaces` | `searchPlaces` 実装済み | `isLoading`・`recommendations`・`error` の state が未実装 |
| R3: ローディング表示 | `isLoading` 状態・インジケーター | — | ローディング UI・`isLoading` 伝播が未実装 |
| R4: 結果リスト表示 | `PlaceCard` リスト・`key` プロパティ | `PlaceCard` 実装済み | リスト構造・key 付与が未実装 |
| R5: エラー状態表示 | `error` state・条件付きレンダリング | — | エラー UI 全体が未実装 |
| R6: 初期状態・空状態 | 条件付きレンダリング | — | 初期・空状態のガード条件が未実装 |
| R7: コンポーネント構成 | TypeScript strict 準拠 | strict 設定済み | App.tsx の実装本体が未実装 |
| R8: テストカバレッジ | `App.test.tsx`（vi.mock + waitFor） | テスト基盤は整備済み | `App.test.tsx` ファイル自体が存在しない |

### 複雑度シグナル

- 非同期処理（`async/await`）: 中程度 — `searchPlaces` を `try/catch` で呼び出す標準的なパターン
- 条件付きレンダリング: 低〜中 — 4状態（初期・ローディング・エラー・結果）の排他制御
- テストのモック: 中程度 — `vi.mock('../api/search')` + `vi.mocked()` + `waitFor` の組み合わせが初出

---

## 3. 実装アプローチ

### Option A: App.tsx にすべてインライン実装

- `App.tsx` に状態管理・`searchPlaces` 呼び出し・結果リストレンダリングをすべて記述
- `RecommendationList.tsx` を作成しない

**✅ メリット**
- ファイル数が最小（2ファイル: App.tsx + App.test.tsx）
- 小規模な実装ならシンプルで読みやすい

**❌ デメリット**
- `App.tsx` が肥大化しやすい（状態管理・UI・リストレンダリングが混在）
- リスト部分を単独でテストしにくい

---

### Option B: RecommendationList.tsx を新規作成して App.tsx に統合（推奨）

- `RecommendationList.tsx`: `recommendations: Recommendation[]` を受け取り `PlaceCard` のリストを返す
- `App.tsx`: 状態管理・`searchPlaces` 呼び出し・`RecommendationList` のレンダリングに専念

**✅ メリット**
- 責務の分離が明確（App = 状態管理、RecommendationList = 表示ロジック）
- `RecommendationList` を単独でテスト可能
- 要件7.2が明示的に `RecommendationList` コンポーネントを例示している

**❌ デメリット**
- ファイルが1つ増える（3ファイル: App.tsx + RecommendationList.tsx + App.test.tsx）

---

### Option C: ハイブリッド（段階的）

- 初期実装は Option A でインライン、後から `RecommendationList` に切り出す

**✅ メリット**: リスクの低い段階的な実装が可能
**❌ デメリット**: 二度手間になりやすい。今回のスコープは明確なので不要。

---

## 4. 技術的注意点

### `App.test.tsx` のモック戦略

```typescript
// vi.mock は describe/it の外に配置する必要がある
vi.mock('../api/search');
import { vi } from 'vitest';
import { mocked } from 'vitest';

// 各テストで vi.mocked(searchPlaces).mockResolvedValue({...}) を使用
// 非同期完了を待つために waitFor または findByText を使用する
```

### `key` プロパティの選択

`Recommendation` 型に一意 ID フィールドがないため、`google_maps_url` を `key` に使用するか、配列インデックスをフォールバックとして使用する。`google_maps_url` は XSS 対策済みかつ一意性が期待できるため推奨。

### 状態の排他制御

`error` 状態が存在するときは `recommendations` をクリアする（R5.2）。新規検索開始時に `error` もクリアする（R2.3・R5.3）。`isLoading` 中は `SearchInput` に `isLoading={true}` を渡す（R3.2）。

---

## 5. 工数・リスク評価

| 項目 | 評価 | 根拠 |
|---|---|---|
| 工数 | **S**（1〜3日） | 前提コンポーネントがすべて揃っており、React Hooks の標準パターン（useState + async）のみで実装可能 |
| リスク | **Low** | 外部連携なし・確立済みパターン・型定義完備・テスト基盤整備済み。唯一の新要素は `vi.mock()` を使った非同期テスト |

---

## 6. デザインフェーズへの推奨事項

### 採用推奨アプローチ
**Option B**（`RecommendationList.tsx` 新規作成 + `App.tsx` 拡張）

### 設計フェーズで確定すべき決定事項

1. **`RecommendationList` の Props インターフェース**: `recommendations: Recommendation[]` のみか、空状態メッセージも含めるか
2. **ローディングインジケーターの形式**: テキスト（「検索中...」）かスピナーコンポーネントか（要件はどちらも許容）
3. **エラーメッセージの内容**: 汎用文言か、エラーオブジェクトの内容を含めるか
4. **`App.test.tsx` のモック配置**: `vi.mock` のホイスティング挙動に合わせたファイル構成

### Research Needed（なし）
全依存物が確認済みのため、追加調査は不要。
