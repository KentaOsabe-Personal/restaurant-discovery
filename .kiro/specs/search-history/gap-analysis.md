# ギャップ分析レポート: search-history

## 分析サマリー

- **スコープ**: フロントエンド完結（localStorage）の純粋UI機能。バックエンド・DB変更は不要
- **既存資産**: `App.tsx`の`handleSearch`が検索の唯一エントリポイントで、履歴保存のフックとして最適。`QuickSearchButtons`がチップUI実装の参考パターンとして使える
- **主なギャップ**: localStorage操作ユーティリティ・カスタムフック・履歴表示コンポーネントがすべて未存在
- **推奨アプローチ**: カスタムフック（`useSearchHistory`）＋新規コンポーネント（`SearchHistoryChips`）のOption Cハイブリッドが最適。App.tsxへの変更を最小限に抑えつつ、テスト容易性を確保できる
- **工数/リスク**: S（1〜3日）/ Low

---

## 1. 現状調査

### 関連ファイルとレイヤー構成

| ファイル | 役割 | 関連度 |
|---|---|---|
| `frontend/src/App.tsx` | 検索状態管理・`handleSearch`定義 | 高（統合ポイント） |
| `frontend/src/components/SearchInput.tsx` | 検索バーUI（制御コンポーネント） | 高（履歴を検索バーの直下に表示） |
| `frontend/src/components/QuickSearchButtons.tsx` | チップ形式ボタン群のUIパターン | 中（実装参考） |
| `frontend/src/config/quickSearchPresets.ts` | 静的データ定義パターン | 低（参考） |

### 既存アーキテクチャパターン

- **状態管理**: `App.tsx`が`useState`でクエリ・ローディング・結果を一元管理し、コールバックをpropsで子に渡す
- **検索実行フロー**: `handleSearch(query)` → API呼び出し → 結果セット
- **クイック検索パターン**: `handleQuickSearch(presetQuery)` が `setQuery` + `handleSearch` を両方呼ぶ → 履歴チップの再検索も同パターンで実装可能
- **コンポーネント命名**: PascalCase（`SearchHistoryChips.tsx`）
- **フック命名**: `use`プレフィックス + camelCase（`useSearchHistory.ts`）
- **テスト配置**: コンポーネント隣接（`SearchHistoryChips.test.tsx`）
- **テストパターン**: `vi.mock`でAPI差し替え、`fireEvent`でUI操作、`vi.fn()`でコールバック検証

### インポート規則

現在パスエイリアス未設定。相対パスを使用：
```typescript
import { useSearchHistory } from './hooks/useSearchHistory'
import SearchHistoryChips from './components/SearchHistoryChips'
```

---

## 2. 要件対資産マッピング

### 要件 1: 検索履歴の自動保存

| 技術的ニーズ | 現状 | ステータス |
|---|---|---|
| localStorage への保存ロジック | 未存在 | **Missing** |
| 重複排除ロジック（先頭移動） | 未存在 | **Missing** |
| 最大10件のFIFO管理 | 未存在 | **Missing** |
| 空文字列ガード | 未存在 | **Missing** |
| `handleSearch`への保存フック | `App.tsx:20-32`に統合ポイントあり | **Constraint**（App.tsx変更が必要） |

### 要件 2: 検索履歴の表示

| 技術的ニーズ | 現状 | ステータス |
|---|---|---|
| チップ形式UIコンポーネント | `QuickSearchButtons`が近いパターン | **Missing**（新規作成必要） |
| 新しい順表示 | localStorage管理ロジックに依存 | **Missing** |
| 0件時の非表示制御 | 未存在 | **Missing** |
| 個別×ボタン付きチップ | 未存在 | **Missing** |
| 「履歴クリア」ボタン | 未存在 | **Missing** |

### 要件 3〜5: 再検索・個別削除・全件クリア

| 技術的ニーズ | 現状 | ステータス |
|---|---|---|
| チップクリック → setQuery + handleSearch | `handleQuickSearch`パターン流用可能 | **Constraint**（App.tsx連携必要） |
| 個別削除ロジック | 未存在 | **Missing** |
| 全件クリアロジック | 未存在 | **Missing** |

### 要件 6: データ永続化

| 技術的ニーズ | 現状 | ステータス |
|---|---|---|
| localStorage read/write | 未存在 | **Missing** |
| ページリロード後の復元 | 未存在 | **Missing** |
| localStorage失敗時のエラー握りつぶし | 未存在 | **Missing** |
| バックエンドAPI非使用（フロント完結） | 要件と現設計が一致 | ✅ **Satisfied** |

---

## 3. 実装アプローチの選択肢

### Option A: 既存コンポーネントの拡張

**戦略**: `App.tsx`にlocalStorage操作を直接記述し、`SearchInput.tsx`に履歴チップを追加

