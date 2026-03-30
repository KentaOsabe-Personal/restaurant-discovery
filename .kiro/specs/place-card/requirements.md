# 要件定義書

## Introduction

`PlaceCard` は、AIが推薦する1件の店舗情報をカード形式で表示するフロントエンドコンポーネントである。店舗名・評価・価格帯・住所・推薦理由を一覧性の高いカードUIで提示し、Google Maps への外部リンクを提供する。app-design.md の Chunk 9 に対応する実装単位であり、Chunk 10（App.tsx 統合）において `RecommendationList` 内でレンダリングされるビルディングブロックとなる。

バックエンド API（SearchController Integration）の `Recommendation` スキーマは `name` / `rating` / `price_level` / `address` / `google_maps_url` / `reason` の6フィールドで構成される。`photo_url` および `opening_hours` はフィールドマスク最小化方針（google-places-service/requirements.md Design Decision 参照）によりスコープ外であり、本コンポーネントの表示対象に含まれない。`rating` / `price_level` はいずれも `null` の可能性があり、null 安全な表示制御が必須要件である。

## Requirements

### Requirement 1: 店舗基本情報の表示

**Objective:** ユーザーとして、推薦された店舗の店舗名・住所・推薦理由を確認したい。そうすることでどのお店か・なぜおすすめなのかをひと目で把握できる。

#### Acceptance Criteria

1. The PlaceCard コンポーネント shall `name` プロパティの店舗名を表示する。
2. The PlaceCard コンポーネント shall `address` プロパティの住所を表示する。
3. The PlaceCard コンポーネント shall `reason` プロパティの推薦理由テキストを表示する。
4. When `name`、`address`、`reason` がすべて提供された場合, the PlaceCard コンポーネント shall それら3つの情報をすべてカード内に表示する。

---

### Requirement 2: 評価の表示

**Objective:** ユーザーとして、店舗の評価スコアを確認したい。そうすることでお店のクオリティを判断しやすくなる。

#### Acceptance Criteria

1. When `rating` プロパティが数値として提供された場合, the PlaceCard コンポーネント shall 評価スコアをカード内に表示する。
2. If `rating` プロパティが `null` の場合, the PlaceCard コンポーネント shall 評価欄を表示しない（またはデフォルト文字列で代替表示する）。
3. The PlaceCard コンポーネント shall `rating` プロパティを `number | null` 型として受け取る。

---

### Requirement 3: 価格帯の表示

**Objective:** ユーザーとして、店舗の価格帯を確認したい。そうすることで予算に合うお店かを判断できる。

#### Acceptance Criteria

1. When `price_level` プロパティが文字列として提供された場合, the PlaceCard コンポーネント shall 価格帯情報をカード内に表示する。
2. If `price_level` プロパティが `null` の場合, the PlaceCard コンポーネント shall 価格帯欄を表示しない（またはデフォルト文字列で代替表示する）。
3. The PlaceCard コンポーネント shall `price_level` プロパティを `string | null` 型として受け取る。

---

### Requirement 4: Google Maps リンクの表示

**Objective:** ユーザーとして、カードから直接 Google Maps でお店の詳細を確認したい。そうすることで地図・口コミ・詳細情報に素早くアクセスできる。

#### Acceptance Criteria

1. The PlaceCard コンポーネント shall `google_maps_url` プロパティの値を `href` とするリンク要素を表示する。
2. The PlaceCard コンポーネント shall Google Maps リンクを新しいタブまたはウィンドウで開く（`target="_blank"`）。
3. The PlaceCard コンポーネント shall `google_maps_url` プロパティを必須の `string` 型として受け取る。
4. When Google Maps リンクがレンダリングされた場合, the PlaceCard コンポーネント shall リンクに意味のあるラベルテキストを表示する（例: 「Google Mapsで見る」）。

---

### Requirement 5: コンポーネントインターフェース（Props）

**Objective:** 開発者として、明確に型定義された Props で PlaceCard を利用したい。そうすることで TypeScript の型チェックによって誤用を防ぎ、Recommendation 型との整合性を保てる。

#### Acceptance Criteria

1. The PlaceCard コンポーネント shall 以下の Props インターフェースを持つ:
   - `name: string`（必須）
   - `rating: number | null`（必須）
   - `price_level: string | null`（必須）
   - `address: string`（必須）
   - `google_maps_url: string`（必須）
   - `reason: string`（必須）
2. The PlaceCard コンポーネント shall TypeScript の `strict` モードに準拠した型定義を持つ。
3. The PlaceCard コンポーネント shall React の関数コンポーネントとして実装される。

---

### Requirement 6: アクセシビリティ

**Objective:** ユーザーとして、スクリーンリーダーやキーボード操作でも PlaceCard の情報にアクセスしたい。そうすることでアクセシビリティ要件を満たせる。

#### Acceptance Criteria

1. The PlaceCard コンポーネント shall 外部リンク（Google Maps）に `rel="noopener noreferrer"` を付与する。
2. The PlaceCard コンポーネント shall 店舗名を見出し要素（`<h2>` または `<h3>`）としてマークアップする。

---

### Requirement 7: Recommendation 型のクリーンアップ

**Objective:** 開発者として、`Recommendation` 型からバックエンド API が返さないフィールドを削除したい。そうすることで型定義が実際の API レスポンスと一致し、`PlaceCard` が型ドリフトなく `Recommendation` 型を直接利用できるようになる。

#### Acceptance Criteria

1. `frontend/src/types/search.ts` の `Recommendation` 型から `photo_url: string | null` フィールドを削除する。
2. `frontend/src/types/search.ts` の `Recommendation` 型から `opening_hours: OpeningHours | null` フィールドを削除する。
3. `frontend/src/types/search.ts` の `OpeningHours` 型を削除する。
4. 削除後、既存のコンシューマー（`SearchResponse` 等）への影響がないことを TypeScript コンパイルで確認する。
