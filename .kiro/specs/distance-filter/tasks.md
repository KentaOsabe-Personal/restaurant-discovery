# Implementation Plan

- [x] 1. Foundation — 自宅位置定数と共有型定義
- [x] 1.1 フロントエンド自宅位置定数とTypeScript型定義の作成
  - `src/config/homeLocation.ts`に自宅緯度経度定数（lat: 37.9161, lng: 139.0364）を`as const`でエクスポート
  - `src/types/search.ts`に`TravelTime`型（`'within_30min' | 'within_1hour' | '1_to_2_hours'`）を追加
  - `src/types/search.ts`の`Candidate`インターフェースに`distance_km?: number | null`をoptionalフィールドとして追加
  - `pnpm build`がエラーなく通過し、新規の型・定数が他モジュールからインポート可能であること
  - _Requirements: 1.1_

- [x] 1.2 (P) バックエンド自宅位置定数の作成
  - `config/initializers/home_location.rb`に`HOME_LOCATION`定数（`{ lat: 37.9161, lng: 139.0364 }.freeze`）を定義
  - Railsコンソールで`HOME_LOCATION[:lat]`が`37.9161`を返すことで疎通確認
  - _Requirements: 1.1_
  - _Boundary: Backend/Config_

- [x] 2. Core — バックエンド距離計算・バリデーション・フィルタリング
- [x] 2.1 DistanceCalculatorServiceの実装とユニットテスト
  - Haversine公式による2地点間直線距離（km）を計算するステートレスサービスを`app/services/distance_calculator_service.rb`に実装
  - `DistanceCalculatorService.new.call(home_lat, home_lng, place_lat, place_lng)`で距離（Float）を返す
  - RSpecユニットテスト: 新潟駅（37.9161, 139.0364）→長岡駅（37.4520, 138.8510）が約37kmとなる精度検証、同一地点で0.0km
  - `bundle exec rspec`で該当テストがパスすること
  - _Requirements: 5.1, 5.2_

- [x] 2.2 SearchControllerへのtravel_timeバリデーション・distance_km付与・ポストフィルタリング追加
  - `TRAVEL_TIME_RANGES`定数を定義（within_30min: 0-30km, within_1hour: 0-60km, 1_to_2_hours: 60-120km）
  - `travel_time`パラメータが存在し`TRAVEL_TIME_RANGES`のキーに含まれない場合は422エラーを返す
  - ラーメンモードの全placeに`DistanceCalculatorService`で`distance_km`を付与（lat/lngがnilの場合はnil、Rails.logger.warnで記録）
  - `travel_time`指定時は範囲外およびdistance_km nilのplaceを除外するポストフィルタリングをRecommendationService呼び出し前に実施
  - 居酒屋モードではdistance_km付与・フィルタリングをスキップ
  - RSpecテスト: 不正travel_timeで422返却、within_30min指定で30km超店舗が除外、ラーメン全candidateにdistance_km存在、居酒屋でdistance_kmフィールド不在、1_to_2_hours指定で60km未満・120km超の店舗が除外
  - `bundle exec rspec`で該当テストがすべてパスすること
  - _Requirements: 4.1, 4.2, 4.3, 5.1, 5.2_

- [x] 3. Core — フロントエンド距離フィルターUIとAPIクライアント拡張
- [x] 3.1 (P) DistanceFilterButtonsコンポーネントの実装とテスト
  - 4つの選択肢（"30分以内" / "1時間以内" / "1時間以上2時間以内" / "距離指定なし"）をラジオボタン方式で表示するControlled componentを実装
  - 親から`value: TravelTime | null`と`onChange: (value: TravelTime | null) => void`を受け取る
  - 選択状態はTailwindで視覚的に区別（選択: 塗りつぶし、非選択: アウトライン）、"距離指定なし"選択時は`onChange(null)`を呼ぶ
  - Vitestテスト: 4ボタン表示、各ボタンクリック時に正しい値でonChangeが呼ばれる、value propに応じた選択スタイル適用
  - `pnpm test --run`で該当テストがパスすること
  - _Requirements: 2.1, 2.3_
  - _Boundary: Frontend/UI_

- [x] 3.2 (P) SearchAPIクライアントへのtravel_timeパラメータ追加
  - `searchPlaces`関数にオプション引数`travelTime?: TravelTime`を追加
  - `travelTime`が指定された場合のみリクエストボディに`travel_time`キーを含め、`undefined`時はキーを含めない
  - TypeScriptビルド（`pnpm build`）がエラーなく通過すること
  - _Requirements: 3.1, 3.2_
  - _Boundary: Frontend/API_

- [x] 4. Integration — フロントエンド統合と距離表示
- [x] 4.1 App.tsxへのdistanceFilterステート管理とDistanceFilterButtons組み込み
  - `distanceFilter: TravelTime | null`ステートを追加（初期値`null` = 距離指定なし、要件2.4）
  - `activeTab === 'ramen'`の場合のみ`DistanceFilterButtons`をレンダリング（要件2.1, 2.2）
  - タブ切替時に`distanceFilter`を`null`にリセット
  - 検索実行時に`activeTab === 'ramen'`かつ`distanceFilter`がnullでない場合のみ`travelTime`をsearchPlacesに渡す
  - ラーメンタブで距離フィルターボタンが4つ表示され、居酒屋タブ切替で非表示＋リセットされること
  - _Requirements: 2.1, 2.2, 2.4, 3.1, 3.2_
  - _Depends: 3.1, 3.2_

- [x] 4.2 (P) PlaceCardへのdistance_km表示追加とテスト
  - `distance_km`が`number`の場合に距離バッジを表示（例: "15.3 km"、小数点1桁で`toFixed(1)`）
  - `distance_km`が`null`または`undefined`の場合は距離表示なし（`!= null`のloose equalityガードで両方を処理）
  - Vitestテスト: distance_kmが数値の場合に表示される、null/undefinedの場合に非表示
  - `pnpm test --run`で該当テストがパスすること
  - _Requirements: 6.1_
  - _Boundary: Frontend/UI_

## Implementation Notes
- Task 2.1: タスク仕様の「新潟駅→長岡駅 約37km」は誤り。Haversine実計算値は54.12km。テストは正しい期待値（54.0 ± 2.0km）で作成済み。
