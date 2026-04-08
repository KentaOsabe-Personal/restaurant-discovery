# ギャップ分析: load-more（もっと見る）機能

## 分析サマリー

- **スコープ**: バックエンドのレスポンス拡張（`other_candidates` フィールド追加）＋フロントエンドの型定義・状態管理・UI追加。既存パイプラインへの影響は最小限。
- **最大の課題**: `PlaceCard` が現在 `reason: string`（必須）を前提とした型設計になっており、推薦理由を持たない `other_candidates` の表示に対応するには型の調整が必要。
- **推奨アプローチ**: Option C（ハイブリッド）— バックエンドはコントローラーで差分計算、フロントエンドは型・コンポーネントを段階的に追加。
- **工数**: S〜M（既存パターンの延長で実装可能、新規コンポーネント1〜2個程度）
- **リスク**: Low（完全にアディティブな変更、既存の検索フローに破壊的変更なし）

---

## 1. 現状調査

### バックエンド

| ファイル | 役割 | 現状 |
|---|---|---|
| `app/controllers/api/search_controller.rb` | 検索エンドポイント | `places` 配列を取得後、`RecommendationService` に渡すが、レスポンスに `recommendations` のみ含める |
| `app/services/google_places_service.rb` | Google Places API 呼び出し | 最大20件を取得し `{name, rating, price_level, address, google_maps_url}` 配列を返す |
| `app/services/recommendation_service.rb` | AI推薦（OpenAI） | `places` から推薦 3〜5 件を選定し `merge_recommendations` で詳細情報をマージして返す。非推薦の `places` は破棄される |

**現状のデータフロー:**
```
GooglePlacesService → places[0..19]
  ↓ RecommendationService
  → recommended_names (AI選定)
  → merge_recommendations → recommendations[3..5]
  ↓ コントローラー
  → { recommendations: [...], parsed_conditions: {...} }  ← other_candidates が存在しない
```

### フロントエンド

| ファイル | 役割 | 現状 |
|---|---|---|
| `src/types/search.ts` | 型定義 | `Recommendation`（`reason: string` 必須）、`SearchResponse`（`recommendations` のみ） |
| `src/api/search.ts` | API通信 | `SearchResponse` を返す fetch ラッパー |
| `src/App.tsx` | 状態管理 | `recommendations`, `parsedConditions`, `isLoading`, `error` を管理 |
| `src/components/RecommendationList.tsx` | 推薦リスト表示 | `Recommendation[]` を受け取り `PlaceCard` を列挙 |
| `src/components/PlaceCard.tsx` | 店舗カード | `PlaceCardProps = Recommendation`（`reason` 必須で表示） |

---

## 2. 要件とコードのギャップ

### 要件 3: バックエンドAPIの拡張

| 要件 | 現状 | ギャップ |
|---|---|---|
| `other_candidates` をレスポンスに含める | 含まれない | **Missing**: コントローラーで `places - recommendations` の差分を計算し、レスポンスに追加が必要 |
| `other_candidates` の フィールド構造が AI おすすめと同一 | `GooglePlacesService` は既に必要フィールドをすべて取得済み | **OK**: フィールドマスクに `name/rating/priceLevel/formattedAddress/googleMapsUri` が含まれる |
| AIおすすめに含まれない店舗のみを含める | `RecommendationService#merge_recommendations` 内に names が存在する | **Missing**: 差分計算ロジックが未実装 |
| 元の順序を維持する | `GooglePlacesService` は API 返却順を保持している | **OK**: `places` 配列の順序はすでに保持されている |

**差分計算の実装箇所（選択肢）:**
- A) `SearchController#create` 内でコントローラーレベルで計算
- B) `RecommendationService` が `{recommendations:, other_candidates:}` を返すよう拡張

### 要件 1 & 2: フロントエンドの表示制御・追加候補表示

| 要件 | 現状 | ギャップ |
|---|---|---|
| `other_candidates` を型として扱う | `SearchResponse` に存在しない | **Missing**: `OtherCandidate` 型（`reason` なし）と `SearchResponse` の更新が必要 |
| 「もっと見る」ボタンの表示制御 | ボタンが存在しない | **Missing**: ボタンコンポーネントまたはインラインUI |
| 追加候補の表示（別セクション） | `RecommendationList` は `recommendations` のみ対象 | **Missing**: 別セクション用コンポーネントまたは条件分岐 |
| `PlaceCard` に `reason` なしで表示 | `PlaceCardProps = Recommendation`（`reason` 必須） | **Constraint**: `reason` を optional にするか、別コンポーネントが必要 |

### 要件 4: ローディング・エラー状態

| 要件 | 現状 | ギャップ |
|---|---|---|
| 「もっと見る」のローディング状態 | 既存の `isLoading` は検索全体用 | **Missing**: `other_candidates` は既にレスポンスに含まれるため、**別途のローディング状態は不要**（クライアントサイドのトグルで完結） |
| 連打防止 | 未実装 | **Missing**: ボタンの `disabled` 制御（ただし実装は trivial） |

> **注意**: 要件4はAPIを追加で呼ぶ想定で書かれているが、実際は `other_candidates` を初回検索レスポンスに含めれば、追加のAPI呼び出しは不要。「ローディング」はクライアントサイドのトグル表示の切り替えのみになり、要件4の大部分は自明に解決する。

