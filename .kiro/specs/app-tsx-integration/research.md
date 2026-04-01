## Summary
- **Feature**: `app-tsx-integration`
- **Discovery Scope**: Extension（既存コンポーネントの統合）
- **Key Findings**:
  - SearchInput・PlaceCard・searchPlaces の全インターフェースが確定しており、App.tsx はそれらを構成するだけでよい
  - ローカル useState による 3 フィールド状態管理（isLoading / recommendations / error）で要件を完全に充足できる
  - RecommendationList を独立コンポーネントとして抽出することで App.tsx の単一責任を維持できる

## Research Log

### 既存インターフェース調査

- **Context**: App.tsx が依存するコンポーネントの Props と API クライアントの契約を確認する
- **Sources Consulted**:
  - `frontend/src/components/SearchInput.tsx`
  - `frontend/src/components/PlaceCard.tsx`
  - `frontend/src/types/search.ts`
  - `frontend/src/api/search.ts`
- **Findings**:
  - `SearchInputProps`: `onSubmit: (query: string) => void; isLoading?: boolean`
  - `PlaceCardProps`: `Recommendation` 型のスプレッド（name / rating / price_level / address / google_maps_url / reason）
  - `searchPlaces`: `(query: string) => Promise<SearchResponse>` — HTTP エラー時に `Error` を throw する
  - `Recommendation` 型: `photo_url`・`opening_hours` フィールドは削除済み（コスト最適化方針）
- **Implications**: App.tsx はこれらの契約に依存するため、型変更があれば App.tsx・RecommendationList.tsx の両方に影響する

### テストパターン調査

- **Context**: App.test.tsx の実装方針を決定するためにプロジェクトのテストパターンを確認する
- **Sources Consulted**: `frontend/src/components/SearchInput.test.tsx`, `frontend/src/test/setup.ts`
- **Findings**:
  - Vitest globals 有効（`describe`/`it`/`expect` のインポート不要）
  - `vi.fn()` でモックを作成し `beforeEach` でクリアするパターンを採用
  - `@testing-library/react` の `render`/`screen`/`fireEvent` を使用
  - `searchPlaces` は `vi.mock` によるモジュールレベルモックで制御する
- **Implications**: App.test.tsx でも同パターンを踏襲する。`searchPlaces` のモックはモジュールレベルで宣言する

## Architecture Pattern Evaluation

| オプション | 説明 | 強み | リスク / 制限 | メモ |
|---|---|---|---|---|
| 単一 App.tsx（RecommendationList 非分離） | 全ロジックを App.tsx に集約する | ファイル数が少ない | App.tsx が肥大化し責務が混在する | 要件 7.2 で許容されているが非推奨 |
| App.tsx + RecommendationList 分離 | 表示ロジックをコンポーネントに委譲する | 単一責任・テスト容易性 | ファイルが 1 つ増える | **選択** |

## Design Decisions

### Decision: `RecommendationList を独立コンポーネントとして抽出する`

- **Context**: 要件 7.2 では App.tsx 内への直接記述も許容しているが、構造的な分離が望ましい
- **Alternatives Considered**:
  1. App.tsx 内でマップ処理を直接記述する
  2. RecommendationList.tsx を `frontend/src/components/` に分離する
- **Selected Approach**: `RecommendationList.tsx` を `frontend/src/components/` に作成し、`recommendations` プロパティを受け取ってリスト表示する
- **Rationale**: 単一責任原則に沿い、App.tsx の状態管理ロジックと表示ロジックを分離する。将来のフィルタリング・ソート機能追加時の拡張ポイントにもなる
- **Trade-offs**: ファイルが 1 つ増えるが複雑度は低い
- **Follow-up**: 実装後に `pnpm test --run` で全テストがパスすることを確認する

### Decision: `3 フィールド useState パターンを採用する`

- **Context**: isLoading / recommendations / error を個別に管理するか、discriminated union で一元管理するかを選択する
- **Alternatives Considered**:
  1. 個別 `useState` 3 本（`isLoading`・`recommendations`・`error`）
  2. 単一 state の discriminated union（`{ status: 'idle' | 'loading' | 'success' | 'error', ... }`）
- **Selected Approach**: 個別 `useState` 3 本を採用する
- **Rationale**: 要件が各状態フィールドを明示的に指定しており、テストの検証観点も各フィールドに対応している。discriminated union はより型安全だが、現時点の規模と複雑度に対してオーバーエンジニアリングになる
- **Trade-offs**: 不可能な状態（`isLoading=true` かつ `error` あり）を型システムで防げないが、`handleSearch` の実装で制御可能
- **Follow-up**: 状態が複雑化した場合は `useReducer` または discriminated union への移行を検討する

## Risks & Mitigations

- **非同期レース条件**（前回の検索結果が遅延して返る）— 新規検索開始時に `recommendations` と `error` を null クリアすることで表示の混在を防ぐ。完全な解決には AbortController が必要だが、P1 リスクとして実装注意事項に記録し今フェーズでは対象外とする
- **searchPlaces モックの不完全な使用**— vi.mock によるモジュールレベルモックパターンを設計で明示し、実装者がパターンを踏み外さないようにする

## References

- [Vitest - Mocking](https://vitest.dev/guide/mocking.html) — vi.mock / vi.fn の使用ガイド
- [Testing Library - Queries](https://testing-library.com/docs/queries/about) — screen クエリの基本（既存テストと同パターン）
