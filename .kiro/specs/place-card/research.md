# リサーチ & 設計判断ログ: place-card

---
**Purpose**: Discovery フェーズで得た知見・アーキテクチャ調査・設計判断の根拠を記録する。

---

## Summary
- **Feature**: `place-card`
- **Discovery Scope**: Simple Addition（既存パターンの踏襲による UI コンポーネント新規作成）
- **Key Findings**:
  - `SearchInput.tsx` の実装パターンをそのまま適用可能（新規ライブラリ・外部統合なし）
  - `Recommendation` 型のスコープ外フィールド（`photo_url` / `opening_hours`）を本 spec で削除し、`PlaceCardProps = Recommendation` として型ドリフトなく利用する
  - `price_level` の enum 文字列（`PRICE_LEVEL_MODERATE` 等）は ¥ 記号変換が飲食アプリで最も一般的かつ簡潔なUIパターン

---

## Research Log

### Props 設計: PlaceCardProps vs Recommendation 型の直接利用

- **Context**: `frontend/src/types/search.ts` の `Recommendation` 型には `photo_url: string | null` および `opening_hours: OpeningHours | null` が含まれる。しかしバックエンド API はフィールドマスク最小化方針によりこれらを返さない。
- **Sources Consulted**: `frontend/src/types/search.ts`、`gap-analysis.md`、`google-places-service/requirements.md`（Design Decision）、`Todo.md`
- **Findings**:
  - `Recommendation` 型を Props としてそのまま利用すると、コンポーネントの境界にスコープ外フィールドが混入する（過去の判断）
  - しかし `Recommendation` 型のクリーンアップ（`photo_url` / `opening_hours` / `OpeningHours` の削除）を本 spec のスコープに含めることで、型を実際の API レスポンスと一致させられる
  - クリーンアップ後は `PlaceCardProps = Recommendation` として直接利用でき、型ドリフトリスクがゼロになる
  - `Recommendation` の既存コンシューマーは `SearchResponse` 経由の `api/search.ts` のみで、削除の影響範囲が限定的
- **Implications**: `Recommendation` 型をクリーンアップ（要件 7.x）したうえで `export type PlaceCardProps = Recommendation` として定義する（Option C 採用）

### price_level の表示変換

- **Context**: バックエンドが返す `price_level` は `"PRICE_LEVEL_INEXPENSIVE"` / `"PRICE_LEVEL_MODERATE"` / `"PRICE_LEVEL_EXPENSIVE"` / `"PRICE_LEVEL_VERY_EXPENSIVE"` の enum 文字列。ユーザー向けの表示変換が必要。
- **Sources Consulted**: `gap-analysis.md`、Google Places API (New) 価格帯定義
- **Findings**:
  - Google Maps・Yelp などの主要飲食アプリは ¥/$/€ 記号を1〜4個で表現するパターンが標準
  - 日本語ラベル（安め/普通/高め）は翻訳コストが生じ、将来の多言語化時に課題となる
  - inline 変換関数で十分（再利用ユースケースは現時点で存在しない）
- **Implications**: `formatPriceLevel` をコンポーネントファイル内に同居させる inline 関数として実装する

### 見出しレベルの決定

- **Context**: 要件 6.2 は `<h2>` または `<h3>` を許容。Chunk 10（`RecommendationList`）との DOM 構造の整合性が必要。
- **Sources Consulted**: `frontend/src/App.tsx`、`requirements.md`（6.2）
- **Findings**:
  - `App.tsx` の現在の DOM: `<h1>Restaurant Discovery</h1>`
  - Chunk 10 の `RecommendationList` は結果セクションの見出し（`<h2>`相当）を持つ想定
  - PlaceCard は `RecommendationList` の子要素として使われるため、`<h3>` が見出し階層上適切
- **Implications**: 店舗名を `<h3>` でマークアップする（要件 6.2 の許容範囲内）

---

## Architecture Pattern Evaluation