---

## 3. 実装アプローチ

### Option A: 既存コンポーネントを拡張

**対象変更ファイル:**
- `search_controller.rb`: レスポンスに `other_candidates` を追加
- `types/search.ts`: `OtherCandidate` 型追加、`SearchResponse` 更新
- `App.tsx`: `otherCandidates` 状態と「もっと見る」トグルを追加
- `PlaceCard.tsx`: `reason` を optional に変更
- `RecommendationList.tsx` または `App.tsx`: 追加候補セクションをインラインで追加

**トレードオフ:**
- ✅ 新規ファイルを最小限に抑えられる
- ✅ 既存パターンと整合
- ❌ `App.tsx` がさらに肥大化する
- ❌ `PlaceCard` の `reason` を optional 化すると既存テストの前提が変わる

---

### Option B: 新規コンポーネントを作成

**新規ファイル:**
- `components/OtherCandidateSection.tsx`: 「もっと見る」ボタン＋追加候補リスト
- `components/OtherCandidateCard.tsx`: `reason` なしの店舗カード（または `PlaceCard` の variant）

**変更ファイル:**
- `search_controller.rb`: レスポンスに `other_candidates` 追加
- `types/search.ts`: 型定義追加
- `App.tsx`: `otherCandidates` を状態として保持し `OtherCandidateSection` に渡す

**トレードオフ:**
- ✅ 責務の明確な分離
- ✅ `PlaceCard` の型変更が不要（既存テストに影響なし）
- ✅ 独立してテストしやすい
- ❌ ファイル数が増える
- ❌ カードUIが2種類になり視覚的不整合のリスク

---

### Option C: ハイブリッドアプローチ（推奨）

**バックエンド:** `SearchController` でコントローラーレベルの差分計算（サービスへの影響を最小化）

**フロントエンド:**
- `types/search.ts`: `OtherCandidate`（`reason` なし）型を追加し `SearchResponse` を拡張
- `PlaceCard.tsx`: `reason` を `reason?: string` に変更（後方互換）し、 `reason` がない場合は非表示
- 新規 `OtherCandidateSection.tsx`: 「もっと見る」ボタン＋追加候補リストの責務を持つ（`App.tsx` の肥大化を防ぐ）
- `App.tsx`: `otherCandidates` 状態を追加し `OtherCandidateSection` に渡す

**変更ファイル一覧:**

| ファイル | 変更種別 | 内容 |
|---|---|---|
| `backend/app/controllers/api/search_controller.rb` | 拡張 | `other_candidates` を計算してレスポンスに追加 |
| `frontend/src/types/search.ts` | 拡張 | `OtherCandidate` 型追加、`SearchResponse` に `other_candidates` 追加 |
| `frontend/src/components/PlaceCard.tsx` | 小変更 | `reason?: string` に変更し、表示を条件付きに |
| `frontend/src/components/PlaceCard.test.tsx` | 更新 | `reason` なしケースのテスト追加 |
| `frontend/src/App.tsx` | 拡張 | `otherCandidates` 状態追加、`OtherCandidateSection` をレンダリング |
| `frontend/src/components/OtherCandidateSection.tsx` | **新規** | 「もっと見る」ボタン＋追加候補リスト |
| `frontend/src/components/OtherCandidateSection.test.tsx` | **新規** | ボタン表示制御・展開動作のテスト |

**トレードオフ:**
- ✅ バックエンド変更が最小（コントローラー1ファイルのみ）
- ✅ `PlaceCard` の変更が後方互換（`reason` optional 化）
- ✅ `App.tsx` のロジック増加を `OtherCandidateSection` に分離
- ✅ 追加API呼び出し不要（コスト最適化と整合）
- ❌ `PlaceCard` の型変更で既存テストのアサーションを一部更新が必要

---

## 4. 工数・リスク評価

| 軸 | 評価 | 根拠 |
|---|---|---|
| **工数** | **S**（1〜3日） | 既存パターンの完全な延長。差分計算はシンプルな配列操作、UIはトグル + リスト表示 |
| **リスク** | **Low** | 完全にアディティブ。既存の検索フローに破壊的変更なし。追加APIコール不要でコスト変動もなし |

---

## 5. デザインフェーズへの引き継ぎ事項

### 推奨アプローチ
**Option C（ハイブリッド）** を採用し、バックエンドはコントローラーで差分計算、フロントエンドは新規 `OtherCandidateSection` コンポーネントを作成。

### 設計フェーズで確定すべき判断

1. **`PlaceCard` の型変更スコープ**: `reason?: string` にするか、`OtherCandidate` 専用の別コンポーネントにするか（テスト影響の許容範囲による）
2. **「もっと見る」ボタンのUI仕様**: 既存の Tailwind スタイルとの整合性
3. **バックエンドの差分計算位置**: コントローラー内 vs `RecommendationService` 拡張の最終判断
4. **`other_candidates` が空の場合の UI**: ボタンを非表示にする条件の実装詳細

### Research Needed（なし）
> 既存技術スタック（Rails / React / Tailwind）の範囲内で実装可能であり、外部調査は不要。