**変更対象ファイル**:
- `App.tsx`: localStorage読み書き + 履歴状態追加 + 履歴チップUI内包
- `SearchInput.tsx`: 履歴チップエリアを追加

**Trade-offs**:
- ✅ 新規ファイルが最小
- ❌ `App.tsx`が肥大化（現在54行 → 100行超になる見込み）
- ❌ localStorage操作とUI操作が混在し、単体テストが難しい
- ❌ `SearchInput`の責務が「入力バー」から逸脱する

---

### Option B: 新規コンポーネントの作成

**戦略**: localStorage管理を`useSearchHistory`フック、UIを`SearchHistoryChips`コンポーネントとして完全分離。`App.tsx`は最小変更

**新規ファイル**:
- `src/hooks/useSearchHistory.ts` — localStorage操作・状態管理・ビジネスロジック
- `src/hooks/useSearchHistory.test.ts` — フック単体テスト（jsdom環境でlocalStorageはデフォルト利用可能）
- `src/components/SearchHistoryChips.tsx` — チップUI（再検索/個別削除/全件クリア）
- `src/components/SearchHistoryChips.test.tsx` — UIテスト

**`App.tsx`への変更（最小）**:
```typescript
const { history, addHistory, removeHistory, clearHistory } = useSearchHistory();

// handleSearch内に1行追加
addHistory(query);

// JSX内に1コンポーネント追加
<SearchHistoryChips history={history} onSelect={handleHistorySelect} onRemove={removeHistory} onClear={clearHistory} />
```

**Trade-offs**:
- ✅ 責務の明確な分離
- ✅ フック・コンポーネントそれぞれが独立してテスト可能
- ✅ `App.tsx`の変更量が最小（+5〜8行程度）
- ✅ `QuickSearchButtons`のパターンと構造的に一致
- ❌ ファイル数が増える（4ファイル追加）

---

### Option C: ハイブリッドアプローチ

**戦略**: Option Bと基本同じだが、`src/hooks/`ディレクトリを新設するか、フックを`src/components/`隣接に置くかを選択する中間案

**検討ポイント**:
- `structure.md`には`src/hooks/`ディレクトリの記載がない（現在未存在）
- フックをコンポーネント隣接に置く場合は`SearchHistoryChips.hooks.ts`のような命名も選択肢
- 機能が増えたら`src/features/`への移行を`structure.md`で言及しているが、今回は単一機能でスコープが明確なためその必要はない

**Trade-offs**:
- ✅ Option Bと同等の分離度
- ⚠️ `src/hooks/`ディレクトリ新設の是非はデザインフェーズで決定

---

## 4. 実装複雑度とリスク評価

| 項目 | 評価 | 理由 |
|---|---|---|
| **工数** | **S（1〜3日）** | localStorage操作は既存のブラウザAPIで完結。外部ライブラリ不要。UIパターンはQuickSearchButtonsから流用可能 |
| **リスク** | **Low** | バックエンド変更なし。既存検索フローへの影響は`handleSearch`への1行追加のみ。localStorageはjsdom環境でテスト可能 |

### 潜在リスク

- **localStorage利用不可環境**: 要件6-3でエラー握りつぶしが明示的に定義済みのため、try-catchで対応済み設計にすれば問題なし
- **App.tsx統合テスト**: 現在の`App.test.tsx`は`searchPlaces`をモックしているため、履歴機能の統合テストを追加する際に`localStorage`のリセット（`afterEach`で`localStorage.clear()`）が必要

---

## 5. デザインフェーズへの推奨事項

### 推奨アプローチ
**Option B**（新規コンポーネント分離）を推奨。理由はApp.txsxへの影響最小化とテスト容易性の両立。

### 設計フェーズで決定すべき事項

1. **`src/hooks/`ディレクトリの新設有無**: `structure.md`に記載がないため、フック配置場所の方針決定が必要
2. **`localStorage`キー名**: 競合を避けるためアプリ固有のプレフィックスを検討（例: `rsd_search_history`）
3. **`SearchHistoryChips`のpropsインターフェース設計**: `handleHistorySelect`のシグネチャを`handleQuickSearch`と揃えるか
4. **`App.tsx`のJSX構造**: `SearchInput`の直下に`SearchHistoryChips`を配置する想定だが、`QuickSearchButtons`との順序・レイアウト調整が必要
5. **チップのスタイリング**: Tailwind CSS v4。QuickSearchButtonsの既存クラスを流用するか、削除ボタン（×）のサイズ・配置を新規定義するか

### 不要な調査項目（デザインフェーズでも不要）
- バックエンド関連: 一切不要
- 外部ライブラリ: localStorage標準APIのみで完結
- パフォーマンス: 最大10件の文字列配列のため問題なし
