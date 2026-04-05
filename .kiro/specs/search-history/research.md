---
name: search-history 調査ノート
description: 検索履歴機能の設計調査・アーキテクチャ決定ログ
type: project
---

## Summary

- **Feature**: search-history
- **Discovery Scope**: Extension（既存フロントエンドへの機能追加）
- **Key Findings**:
  - `localStorage` はブラウザネイティブ API のため外部依存の追加は不要
  - 既存の `QuickSearchButtons` のチップ形式ボタンパターンを `SearchHistoryChips` に流用できる
  - `App.tsx` の `handleSearch` に副作用として `addToHistory` を差し込む設計が既存構造と最も整合する

---

## Research Log

### 既存コードベース統合分析

- **Context**: 検索履歴をどこに統合するか確認
- **Sources Consulted**: `frontend/src/App.tsx`, `frontend/src/components/SearchInput.tsx`, `frontend/src/components/QuickSearchButtons.tsx`
- **Findings**:
  - `App.tsx` が検索ロジック（`handleSearch`, `handleQuickSearch`）を一元管理している
  - `SearchInput` は `onSubmit(query: string)` コールバックで検索を発火する
  - `QuickSearchButtons` は `onSelect(query: string)` コールバックで検索を発火する
  - チップ形式のボタンは `QuickSearchButtons` の `<button>` パターンで実装済み（Tailwind CSS）
- **Implications**:
  - `handleSearch` の先頭で `addToHistory(query)` を呼ぶだけで保存が完結する
  - 履歴チップからの再検索も `handleQuickSearch` と同様の `setQuery` + `handleSearch` パターンで実現できる
  - 新規コンポーネント配置は `SearchInput` の直下が自然

### localStorage API 適合性確認

- **Context**: 要件 6 のフロントエンド完結・永続化要件
- **Sources Consulted**: MDN Web Docs - Web Storage API（ブラウザネイティブ仕様）
- **Findings**:
  - `localStorage.setItem(key, JSON.stringify(value))` / `JSON.parse(localStorage.getItem(key))` でシリアライズ可能
  - プライベートブラウジングや Safari ITP でストレージクォータ超過時に `QuotaExceededError` が throw される
  - 同一オリジン（同じポート）内で永続化される
- **Implications**:
  - すべての読み書きを `try/catch` で囲み、失敗時は空配列にフォールバックする（要件 6.3 対応）

### カスタムフック設計パターン

- **Context**: localStorage 操作とステート管理のロジック分離
- **Sources Consulted**: 既存コードベースのフック使用状況（現状カスタムフックなし）、React 公式ドキュメント
- **Findings**:
  - プロジェクトは現在カスタムフックを使用していないが、steering の「フロントエンドのビジネスロジックはコンポーネントから分離（カスタムフック）」方針に合致する
  - `useSearchHistory` フックを `frontend/src/` 直下ではなく `frontend/src/components/` と同階層の独立ファイルに置く（steering の `src/` 直下構成と整合）
- **Implications**:
  - フックは `frontend/src/hooks/useSearchHistory.ts` に配置（現状 `hooks/` ディレクトリは未作成だが、steering の方針に沿う新設）
  - App.tsx はフックの返却値のみを使い、localStorage の詳細を知らない

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| カスタムフック + UI コンポーネント | `useSearchHistory` でロジック、`SearchHistoryChips` で表示を分離 | 既存 steering 方針に合致・テスト容易 | ごくわずかな over-engineering（単純だが適切なスケール） | 採用 |
| `App.tsx` に全ロジックをインライン | 新規ファイル不要 | 最もシンプル | App.tsx が肥大化・localStorage ロジックのテストが困難 | 不採用 |
| Zustand / Context などグローバルState | 将来的な共有に対応 | 拡張性高い | 現状は App.tsx のみが使用。過剰な複雑さ | 不採用 |

---

## Design Decisions

### Decision: カスタムフック `useSearchHistory` でロジックを分離

- **Context**: 要件 1/4/5/6 が localStorage への読み書きロジックを要求する
- **Alternatives Considered**:
  1. `App.tsx` にインライン — 実装は最小だが肥大化リスク
  2. `useSearchHistory` カスタムフック — ロジックを独立ファイルへ分離
- **Selected Approach**: カスタムフック（Option 2）
- **Rationale**: steering の「ビジネスロジックはカスタムフックへ分離」方針に準拠。localStorage ロジックの単体テストが書きやすくなる
- **Trade-offs**: ファイルが 1 つ増えるが、localStorage エラーハンドリングの複雑度を考えると適切な分離
- **Follow-up**: テスト時は `localStorage` をモックして境界ケース（クォータ超過・空）を検証

### Decision: 履歴エントリに `timestamp` フィールドを持たせる

- **Context**: 要件 2.2「新しい順に表示」のため並び順の根拠が必要
- **Alternatives Considered**:
  1. 配列インデックス（先頭が最新）— 状態の順序がそのまま表示順
  2. `timestamp` フィールド付きオブジェクト — 明示的な時刻情報を保持
- **Selected Approach**: 配列インデックス方式（先頭が最新）
- **Rationale**: 保存・表示ともに「先頭が最新」を保持すれば `timestamp` ソートは不要。ただし `timestamp` はデバッグ・将来的なフィルタリングのため保持する
- **Trade-offs**: `timestamp` は現時点では表示に使わないが、将来の「日付別表示」などに利用可能

### Decision: `App.tsx` の `handleSearch` 先頭で履歴保存

- **Context**: 要件 1.1「検索を実行した（サブミットした）時点で保存」
- **Alternatives Considered**:
  1. API レスポンス成功後に保存 — 成功した検索のみ記録
  2. `handleSearch` 先頭（API 呼び出し前）で保存 — 実行意図の時点で記録
- **Selected Approach**: `handleSearch` 先頭で保存（Option 2）
- **Rationale**: 要件文が「実行した（サブミットした）」と定義しており、成功・失敗は問わない
- **Trade-offs**: API エラー時も履歴に残るが、それが仕様

---

## Risks & Mitigations

- `localStorage` クォータ超過 → `try/catch` でフォールバック（要件 6.3）、最大 10 件制限により容量リスクは極小
- `App.tsx` の `handleSearch` が `async` → `addToHistory` は同期呼び出しのため問題なし
- 既存テスト（`App.test.tsx`）への影響 → 既存テストは `localStorage` を使わないため影響なし。ただし `beforeEach` で `localStorage.clear()` を追加することを推奨

---

## References

- MDN Web Docs — Web Storage API: https://developer.mozilla.org/docs/Web/API/Web_Storage_API
- React 公式 — カスタムフック: https://react.dev/learn/reusing-logic-with-custom-hooks
