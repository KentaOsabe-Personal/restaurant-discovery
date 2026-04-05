# リサーチ & 設計決定記録

---
**目的**: ディスカバリー調査結果、アーキテクチャ検討、設計判断の根拠を記録する。

---

## Summary
- **Feature**: `omakase-button`
- **Discovery Scope**: Extension（既存フロントエンド拡張 / Simple Addition）
- **Key Findings**:
  - `QuickSearchButtons` + `quickSearchPresets.ts` が完全なテンプレートとして機能する。同じ Props 設計・スタイリング・テスト構造をそのまま踏襲できる
  - `App.tsx` の `handleQuickSearch(presetQuery)` が `setQuery + handleSearch` を実行する既製パターンであり、OmakaseButton の `onSelect` コールバックとして再利用可能
  - バックエンド変更不要、新規外部依存ゼロ。ファイル追加2件・App.tsx 変更1件のみで完結する

## Research Log

### 既存コンポーネントパターンの調査

- **Context**: OmakaseButton の Props 設計とスタイリングをどのパターンに合わせるか確認
- **Sources Consulted**: `frontend/src/components/QuickSearchButtons.tsx`, `frontend/src/config/quickSearchPresets.ts`, `frontend/src/App.tsx`
- **Findings**:
  - `QuickSearchButtons` は `presets: readonly QuickSearchPreset[]`, `onSelect: (query: string) => void`, `isLoading: boolean` の3 Props で構成
  - `isLoading=true` 時に `disabled` 属性付与 + `disabled:opacity-50 disabled:cursor-not-allowed` スタイル適用
  - タップ領域は `min-h-[44px]` で44px確保済み（要件5.3と合致）
  - `quickSearchPresets.ts` は `readonly OmakasePreset[]` 形式の静的定数配列として export
- **Implications**: OmakaseButton も同じ Props 構造を採用することで、App.tsx への統合が自然に行える。`handleQuickSearch` をそのまま `onSelect` に渡せる

### App.tsx の検索フロー調査

- **Context**: おまかせクリック後の検索実行がどのように既存パイプラインに接続されるか確認
- **Sources Consulted**: `frontend/src/App.tsx`
- **Findings**:
  - `handleQuickSearch(presetQuery)` は `setQuery(presetQuery)` + `void handleSearch(presetQuery)` の2行で完結
  - `handleSearch` 内で `setIsLoading(true)`, `setError(null)`, `setRecommendations(null)` が実行される（要件3.4をカバー）
  - `isLoading` は App の state として管理され、全子コンポーネントへ prop として渡される
- **Implications**: App.tsx への変更は OmakaseButton のマウントと `handleQuickSearch` の受け渡し2点のみ。新規ハンドラーの追加は不要

### Math.random() のテスト容易性

- **Context**: ランダム選択ロジックの単体テスト戦略
- **Sources Consulted**: Vitest 公式ドキュメント（`vi.spyOn`）
- **Findings**:
  - Vitest は `vi.spyOn(Math, 'random').mockReturnValue(0)` で決定論的な動作を再現できる
  - テスト対象は「プリセット配列の何番目が選ばれるか」であり、モック後は予測可能になる
- **Implications**: テストはスパイでMath.randomをモックし、配列インデックスとクエリの対応を検証する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Props経由でpresets受け取り | App.tsxからomakasePresetsを渡す（QuickSearchButtonsと同パターン） | テスト容易、コンポーネント再利用性が高い | App.tsxに1行追加が必要 | **選択** |
| 内部import | OmakaseButton内でomakasePresetsを直接import | ファイル数が少ない | テスト時にモジュールモック必要、再利用性低下 | 不採用 |

## Design Decisions

### Decision: `OmakasePreset` 型を `string` エイリアスとして定義

- **Context**: `QuickSearchPreset` は `{ label: string; query: string }` オブジェクト型だが、おまかせプリセットはラベルとクエリが同一
- **Alternatives Considered**:
  1. オブジェクト型 `{ label: string; query: string }` — QuickSearchPresetと統一できるが、ラベル＝クエリで冗長
  2. 文字列型エイリアス `string` — シンプル、要件1.2に忠実
- **Selected Approach**: `type OmakasePreset = string` として定義し、配列要素はクエリ文字列をそのまま格納
- **Rationale**: 要件1.2が「各プリセットを文字列として配列で定義」と明示。ボタンラベルは「おまかせ」固定（要件2.2）なのでpresetごとのラベルフィールドは不要
- **Trade-offs**: QuickSearchPresetとの型の不統一が生じるが、責務の差異（複数ラベルvs単一ボタン）を正確に表現できる
- **Follow-up**: 将来的にラベル付きプリセットが必要になった場合は型拡張で対応

### Decision: `handleQuickSearch` を `onSelect` として再利用

- **Context**: おまかせクリック後の検索実行フローを新規作成するか既存を流用するか
- **Alternatives Considered**:
  1. `handleOmakaseSearch` を新規追加 — 関数が増えるが意図が明確
  2. `handleQuickSearch` をそのまま再利用 — コード追加なし
- **Selected Approach**: `handleQuickSearch` を OmakaseButton の `onSelect` に渡す
- **Rationale**: 両者の動作が完全に同一（setQuery + handleSearch）であり、コードの重複を避けることで保守コストを削減できる
- **Trade-offs**: 将来おまかせ固有の処理（ログ記録など）が必要になった場合は別途ハンドラーを追加する

## Risks & Mitigations

- `presets` が空配列の場合のクリックガード — `disabled` 属性付与で対処（OmakaseButton 内で `presets.length === 0 || isLoading` をdisabled条件に含める）
- `Math.random()` の偏り（同じ結果の連続）— 許容範囲（少数のプリセットでは確率的に発生し得るが、UX上の問題にはならない）

## References

- `frontend/src/components/QuickSearchButtons.tsx` — スタイリング・Props設計の参照元
- `frontend/src/config/quickSearchPresets.ts` — 設定ファイル構造の参照元
- `frontend/src/App.tsx` — 検索フローの参照元
