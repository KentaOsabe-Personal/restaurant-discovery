# リサーチ & 設計判断ログ

---
**Purpose**: ディスカバリーフェーズで得た知見とアーキテクチャ判断の根拠を記録する。
---

## Summary

- **Feature**: `quick-search-button`
- **Discovery Scope**: Simple Addition（UIの拡張）
- **Key Findings**:
  - 既存の `SearchInput` は `query` ステートを内部管理しているため、外部からクエリ値を設定するには制御コンポーネントへの変換（ステートリフトアップ）が必要
  - `App.tsx` の `handleSearch` 関数はそのまま `QuickSearchButtons.onSelect` として再利用可能であり、追加ビジネスロジックは不要
  - 新規外部依存なし：Tailwind CSS v4 と React 19 の既存スタックのみで実装可能

## Research Log

### 既存コンポーネント統合ポイントの分析

- **Context**: クイック検索ボタンをクリックした際に `SearchInput` のテキストフィールドに値を反映させる方法の検討
- **Sources Consulted**: `frontend/src/components/SearchInput.tsx`、`frontend/src/App.tsx`
- **Findings**:
  - `SearchInput` は `useState<string>('')` で内部ステートを持ち、外部から値を注入する手段がない
  - `App.tsx` の `handleSearch(query: string)` が既に検索実行ロジックを担っており、`QuickSearchButtons` から呼び出せる
  - `isLoading` ステートが `App.tsx` で管理されており、`QuickSearchButtons` に渡すだけで disabled 制御が実現できる
- **Implications**: `SearchInput` を制御コンポーネントに変更し、`query` ステートを `App.tsx` にリフトアップすることが必須。既存テストの更新が必要になる。

### Tailwind CSS v4 のボタンスタイルパターン確認

- **Context**: 既存の `SearchInput` と統一したデザイントーンで `QuickSearchButtons` を実装するためのスタイルパターン確認
- **Sources Consulted**: `frontend/src/components/SearchInput.tsx`
- **Findings**:
  - 既存の送信ボタン: `bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed`
  - プリセットボタンは区別のため異なるカラースキーム（`bg-gray-100` や `border` ベース）が適切
  - `disabled:opacity-50 disabled:cursor-not-allowed` パターンは既存パターンとして確立済み
- **Implications**: 既存パターンを踏襲しつつ、プリセットボタン固有のスタイルを設計する

### タップ領域 44×44px の確保

- **Context**: 要件5.3のモバイルアクセシビリティ要件
- **Sources Consulted**: WCAG 2.5.5（Target Size）、既存コンポーネント
- **Findings**:
  - Tailwind の `py-2`（8px上下）と `px-3`（12px左右）では 44px に届かない場合がある
  - `min-h-[44px]` クラスを追加することでタップ領域を保証できる
  - または `py-3`（12px上下）とテキストフォントサイズ組み合わせで自然に44px以上を確保できる
- **Implications**: `QuickSearchButtons` の各ボタンに `min-h-[44px]` を明示的に付与する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| ステートリフトアップ | `query` を App に移動、SearchInput を制御コンポーネント化 | App が唯一の信頼できるソース、単方向データフロー維持 | 既存テストの更新が必要 | **採用** |
| ref を用いた命令的制御 | `useRef` で SearchInput の DOM input を直接操作 | SearchInput の変更不要 | React のアンチパターン、controlled/uncontrolled 混在 | 不採用 |
| Context/グローバルステート | React Context で query を共有 | コンポーネント間の prop drilling 回避 | 過剰設計、このスケールには不要 | 不採用 |

## Design Decisions

### Decision: `SearchInput` の制御コンポーネント化

- **Context**: クイック検索ボタンがテキストフィールドにクエリを設定する要件（3.1）を満たすため
- **Alternatives Considered**:
  1. `useRef` で DOM を直接操作 — React のアンチパターン、controlled/uncontrolled 混在問題
  2. `SearchInput` に `externalQuery?: string` prop を追加し `useEffect` で同期 — 複雑で副作用が発生しやすい
  3. `query` を App に移動し SearchInput を完全制御コンポーネントに変換 — 採用
- **Selected Approach**: `App.tsx` に `query` ステートを移動し、`SearchInput` に `value` / `onChange` を追加
- **Rationale**: React の推奨パターン（制御コンポーネント）に準拠し、ステートの単一管理点を維持できる
- **Trade-offs**: 既存の `SearchInput.test.tsx` を更新する必要があるが、コード量の増加は最小限
- **Follow-up**: `SearchInput` の既存テストで `render(<SearchInput onSubmit={...} />)` の呼び出しを `render(<SearchInput value="" onChange={() => {}} onSubmit={...} />)` に更新する

### Decision: `QuickSearchButtons` をプレゼンテーショナルコンポーネントとして設計

- **Context**: プリセットデータとコールバックの管理場所
- **Alternatives Considered**:
  1. `QuickSearchButtons` 内部で `quickSearchPresets` を直接 import — テスタビリティ低下
  2. `presets` を props として受け取るプレゼンテーショナルコンポーネント — 採用
- **Selected Approach**: `QuickSearchButtons` は `presets: readonly QuickSearchPreset[]` を props で受け取る
- **Rationale**: App.tsx からプリセットを渡すことで、テスト時に任意のプリセットを注入でき、コンポーネントの独立性が高まる
- **Trade-offs**: App.tsx に `import { quickSearchPresets }` が必要になるが、依存関係が明示的になる

## Risks & Mitigations

- `SearchInput.test.tsx` の既存テストが `value`/`onChange` props を要求するようになるため破壊的変更になる — テストコードを同時に更新することで解決
- `handleQuickSearch` 内で `async` 関数を `void` キャストなしに呼び出すと TypeScript/ESLint の floating promise 警告が出る — `void handleSearch(presetQuery)` パターンを採用

## References

- React Controlled Components: https://react.dev/learn/sharing-state-between-components
- WCAG 2.5.5 Target Size (AAA): https://www.w3.org/WAI/WCAG21/Understanding/target-size.html
- Tailwind CSS v4 disabled variant: https://tailwindcss.com/docs/hover-focus-and-other-states#disabled
