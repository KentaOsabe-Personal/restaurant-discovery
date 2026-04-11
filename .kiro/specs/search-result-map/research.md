# リサーチ & 設計決定ノート: search-result-map

## サマリー

- **フィーチャー**: `search-result-map`
- **調査スコープ**: Extension（既存システムへの拡張）— バックエンド小修正 + フロントエンド新規コンポーネント追加
- **主要発見事項**:
  - バックエンドは`FIELD_MASK`と`format_place`の2箇所を修正するだけで座標を提供できる（コントローラー変更不要）
  - `RecommendationService`はLLMに送るフィールドを`slice`で絞るため`lat`/`lng`がLLMプロンプトに混入しない（干渉なし）
  - `@vis.gl/react-google-maps`採用、`AdvancedMarker`使用のため`mapId`（Google Cloud Console）が実行時必須

---

## リサーチログ

### バックエンド: Google Places API 座標フィールド

- **Context**: `format_place`メソッドが返すハッシュに座標がなく、フロントが地図マーカーを描画できない
- **調査ソース**: コードベース探索（`google_places_service.rb`）
- **Findings**:
  - `FIELD_MASK`定数（L4）に`places.location`を追加するだけで`location.latitude`/`location.longitude`が取得可能
  - `place.dig("location", "latitude")`は座標なし時に`nil`を返す（nil安全）
  - コントローラーはハッシュをそのまま`render json:`するため変更不要
  - `RecommendationService`はL83-84で`slice(:name, :rating, :price_level, :address)`を使うため`lat`/`lng`はLLM非送出
- **Implications**: バックエンド変更は`google_places_service.rb`の2箇所のみ。テスト（spec/services・spec/requests）のモックデータ更新が必要

### フロントエンド: 現状アーキテクチャ分析

- **Context**: 既存のコンポーネント構成と状態管理パターンを把握し、最小変更で統合する
- **Findings**:
  - `App.tsx`が`max-w-3xl mx-auto`の単一カラムレイアウト — 2カラムへの変更が必要
  - `Candidate`型（`src/types/search.ts`）に`lat`/`lng`なし — 追加が必要
  - `google_maps_url`が各PlaceCardのReact keyとして使用されており、一意識別子として機能する
  - `OtherCandidateSection`は初期状態で折りたたまれている — マーカークリックで他候補が選択された場合の展開挙動を検討が必要
  - Google Mapsライブラリ未導入、Maps APIキー供給方法も未確立
- **Implications**: 選択状態の一意識別子として`google_maps_url`を使用するのが最も整合的。新規ライブラリ追加と環境変数設定が必要

### Google Maps ライブラリ選定

- **Context**: React 19 + TypeScript strict環境でGoogle Mapsを統合するライブラリの選定
- **Findings**:
  - `@vis.gl/react-google-maps` v1.x: Google/vis.gl公式、React 18/19対応、`APIProvider`・`Map`・`AdvancedMarker`・`InfoWindow`がReactコンポーネント、型安全
  - `@googlemaps/js-api-loader`: Google公式だが低レベルAPI（useEffectで手動管理が必要）
  - `@react-google-maps/api`: コミュニティ製、React 18以降のサポートが不安定
  - **重要**: `AdvancedMarker`は`Map`コンポーネントに`mapId` propが必要（Google Cloud Consoleで無償作成可能）
- **Implications**: `@vis.gl/react-google-maps`を採用。`mapId`は`VITE_GOOGLE_MAPS_MAP_ID`環境変数で供給

### Maps APIキー供給方法

- **Context**: バックエンドはファイルマウント方式だが、フロントエンドはビルド時埋め込みが必要
- **Findings**:
  - Viteは`VITE_`プレフィックスの環境変数をビルド時に`import.meta.env.VITE_*`として埋め込む
  - `docker-compose.yml`のfrontendサービスの`environment`に追加すればViteがビルド時に読み込む
  - ブラウザ公開されるキーのため、Google Cloud ConsoleでHTTP referrer制限を設定することを推奨
- **Implications**: `VITE_GOOGLE_MAPS_API_KEY`と`VITE_GOOGLE_MAPS_MAP_ID`の2つを環境変数として追加

### OtherCandidateSection 展開挙動

- **Context**: `OtherCandidateSection`は折りたたみ状態で開始する。他候補のマーカーをクリックすると、リストで該当PlaceCardが見えない状態になる可能性がある
- **Findings**: 要件4.2「マーカーをクリックした場合、リスト内の対応するレストランを視覚的にハイライトする」は機能させるためにはセクションが展開されている必要がある
- **Implications**: 実装時の決定事項として、他候補マーカークリック時に`OtherCandidateSection`を自動展開することを推奨

