# ギャップ分析レポート

**対象機能**: クイック検索ボタン  
**分析日**: 2026-04-05

## 概要

1. **新規ファイル2点が必要**: `frontend/src/config/quickSearchPresets.ts`（設定ファイル）と `QuickSearchButtons.tsx`（UIコンポーネント）は未存在。
2. **SearchInput の状態設計に課題あり**: 現在 `query` ステートは `SearchInput` 内部で完結しており、要件 3.1（ボタンクリック時にテキストフィールドへ自動設定）を満たすには親へのステート持ち上げが必要。
3. **App.tsx の修正は軽微**: `handleSearch` / `isLoading` はすでに存在し、新コンポーネントへの受け渡しのみ対応。
4. **テスト規約が確立済み**: `SearchInput.test.tsx` / `App.test.tsx` のパターンが再利用可能で、新コンポーネントのテストも同様に書ける。
5. **バックエンド変更なし**: 本機能は純粋なフロントエンド改修であり、API・DB・Rails側の変更は不要。

---

## 1. 現状調査

### 1.1 既存アセット

| ファイル | 役割 | 関連度 |
|---|---|---|
| `src/App.tsx` | ルートコンポーネント。`handleSearch`, `isLoading`, `recommendations`, `error` を管理 | **高** |
| `src/components/SearchInput.tsx` | テキスト入力フォーム。`query` ステートを**内部**で保持 | **高（要修正）** |
| `src/components/SearchInput.test.tsx` | SearchInput のテスト（120行以上） | 影響確認必要 |
| `src/api/search.ts` | `searchPlaces(query)` API呼び出し | 変更不要 |
| `src/types/search.ts` | 型定義 | 変更不要 |

### 1.2 現在の SearchInput の設計

```tsx
// SearchInput は query ステートを内部で完全管理
const [query, setQuery] = useState<string>('');
// 親は onSubmit コールバックのみ受け取る構造
```

**課題**: クイック検索ボタンからテキストフィールドの値を制御できない。

### 1.3 既存パターン・規約

- **スタイリング**: Tailwind CSS v4（`border rounded-md px-3 py-2`、`bg-blue-600 text-white`等）
- **コンポーネント**: `isLoading` prop で無効化制御（`disabled={isLoading}`、`disabled:opacity-50 disabled:cursor-not-allowed`）
- **テスト**: Vitest + Testing Library、同階層に `*.test.tsx`、globals使用（`vi.fn()` 等）
- **パスエイリアス**: 未設定。相対パスで `import { X } from '../config/quickSearchPresets'` の形式

---

## 2. 要件フィージビリティ分析

### 要件 → 技術的要素マッピング

| 要件 | 必要な技術要素 | ギャップ判定 |
|---|---|---|
| 要件1: プリセット設定ファイル | `src/config/quickSearchPresets.ts`（新規） | **Missing** |
| 要件2: ボタン表示 | `QuickSearchButtons.tsx`（新規）、flex-wrap レイアウト | **Missing** |
| 要件3: ボタンクリック時にテキストフィールドへ設定 | `SearchInput` の query ステートを外部から制御する仕組み | **Missing（要設計判断）** |
| 要件3: 即時検索実行 | `handleSearch` の受け渡し（App.tsx → QuickSearchButtons） | **Constraint**（既存を再利用） |
| 要件4: ローディング中の無効化 | `isLoading` prop の受け渡し | **Constraint**（既存を再利用） |
| 要件5: アクセシビリティ / 44x44px | `<button>` + `disabled` 属性、`min-h-11 px-4` 等 | **Missing**（実装で対応） |

---

## 3. 実装アプローチ選択肢

### Option A: SearchInput を拡張（controlled 化） + 新コンポーネント追加

`query` ステートを `App.tsx` へ持ち上げ、`SearchInput` を完全な controlled component に変更する。

**変更ファイル**:
- `App.tsx` — `query` ステート追加、`SearchInput` に `value/onChange` を渡す
- `SearchInput.tsx` — `value` / `onChange` props を受け取る形に変更
- `SearchInput.test.tsx` — インターフェース変更に伴うテスト更新が必要
- 新規: `src/config/quickSearchPresets.ts`
- 新規: `src/components/QuickSearchButtons.tsx`（+ `*.test.tsx`）

**Trade-offs**:
- ✅ アーキテクチャが明確（single source of truth）
- ✅ テキストフィールドへの自動設定が素直に実現
- ❌ 既存 `SearchInput.test.tsx` の修正が必要（~10行程度）
- ❌ SearchInput の責務が若干変わる

### Option B: SearchInput に `externalQuery` prop を追加

`SearchInput` の内部ステートは保持しつつ、外から query を注入できる prop（`useEffect` で `setQuery` 呼び出し）を追加する。

**変更ファイル**:
- `SearchInput.tsx` — `externalQuery?: string` prop + `useEffect` 追加
- `App.tsx` — `externalQuery` ステート追加
- 新規: `src/config/quickSearchPresets.ts`
- 新規: `src/components/QuickSearchButtons.tsx`（+ `*.test.tsx`）

**Trade-offs**:
- ✅ 既存テストへの影響が最小（prop 追加のみで既存テストは通る）
- ❌ `useEffect` による状態同期は二重管理でバグリスクがある
- ❌ React のベストプラクティスに反する（derived state）

### Option C: QuickSearchButtons から SearchInput のステートを参照しない設計

ボタンクリック時にテキストフィールドへの設定は行わず、即時検索のみ実行する。（要件 3.1 を部分的に満たさない）

**Trade-offs**:
- ✅ 最小変更
- ❌ **要件 3.1 を満たさない** — 却下

---

## 4. 推奨アプローチ

**推奨: Option A**（SearchInput controlled 化 + 新コンポーネント追加）

理由:
- `query` を `App.tsx` で一元管理する方が React の設計原則に沿っており、保守性が高い
- `SearchInput.test.tsx` の修正量は少なく（prop インターフェースの更新程度）、既存テストの意図を損なわない
- Option B の `useEffect` による状態同期は将来的なバグの温床になりやすい

---

## 5. 実装複雑度・リスク評価

| 項目 | 評価 | 根拠 |
|---|---|---|
| **工数** | **S**（1〜3日） | 既存パターンの応用のみ。フロントエンド限定変更 |
| **リスク** | **Low** | 既存コンポーネントの拡張。バックエンド変更なし。テストカバレッジで品質担保可能 |

---

## 6. 設計フェーズへの引き継ぎ事項

- **設計判断事項**: `SearchInput` の controlled 化（Option A）を採用するか確認が必要
- **新規ファイル**: `src/config/quickSearchPresets.ts`、`src/components/QuickSearchButtons.tsx`
- **既存修正**: `src/components/SearchInput.tsx`（インターフェース変更）、`src/App.tsx`（統合）
