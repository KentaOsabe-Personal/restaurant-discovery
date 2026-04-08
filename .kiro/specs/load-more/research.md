# Research & Design Decisions: load-more（もっと見る）機能

---
**Purpose**: Discovery findings, architectural investigations, and rationale informing the technical design.

---

## Summary
- **Feature**: `load-more`
- **Discovery Scope**: Extension（既存検索フローへのアディティブ拡張）
- **Key Findings**:
  - バックエンドは `GooglePlacesService` が最大20件取得済みだが、`RecommendationService` が選定した 3〜5 件のみをレスポンスに含め、残りは破棄していた。コントローラーレベルで差分計算を追加するだけで対応可能。
  - フロントエンドの `PlaceCard` は `reason: string`（必須）を前提とした型設計のため、`reason` を optional 化して `OtherCandidate`（理由なし）でも再利用できるよう変更が必要。
  - 追加候補の取得は別途 API 呼び出しを必要とせず、初回検索レスポンスに `other_candidates` を含めることで完結する。APIコスト追加なし。

## Research Log

### 既存データフローの分析

- **Context**: `other_candidates` を返すためにどこにどのような変更が必要かを特定する
- **Sources Consulted**: `backend/app/controllers/api/search_controller.rb`, `backend/app/services/recommendation_service.rb`, `backend/app/services/google_places_service.rb`
- **Findings**:
  - `GooglePlacesService#call` は `pageSize: 20` で最大20件を取得し、`{name, rating, price_level, address, google_maps_url}` のハッシュ配列を返す
  - `RecommendationService#merge_recommendations` は AI 選定した名前でフィルタリングして 3〜5 件を返す。非選定の places は `filter_map` で消える
  - コントローラーは現在 `recommendations` のみをレスポンスに含め、元の `places` を破棄している
- **Implications**: コントローラーで `recommended_names` を `Set` として保持し、`places` から差分を取るだけで `other_candidates` を生成できる。サービス層の変更は不要。

### フロントエンド型設計の分析

- **Context**: `PlaceCard` が `reason` 必須の型を持つため、理由なし候補カードの表示方法を決定する
- **Sources Consulted**: `frontend/src/types/search.ts`, `frontend/src/components/PlaceCard.tsx`, `frontend/src/components/RecommendationList.tsx`
- **Findings**:
  - `Recommendation` 型は `reason: string` 必須。`PlaceCardProps = Recommendation` のため `reason` なしでは型エラー
  - `PlaceCard` の `reason` 表示は `<p className="text-base mb-3">{reason}</p>` の1行。optional 化しても既存表示への影響は `{reason && <p>...</p>}` の変更のみ
  - `PlaceCard.test.tsx` が `reason` 必須として渡しているため、テストのフィクスチャ更新が必要
- **Implications**: `Candidate` 基底型（reason なし）を新設し、`Recommendation = Candidate & { reason: string }` とすることで型の継承関係を明確化。`PlaceCardProps = Candidate & { reason?: string }` に変更する。

### 状態管理の設計

- **Context**: 「もっと見る」トグル状態をどこで管理するか
- **Sources Consulted**: `frontend/src/App.tsx`
- **Findings**:
  - `App.tsx` は現在 `recommendations`, `parsedConditions`, `isLoading`, `error` を管理
  - 新規検索時に `setRecommendations(null)` するパターンが確立されている
  - `OtherCandidateSection` のトグル状態をコンポーネント内部に持つと、新規検索後も `isExpanded: true` が残るリスクがある
- **Implications**: `showOtherCandidates: boolean` は `App.tsx` で管理し、新規検索開始時に `false` にリセットする。`OtherCandidateSection` は `isExpanded` + `onExpand` を props として受け取るステートレスに近い設計とする。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| A: 既存コンポーネント拡張のみ | `App.tsx` にインライン追加、`PlaceCard` を直接修正 | 新規ファイル最小 | `App.tsx` の肥大化、`PlaceCard` テスト影響 | 小規模変更には適するが責務分離が弱い |
| B: 新規コンポーネントのみ | `OtherCandidateCard` を新設、`PlaceCard` 変更なし | `PlaceCard` 影響なし | カードUI2種でスタイル不整合リスク、ファイル増 | 過剰分離 |
| **C: ハイブリッド（採用）** | バックエンドはコントローラー差分計算、フロントは `OtherCandidateSection` 新設 + `PlaceCard` optional 化 | 責務分離、後方互換、最小変更 | `PlaceCard` テスト更新が必要 | gap-analysis で推奨済み |

## Design Decisions

### Decision: バックエンド差分計算の配置

- **Context**: `other_candidates` を `RecommendationService` 内で計算するか、コントローラーで計算するか
- **Alternatives Considered**:
  1. `RecommendationService` が `{recommendations:, other_candidates:}` を返す — サービスの責務拡大
  2. `SearchController#create` で差分計算 — コントローラーが少し厚くなるが範囲は限定的
- **Selected Approach**: `SearchController#create` で `recommended_names` を `Set` として構築し、`places.reject` で `other_candidates` を生成
- **Rationale**: `RecommendationService` は「AIが選定した推薦を返す」単一責務を維持。コントローラーの差分計算は3行程度で、サービス層への影響がない
- **Trade-offs**: コントローラーが若干厚くなるが許容範囲内
- **Follow-up**: `recommended_names` の `Set` 構築と `places.reject` のユニットテスト（RSpec）

### Decision: `PlaceCard` の `reason` を optional 化

- **Context**: 推薦理由なしで `PlaceCard` を再利用するか、別コンポーネントにするか
- **Alternatives Considered**:
  1. `reason?: string` に変更 → `PlaceCard` を両用途で再利用
  2. `OtherCandidateCard` を別途新設 → `PlaceCard` に触らない
- **Selected Approach**: `reason?: string` に変更。理由が存在する場合のみ `<p>` をレンダリング
- **Rationale**: UI の一貫性（同じカードスタイル）を維持しつつ、コンポーネント数を最小化
- **Trade-offs**: `PlaceCard.test.tsx` のフィクスチャ更新が必要だが変更量は微小
- **Follow-up**: `reason` なしケースのスナップショット/レンダリングテスト追加

### Decision: トグル状態の管理場所

- **Context**: `showOtherCandidates` を `OtherCandidateSection` 内部 vs `App.tsx` どちらで管理するか
- **Alternatives Considered**:
  1. `OtherCandidateSection` 内部に `isExpanded` state → コンポーネント自己完結
  2. `App.tsx` で管理、props で渡す → 新規検索時のリセットが確実
- **Selected Approach**: `App.tsx` で `showOtherCandidates: boolean` を管理。新規検索開始時に `false` にリセット
- **Rationale**: React のコンポーネント state は props 変更だけではリセットされない。`App.tsx` で管理することで、検索ごとにトグル状態が確実にリセットされる
- **Trade-offs**: `OtherCandidateSection` の props が増えるが責務が明確になる

## Risks & Mitigations

- 差分計算の名前マッチング精度 — Google Places API が同一店舗の名前表記を変えるケースは実質なし（`RecommendationService` は `places` の `name` をそのまま使う制約があるため）
- `PlaceCard` の `reason` optional 化によるテスト影響 — 既存テストのフィクスチャを `reason` あり/なし両方でカバーすることで対応
- `other_candidates` が初回レスポンスに含まれるため、大量候補（最大17件）が一度にフロントに転送される — 現状の20件制限内で問題なし。将来的にページネーションが必要になれば別 spec で対応

## References

- gap-analysis.md — 既存コード調査・アプローチ比較の詳細（ギャップ分析フェーズで作成）
