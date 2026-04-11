# 実装計画

- [x] 1. バックエンドの座標データ提供
- [x] 1.1 GooglePlacesServiceのFIELD_MASKとformat_placeにlat/lngを追加する
  - `FIELD_MASK`定数に`places.location`を追加し、Places APIから座標データを取得できるようにする
  - `format_place`の出力ハッシュに`lat: place.dig("location", "latitude")`と`lng: place.dig("location", "longitude")`を追加する
  - `place.dig()`はキー不在時にnilを返すため、座標取得不可時のnull返却（要件1.3）が自動的に保証される
  - `docker compose exec backend bin/rubocop`でLintエラーなく通過する
  - _Requirements: 1.1, 1.2, 1.3_
  - _Boundary: GooglePlacesService_

- [x] 1.2 バックエンドテストにlat/lngフィールドのアサーションを追加する
  - `google_places_service_spec.rb`の`format_place`テストに正常系（数値lat/lng）のアサーションを追加する
  - `location`フィールドなし時に`lat: nil, lng: nil`が出力されることを検証するテストケースを追加する
  - `search_spec.rb`・`omakase_spec.rb`のプレイスモックデータに`lat`/`lng`を追加し、レスポンスJSONへの含有を検証する
  - `docker compose exec backend bundle exec rspec`がすべてパスする
  - _Requirements: 1.1, 1.2, 1.3_
  - _Boundary: Backend Specs_

- [x] 2. (P) フロントエンド基盤設定（依存ライブラリ・型定義・環境変数）
- [x] 2.1 @vis.gl/react-google-mapsのインストールと環境変数設定
  - `pnpm add @vis.gl/react-google-maps`で`~1.x`ライブラリをfrontend/package.jsonに追加する
  - `docker-compose.yml`のfrontendサービス`environment`に`VITE_GOOGLE_MAPS_API_KEY`と`VITE_GOOGLE_MAPS_MAP_ID`を追加する
  - `docker compose exec frontend pnpm build`でビルドが成功する
  - _Requirements: 3.1, 6.1_
  - _Boundary: Frontend Config_

- [x] 2.2 (P) Candidate型にlat/lngフィールドを追加する
  - `src/types/search.ts`の`Candidate`型に`lat: number | null`と`lng: number | null`を追加する
  - `Recommendation`（`Candidate`拡張）と`OtherCandidate`（エイリアス）が型継承によりlat/lngを自動的に持つことを確認する
  - `docker compose exec frontend pnpm build`でTypeScript strictモード下で型エラーなくビルドが成功する
  - _Requirements: 1.1, 1.2, 1.3_
  - _Boundary: Frontend Types_

- [x] 3. (P) PlaceCard・リストコンポーネントへの選択状態props追加
- [x] 3.1 PlaceCardへのisSelected・onSelect props追加
  - `isSelected?: boolean`と`onSelect?: () => void`を`PlaceCardProps`に追加する
  - `isSelected`がtrueの場合にTailwindの`ring-2 ring-orange-400`等のクラスを条件付きで適用する
  - 既存の表示ロジック（名前・評価・住所・価格帯）は一切変更しない
  - `onSelect`が渡された場合、クリック時にコールバックが呼び出されること
  - _Requirements: 4.1, 4.2_
  - _Boundary: PlaceCard_

- [x] 3.2 RecommendationListへの選択状態props伝播
  - `selectedGoogleMapsUrl: string | null`と`onSelect: (url: string) => void` propsを追加する
  - 各PlaceCardに`isSelected={item.google_maps_url === selectedGoogleMapsUrl}`と`onSelect={() => onSelect(item.google_maps_url)}`を渡す
  - `docker compose exec frontend pnpm build`でTypeScript型エラーなく成功する
  - _Requirements: 4.1, 4.2, 4.3_
  - _Boundary: RecommendationList_

- [x] 3.3 OtherCandidateSectionへの選択状態props・onExpandChange対応
  - `selectedGoogleMapsUrl: string | null`と`onSelect: (url: string) => void` propsを追加する
  - 既存の`onExpand: () => void`を`onExpandChange: (expanded: boolean) => void`にリネームしシグネチャを変更する
  - 各PlaceCardに選択状態（`isSelected`・`onSelect`）を伝播する
  - `docker compose exec frontend pnpm build`でTypeScript型エラーなく成功する
  - _Requirements: 4.1, 4.2, 4.3_
  - _Boundary: OtherCandidateSection_

- [x] 4. (P) MapPanelコンポーネントの実装
- [x] 4.1 MapPanelの2層コンポーネント構造・エラー表示実装
  - `src/components/MapPanel.tsx`を新規作成し、`MapPanel`（APIProvider外側ラッパー）と`MapPanelContent`（地図・マーカー・InfoWindow内側）の2層構造で実装する
  - `MapPanelProps`インターフェース（`candidates`, `selectedGoogleMapsUrl`, `infoWindowVisible`, `onMarkerClick`, `onInfoWindowClose`）を定義する
  - `APIProvider`に`VITE_GOOGLE_MAPS_API_KEY`を渡し、`Map`コンポーネントに`VITE_GOOGLE_MAPS_MAP_ID`を渡す
  - `useApiLoadingStatus() === 'FAILED'`の場合、地図パネルエリア全体にエラーメッセージdivを表示する
  - ファイルが存在し`docker compose exec frontend pnpm build`でコンパイルエラーなく成功する
  - _Requirements: 6.1, 6.2_
  - _Depends: 2.1, 2.2_
  - _Boundary: MapPanel_