---

## アーキテクチャパターン評価

| オプション | 説明 | 強み | リスク/制限 | 備考 |
|---|---|---|---|---|
| Option A: 全拡張 | App.txに地図ロジックを直接追加 | ファイル数最小 | App.tsx肥大化、テスト困難 | 却下 |
| Option B: MapPanel分離 | MapPanelを独立コンポーネントとして作成 | 責務明確、テスト容易 | コンポーネント間props設計が必要 | 採用 |
| Option C: MapPanel + カスタムフック | Option BにuseSelectedPlaceフックを追加 | 選択状態のテスト容易 | 不要な抽象化（useState相当の処理のみ） | 却下（簡略化優先） |

---

## 設計決定

### Decision: 選択状態の識別子として`google_maps_url`を使用

- **Context**: リスト↔マーカー間の双方向選択連動に一意識別子が必要
- **Alternatives Considered**:
  1. 配列インデックス — 不安定（推薦/他候補の区別が必要）
  2. `name` — 重複の可能性あり
  3. `google_maps_url` — 既にReact keyとして使用されており、Google Maps URIとして一意
- **Selected Approach**: `google_maps_url: string | null`を選択状態の識別子として使用
- **Rationale**: 既存コードの設計に一致し、追加IDフィールドの導入が不要
- **Trade-offs**: 極めて稀にgoogle_maps_urlが重複する可能性があるが、実用上無視できる

### Decision: `AdvancedMarker`採用と`mapId`必須化

- **Context**: 選択マーカーの視覚的区別にカスタムスタイルが必要
- **Alternatives Considered**:
  1. `Marker`（レガシー） — mapId不要だがGoogleが非推奨化予定
  2. `AdvancedMarker` — mapId必要だがPinElementでカスタムスタイルが可能
- **Selected Approach**: `AdvancedMarker` + `mapId`を`VITE_GOOGLE_MAPS_MAP_ID`で供給
- **Rationale**: Googleの推奨に従い、将来の非推奨化リスクを排除
- **Trade-offs**: Google Cloud ConsoleでのMap ID作成という追加セットアップが必要（無料）

### Decision: 選択状態をApp.tsxのuseStateで管理（カスタムフックなし）

- **Context**: 双方向選択連動に状態管理が必要。カスタムフック（useSelectedPlace）の要否検討
- **Alternatives Considered**:
  1. App.tsxのuseState — シンプル、直接的
  2. useSelectedPlaceカスタムフック — テスト分離は向上するが、結局useStateのラッパーのみ
- **Selected Approach**: App.tsxのuseStateで直接管理
- **Rationale**: 簡略化原則。カスタムフックはstate 2つ（selectedGoogleMapsUrl、infoWindowVisible）のみを包むものになり、抽象化の価値がない

### Decision: InfoWindowとselectedGoogleMapsUrlを分離した2つのstate

- **Context**: 要件5.3「InfoWindow閉じる→選択状態を変更しない」に対応
- **Selected Approach**: `selectedGoogleMapsUrl`（選択）と`infoWindowVisible`（InfoWindow表示）を独立したstateとして管理
- **Rationale**: 選択状態とInfoWindowの表示状態は独立したライフサイクルを持つ（リストクリックは選択するがInfoWindowを開かない）

### Synthesis: OtherCandidateSection 展開

- **Context**: 他候補マーカークリック時の展開挙動
- **Selected Approach**: `OtherCandidateSection`に`isExpanded: boolean`と`onExpandChange: (expanded: boolean) => void` propsを追加し、App.tsxでother-candidateが選択された時に自動展開する
- **Rationale**: 要件4.2を正しく実現するために必要。セクションが折りたたまれたままだとハイライトが見えない

---

## リスク & 軽減策

- **`mapId`未設定リスク**: `VITE_GOOGLE_MAPS_MAP_ID`が未設定の場合`AdvancedMarker`が描画されない → エラーではなくマーカーが表示されないだけなので、README/docker-compose.ymlコメントで明記
- **座標精度リスク**: Google Places APIが店舗の中心座標を返す場合と敷地内を返す場合がある → UX上許容範囲
- **`fitBounds`単一マーカー問題**: 1件のみのマーカーで`fitBounds`を呼ぶと過度にズームする → `validCandidates.length === 1`の場合は`setCenter`+`setZoom(15)`を使用

---

## 参考

- [`@vis.gl/react-google-maps` ドキュメント](https://visgl.github.io/react-google-maps/)
- [Google Maps Platform: AdvancedMarker](https://developers.google.com/maps/documentation/javascript/advanced-markers/overview)
- [Vite: Env Variables](https://vite.dev/guide/env-and-mode)