| オプション | 説明 | 利点 | リスク・制限 | 備考 |
|-----------|------|------|------------|------|
| **Option B（採用）** | `PlaceCard.tsx` を新規作成。SearchInput パターン踏襲 | 単一責任、テスト容易、規約準拠 | ファイル数増加（許容範囲） | gap-analysis 推奨 |
| Option A | `SearchInput.tsx` を拡張してカード表示を追加 | ファイル数増加なし | 単一責任原則違反、テスト複雑化 | 不適切 |
| Option C | PlaceCard + `formatPriceLevel` を別ファイルに分離 | 変換ロジック再利用可能 | YAGNI 違反、初期段階で不要な複雑さ | 将来オプション |

---

## Design Decisions

### Decision: Recommendation 型クリーンアップ + PlaceCardProps = Recommendation（Option C）

- **Context**: `Recommendation` 型のスコープ外フィールドを Props 契約から排除する必要がある
- **Alternatives Considered**:
  1. Option A — `Recommendation` 型を Props としてそのまま利用（`photo_url` / `opening_hours` は無視）
  2. Option B — `PlaceCardProps` を6フィールドで独立定義（型ドリフトリスクあり）
  3. Option C — `Recommendation` 型自体をクリーンアップし、`PlaceCardProps = Recommendation` として利用
- **Selected Approach**: Option C — `Recommendation` 型から不要フィールドを削除し、型エイリアスで `PlaceCardProps` を定義
- **Rationale**: 型定義が API レスポンスの実態と一致し、型ドリフトリスクがゼロになる。コンシューマーへの影響も `api/search.ts` のみで限定的。Todo.md に記録されていた技術的負債を本 spec のスコープで解消できる。
- **Trade-offs**: `Recommendation` 型の変更が直接 `PlaceCardProps` に影響するが、それは望ましい動作（型の整合性が自動で維持される）
- **Follow-up**: Chunk 10 実装時、`RecommendationList` から `Recommendation` 型オブジェクトをそのままスプレッドで渡せる

### Decision: price_level の ¥ 記号変換

- **Context**: enum 文字列をユーザー向けに可読な形式で表示する
- **Alternatives Considered**:
  1. Option A — 日本語ラベル（安め / 普通 / 高め / とても高め）
  2. Option B — ¥ 記号（¥ / ¥¥ / ¥¥¥ / ¥¥¥¥）
- **Selected Approach**: Option B — ¥ 記号変換
- **Rationale**: 飲食アプリのデファクトスタンダード。スペース効率が高く、言語非依存で直感的に認識できる。
- **Trade-offs**: 絶対的な金額感は伝わりにくいが、相対的な価格帯比較には十分
- **Follow-up**: API が新しい `price_level` 値を追加した場合に備え、フォールバックケースを設ける

### Decision: `<h3>` による店舗名マークアップ

- **Context**: 要件 6.2 は `<h2>` または `<h3>` を許容。将来の DOM 構造との整合性が必要。
- **Alternatives Considered**:
  1. `<h2>` — 現在の App.tsx 構造では使用可能
  2. `<h3>` — Chunk 10 で追加される `RecommendationList` の見出し（`<h2>`）を考慮
- **Selected Approach**: `<h3>`
- **Rationale**: `App.tsx: <h1>` → `RecommendationList セクション: <h2>` → `PlaceCard 店舗名: <h3>` の見出し階層が意味的に正確
- **Trade-offs**: 現時点では `<h2>` でも問題ないが、Chunk 10 実装後の変更コストを回避できる

---

## Risks & Mitigations

- **price_level enum の仕様拡張** — `formatPriceLevel` のデフォルトケースで入力値をそのまま返すフォールバックを実装し、UI が壊れないようにする
- **PlaceCardProps と Recommendation 型の乖離** — `PlaceCardProps = Recommendation` により解消済み（要件 7.x）
- **見出し階層のズレ** — Chunk 10 実装時に App.tsx の DOM 構造を確認し、必要に応じて `<h3>` → `<h2>` に調整する

---

## References

- `frontend/src/types/search.ts` — `Recommendation` 型定義（PlaceCardProps と対比）
- `frontend/src/components/SearchInput.tsx` — 実装パターンのテンプレート
- `.kiro/specs/place-card/gap-analysis.md` — フィージビリティ分析・オプション評価
- `.kiro/steering/tech.md` — TypeScript strict モード設定、テスト規約
- `.kiro/steering/structure.md` — コンポーネント命名・配置規約
