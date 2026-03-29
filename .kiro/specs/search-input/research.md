# Research & Design Decisions: search-input

---
**Purpose**: 技術設計の根拠となるDiscovery調査結果と設計判断を記録する。

---

## Summary
- **Feature**: `search-input`
- **Discovery Scope**: Simple Addition（純粋UIフォームコンポーネント、外部連携なし）
- **Key Findings**:
  - `@testing-library/user-event` は未導入。コンポーネントテストは `fireEvent` で実施する。
  - CSS フレームワーク未導入のため、スタイリングはプレーン CSS またはインラインスタイルに限定する。
  - Controlled Component パターン（React 標準）がこの規模に最適であり、カスタムフック分離は過剰設計となる。

## Research Log

### テスト: fireEvent vs userEvent

- **Context**: ギャップ分析にて `@testing-library/user-event` が `package.json` に存在しないことが判明。
- **Sources Consulted**: `frontend/package.json`（gap-analysis.md 調査済み）
- **Findings**:
  - `@testing-library/react` v16 に付属する `fireEvent` は `input` の `change` イベントおよびフォーム送信テストに十分対応可能。
  - `userEvent` は実ユーザー操作（keydown/keyup/input の連鎖）をシミュレートするため精度は高いが、`onChange` ベースの Controlled Component テストには `fireEvent.change` で機能要件を網羅できる。
- **Implications**: 新たな依存を追加せず `fireEvent` を標準パターンとして確立する。将来的に `userEvent` が必要な複雑なインタラクションが発生した場合に追加を検討する。

### スタイリング方針

- **Context**: プロジェクトに CSS フレームワーク（Tailwind 等）が未導入。
- **Sources Consulted**: `frontend/package.json`、`frontend/src/App.tsx`
- **Findings**: 現状、スタイル定義なし（素の HTML のみ）。
- **Implications**: SearchInput のスタイリングはプレーン CSS（別ファイルまたはインラインスタイル）に限定する。スタイリングはこの spec のスコープ外（機能要件の実装に集中）。

### コンポーネント分離方針

- **Context**: ギャップ分析で 3 案（App.tsx インライン / 独立コンポーネント / カスタムフック分離）を検討済み。
- **Findings**: `useState` のみで管理できるシンプルなローカル状態のため、フック分離は不要。
- **Implications**: `frontend/src/components/SearchInput.tsx` として単一ファイルで実装する。

## Architecture Pattern Evaluation

| オプション | 説明 | 強み | リスク / 制限 | メモ |
|-----------|------|------|--------------|------|
| Controlled Component（選択） | useState で input 値を管理し、派生値で disabled 制御 | React 標準、テスト容易、依存なし | なし | 要件規模に完全適合 |
| Uncontrolled Component | ref でフォームアクセス | 状態管理コード削減 | テストが複雑、disabled 制御が煩雑 | 却下 |
| カスタムフック分離 | useSearchInput.ts に状態抽出 | ロジック・表示分離 | このスコープでは過剰設計 | Chunk 10 以降で検討 |

## Design Decisions

### Decision: Controlled Component で内部状態を管理する

- **Context**: フォームの入力値に基づいてボタンの disabled/enabled を派生させる必要がある。
- **Alternatives Considered**:
  1. Uncontrolled Component（ref 使用）— disabled 制御のために都度 ref.current.value を参照する必要があり冗長
  2. Controlled Component — onChange で useState を更新し、派生値で disabled を計算する
- **Selected Approach**: Controlled Component。`query` state を `useState<string>('')` で管理し、`isSubmitDisabled = query.trim() === '' || (isLoading ?? false)` を派生値として計算する。
- **Rationale**: React 公式の推奨パターンであり、テスト容易性・型安全性ともに優れる。
- **Trade-offs**: レンダリングのたびに派生値を再計算するが、文字列 trim() 程度のコストは無視できる。
- **Follow-up**: 実装時に `isLoading` デフォルト値の destructuring を確認（`{ onSubmit, isLoading = false }`）。

### Decision: テストは fireEvent を使用する

- **Context**: `@testing-library/user-event` が未導入。追加コストと利益のトレードオフを評価。
- **Alternatives Considered**:
  1. `fireEvent`（既存）— `fireEvent.change` で Controlled Component の onChange を直接トリガー可能
  2. `@testing-library/user-event` 追加 — より現実的なユーザーイベントシミュレーション
- **Selected Approach**: `fireEvent` を使用。今回の要件（onChange, onClick, onSubmit）はすべて `fireEvent` でカバーできる。
- **Rationale**: 依存追加なしで要件を満たせる。プロジェクト初のコンポーネントテストパターンとして `fireEvent` を確立し、シンプルさを維持する。
- **Trade-offs**: `userEvent` ほど実ユーザー操作に近くはないが、Controlled Component のテストには十分。
- **Follow-up**: タイピング連鎖テスト（キー一つずつ）が必要な場合は `userEvent` 導入を再検討。

### Decision: aria-busy + ボタンラベル変更でローディング表示（要件 6.3）

- **Context**: isLoading=true 中のセマンティック表示方法を決定する必要がある。
- **Alternatives Considered**:
  1. `aria-busy="true"` のみ — スクリーンリーダー対応だが視覚的変化なし
  2. ボタンラベル変更（「探す」→「検索中...」）のみ — 視覚的に明快だがセマンティクス不足
  3. 両方を組み合わせる — 視覚・セマンティック両方をカバー
- **Selected Approach**: ローディング中はボタンラベルを「検索中...」に変更し、フォーム要素に `aria-busy="true"` を付与する。
- **Rationale**: 視覚的フィードバックとスクリーンリーダー対応を両立する最小コスト実装。
- **Trade-offs**: スピナーなどのビジュアルコンポーネントは不要（この spec スコープ外）。

## Risks & Mitigations

- `fireEvent` による テストが実ユーザー操作を完全再現しない — `onChange` ベースの Controlled Component では機能的に同等であり、受け入れ可能
- `components/` ディレクトリが存在しない — 実装時に新規作成する（軽微）
- `aria-busy` の一部ブラウザでの挙動差異 — ボタンラベル変更を主要フィードバックとし `aria-busy` を補完として使用することでリスクを低減

## References
- gap-analysis.md — テストインフラ・実装オプション分析（プロジェクト内ドキュメント）
- React公式ドキュメント: Controlled Components — フォームパターンの根拠
- MDN: aria-busy — ローディング表示のセマンティクス根拠