- [x] 4.2 全候補マーカー表示・fitBounds・選択ハイライト実装
  - `lat`/`lng`非nullの候補に対してのみ`AdvancedMarker`+`PinElement`を描画する（null座標候補は除外）
  - `useEffect([map, candidates])`で`fitBounds`を実行し全マーカーが収まるようビューポートを調整する
  - 有効候補1件の場合は`map.setCenter()`+`map.setZoom(15)`、0件の場合は`fitBounds`をスキップしデフォルト表示を維持する
  - `selectedGoogleMapsUrl`と一致するマーカーの`PinElement`に`background: '#FF6B35'`を適用し視覚的にハイライトする
  - 検索結果読み込み後に全有効マーカーが地図上に表示され、ビューポートが全マーカーを包含するよう自動調整されること
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_
  - _Boundary: MapPanel_

- [x] 4.3 マーカークリック時のInfoWindow表示・制御実装
  - マーカークリック時に`onMarkerClick(googleMapsUrl)`を呼び出す
  - `infoWindowVisible`がtrueかつ`selectedGoogleMapsUrl`が非nullの場合にInfoWindowを選択マーカーの座標にpositionとして表示する
  - InfoWindowの内容として店舗名・評価（nullの場合は非表示）・住所を表示する
  - InfoWindow閉じる操作時に`onInfoWindowClose()`を呼び出す
  - 別マーカーをクリックすると現在のInfoWindowが閉じられ新しいマーカーのInfoWindowが開くこと
  - _Requirements: 5.1, 5.2, 5.3_
  - _Boundary: MapPanel_

- [x] 5. App.tsx統合・2カラムレイアウト実装
- [x] 5.1 App.tsxへの選択状態管理追加
  - `selectedGoogleMapsUrl: string | null`と`infoWindowVisible: boolean`のstateを追加する
  - `handleListSelect`（選択更新・InfoWindow閉じる）・`handleMarkerClick`（選択更新・InfoWindow開く）・`handleInfoWindowClose`（InfoWindowのみ閉じる）ハンドラーを定義する
  - 検索実行時に`selectedGoogleMapsUrl`をnull・`infoWindowVisible`をfalseにリセットする
  - `docker compose exec frontend pnpm build`でTypeScript型エラーなく成功する
  - _Requirements: 4.3, 4.4, 5.3_
  - _Depends: 3.3, 4.3_
  - _Boundary: App.tsx_

- [x] 5.2 2カラムレイアウトとMapPanelの組み込み
  - `recommendations !== null && recommendations.length > 0`の条件下のみ`flex h-screen overflow-hidden`の2カラムレイアウトを適用する
  - 左カラム（`w-1/2 overflow-y-auto p-4`）に既存の検索UI+リスト、右カラム（`w-1/2 h-full`）に`MapPanel`を配置する
  - `recommendations`と`otherCandidates`を結合したフラット配列を`MapPanel`の`candidates`に渡す
  - レスポンシブクラスを一切使用せずデスクトップ専用固定レイアウトとする
  - 検索後に地図パネルが表示され、検索前・0件時には地図パネルが非表示であること
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.2_
  - _Boundary: App.tsx_

- [x] 5.3 選択状態propsをリストコンポーネントへ伝播・OtherCandidateSection自動展開
  - `RecommendationList`と`OtherCandidateSection`に`selectedGoogleMapsUrl`・`onSelect`（handleListSelect）を渡す
  - App.tsxに`isOtherExpanded`stateを追加し、`otherCandidates.some(c => c.google_maps_url === selectedGoogleMapsUrl)`でother候補選択時に`OtherCandidateSection`の`isExpanded`をtrueに制御し自動展開する
  - `onExpandChange`ハンドラーでユーザーの手動折りたたみに対応する
  - リスト項目クリックで対応マーカーがハイライトされ、マーカークリックで対応リスト項目がハイライトされること
  - _Requirements: 4.1, 4.2, 4.3, 4.4_
  - _Boundary: App.tsx_

- [x] 6. フロントエンドテスト
- [x] 6.1 (P) PlaceCardのunit test追加
  - `isSelected=true`時にハイライトクラス（`ring-2 ring-orange-400`等）が適用されることを検証する
  - `onSelect`が渡された場合にクリックでコールバックが呼ばれることを検証する
  - `docker compose exec frontend pnpm test --run`でテストがパスする
  - _Requirements: 4.1, 4.2_
  - _Boundary: PlaceCard_

- [x] 6.2 (P) MapPanelのunit test追加（エラー状態）
  - `useApiLoadingStatus()`が`'FAILED'`を返す状態をモックし、地図エリアにエラーメッセージが表示されることを検証する
  - `docker compose exec frontend pnpm test --run`でテストがパスする
  - _Requirements: 6.1_
  - _Boundary: MapPanel_

- [x] 6.3 (P) RecommendationList・OtherCandidateSectionのintegration test追加
  - `RecommendationList`に`onSelect`を渡し、PlaceCardクリックで`onSelect`が呼ばれることを検証する
  - `OtherCandidateSection`に`onSelect`を渡し、PlaceCardクリックで`onSelect`が呼ばれることを検証する
  - `docker compose exec frontend pnpm test --run`でテストがパスする
  - _Requirements: 4.1_
  - _Boundary: RecommendationList, OtherCandidateSection_
