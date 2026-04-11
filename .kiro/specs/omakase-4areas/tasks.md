# 実装計画 — omakase-4areas

- [x] 1. Foundation: RecommendationService の min/max count 拡張
- [x] 1.1 SYSTEM_PROMPT 定数をテンプレート化して min_count/max_count 引数を追加する
  - `SYSTEM_PROMPT` 定数を `SYSTEM_PROMPT_TEMPLATE` にリネームし `%<min>d〜%<max>d` プレースホルダーを挿入する
  - `call` メソッドに `min_count: 3, max_count: 5` keyword args を追加し、`format(SYSTEM_PROMPT_TEMPLATE, min: min_count, max: max_count)` でプロンプトを生成する
  - 既存の `call(places, query)` 呼び出しが引数なしでデフォルト値 3〜5 を使用し続けることを確認する
  - `docker compose exec backend bundle exec rspec spec/services/recommendation_service_spec.rb` で既存テストが全て通過する
  - _Requirements: 3.1_

- [x] 1.2 min_count/max_count 指定時のプロンプト反映テストを追加する
  - `min_count: 5, max_count: 5` を渡したとき、OpenAI に送信されるシステムプロンプトに「5〜5 件」が含まれることを WebMock で検証するテストを新 context として追加する
  - 既存テストを一切変更しない
  - `docker compose exec backend bundle exec rspec spec/services/recommendation_service_spec.rb` で全テスト通過
  - _Requirements: 3.1_

- [x] 2. Core: OmakaseService の実装（バックエンド）
- [x] 2.1 (P) OmakaseService クラスとサブエリア定数を実装する
  - `backend/app/services/omakase_service.rb` を新規作成する
  - `SUB_AREAS` 定数で4エリア（ekimae / ekinan / furumachi / nagaoka）とそれぞれのプレフィックス・サブエリア名配列を定義する
  - `NIGHT_GENRE = "居酒屋 バー"` 定数を定義する
  - `call(area_id)` メソッドで `SUB_AREAS[area_id]` が存在しない場合は `OmakaseService::UnknownArea` を raise する
  - `call(area_id)` の返り値は `{ area:, genre:, price_level: nil, keyword: nil, sub_area:, area_id: }` の Hash である
  - `random:` コンストラクタ引数でランダム性を注入可能にする（デフォルト `Random.new`）
  - _Requirements: 2.1, 2.2, 2.3_
  - _Boundary: OmakaseService_

- [x] 2.2 (P) OmakaseService の単体テストを作成する
  - `backend/spec/services/omakase_service_spec.rb` を新規作成する
  - 4エリア各 ID で `:area` / `:genre` / `:sub_area` / `:area_id` が正しく返ることを検証する
  - 未知 area_id で `OmakaseService::UnknownArea` を raise することを検証する
  - `Random.new(42)` を注入して再現可能なサブエリア選択を確認する
  - 4エリア全ての `SUB_AREAS` エントリが非空配列と非空プレフィックスを持つことを検証する
  - `docker compose exec backend bundle exec rspec spec/services/omakase_service_spec.rb` で全テスト通過
  - _Requirements: 2.1, 2.2, 2.3_
  - _Boundary: OmakaseService_

- [x] 3. Core: フロントエンド型定義と設定ファイル
- [x] 3.1 (P) OmakaseResponse 型を search.ts に追加する
  - `frontend/src/types/search.ts` に `OmakaseMeta = { area_id: string; sub_area: string }` を追加する
  - `OmakaseResponse = SearchResponse & { omakase: OmakaseMeta }` を追加する
  - `docker compose exec frontend pnpm build` で TypeScript エラーなしにビルドが通過する
  - _Requirements: 3.1, 3.2_
  - _Boundary: Frontend Types_

- [x] 3.2 (P) omakaseAreas 設定ファイルと OmakaseAreaId 型を作成する
  - `frontend/src/config/omakaseAreas.ts` を新規作成する
  - `OmakaseAreaId = 'ekimae' | 'ekinan' | 'furumachi' | 'nagaoka'` を export する
  - `OmakaseArea = { id: OmakaseAreaId; label: string }` を export する
  - `omakaseAreas` 定数として4エリア（「新潟駅前でおすすめ」「新潟駅南でおすすめ」「古町でおすすめ」「長岡でおすすめ」）を定義する
  - TypeScript コンパイルエラーなし（型チェックのみ、テスト不要）
  - _Requirements: 1.1_
  - _Boundary: Frontend Config_

- [x] 4. Integration: Api::OmakaseController とルーティングの実装
  _Depends: 1.1, 2.1_
- [x] 4.1 routes.rb にエンドポイントを追加しルーティングspecを作成する
  - `backend/config/routes.rb` の `namespace :api` 内に `post "omakase", to: "omakase#create"` を追加する
  - `backend/spec/routing/api/omakase_routing_spec.rb` を新規作成し、`POST /api/omakase` が `api/omakase#create` にルーティングされることを検証する
  - `docker compose exec backend bin/rails routes | grep omakase` でルートが出力される
  - `docker compose exec backend bundle exec rspec spec/routing/api/omakase_routing_spec.rb` で通過
  - _Requirements: 5.3_

- [x] 4.2 Api::OmakaseController を実装する
  - `backend/app/controllers/api/omakase_controller.rb` を新規作成する
  - `area` パラメータが非文字列または空文字のとき 422 を返すバリデーションを実装する
  - `OmakaseService.new.call(area_id)` → `GooglePlacesService.new.call(conditions)` → `places.sample(5)` → `RecommendationService.new.call(sampled, query, min_count: 5, max_count: 5)` のパイプラインを実装する
  - `RecommendationService` に渡す `query` は `"#{conditions[:sub_area]}で夜の居酒屋・バーおまかせ"` 形式で生成する
  - `places` が空のとき `RecommendationService` を呼ばず空 recommendations で 200 を返す
  - `build_response` プライベートメソッドで `recommendations` / `other_candidates: []` / `parsed_conditions` / `omakase` を含む Hash を組み立てる
  - `rescue_from OmakaseService::UnknownArea → 422`, `rescue_from GooglePlacesError, RecommendationError → 502`, `rescue_from StandardError → 500` を実装する
  - _Requirements: 2.4, 2.5, 3.3, 4.4, 5.1_

- [x] 4.3 OmakaseController のリクエスト spec を作成する
  - `backend/spec/requests/api/omakase_spec.rb` を新規作成する
  - 4エリア各 ID で 200 OK、レスポンスに `recommendations` / `other_candidates: []` / `parsed_conditions` / `omakase` キーを含むことを検証する
  - `GooglePlacesService` に20件を返すモックを設定し、`RecommendationService` に渡される件数が ≤ 5 であることを検証する
  - `GooglePlacesService` に0件を返すモックを設定し、`recommendations: []` で 200 が返ることを検証する
  - `expect_any_instance_of(QueryParserService).not_to receive(:call)` で QueryParser 非呼び出しを検証する
  - `area` が未知値 → 422、`area` が空・nil → 422、`GooglePlacesError` → 502、`StandardError` → 500 を各々検証する
  - `parsed_conditions.area` が `"新潟市中央区 万代"` 形式（prefix + sub_area）で返ることを検証する
  - `docker compose exec backend bundle exec rspec spec/requests/api/omakase_spec.rb` で全テスト通過
  - _Requirements: 2.4, 2.5, 3.3, 4.4, 5.1, 5.3_

- [x] 5. Integration: fetchOmakase API 関数の実装とテスト（フロントエンド）
  _Depends: 3.1_
- [x] 5.1 (P) fetchOmakase 関数を実装する
  - `frontend/src/api/omakase.ts` を新規作成する
  - `POST /api/omakase` に `{ area: areaId }` を JSON で送信し `OmakaseResponse` を返す async 関数を実装する
  - `response.ok` でない場合は `throw new Error(`HTTP error: ${response.status}`)` を投げる
  - 戻り値の型は `Promise<OmakaseResponse>`（`any` 不使用）
  - _Requirements: 2.1, 2.4_
  - _Boundary: fetchOmakase API Client_

- [x] 5.2 (P) fetchOmakase のテストを作成する
  - `frontend/src/api/omakase.test.ts` を新規作成し `vi.stubGlobal('fetch', ...)` パターンで実装する
  - 200 OK のとき `OmakaseResponse` を resolve することを検証する
  - 正しいエンドポイント・ヘッダー・ボディ（`{ area: 'ekimae' }` 等）でリクエストが送信されることを検証する
  - 422、502、ネットワークエラーで例外を throw することを検証する
  - `docker compose exec frontend pnpm test --run` で通過
  - _Requirements: 2.1, 4.4_
  - _Boundary: fetchOmakase API Client_

- [x] 6. Integration: OmakaseButtons コンポーネントの実装とテスト
  _Depends: 3.2_
- [x] 6.1 (P) OmakaseButtons コンポーネントを実装する
  - `frontend/src/components/OmakaseButtons.tsx` を新規作成する
  - `OmakaseButtonsProps = { areas: readonly OmakaseArea[]; onSelect: (areaId: OmakaseAreaId) => void; isLoading: boolean }` を定義する
  - `areas` をループして各エリアのボタンを生成し、クリック時に `onSelect(area.id)` を呼ぶ
  - `flex flex-wrap gap-2` で横並び折り返し、`min-h-[44px]` でタップ領域確保
  - `isLoading` が true のとき全ボタンに `disabled` を設定する
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3_
  - _Boundary: OmakaseButtons Component_

- [x] 6.2 (P) OmakaseButtons のテストを作成する
  - `frontend/src/components/OmakaseButtons.test.tsx` を新規作成する
  - 4ボタンのラベル（「新潟駅前でおすすめ」等）が正しく描画されることを検証する
  - `isLoading=true` で全ボタンが disabled になることを検証する
  - 各ボタンクリックで `onSelect` が対応する `areaId` で呼ばれることを検証する
  - `isLoading=true` のクリックで `onSelect` が呼ばれないことを検証する
  - `docker compose exec frontend pnpm test --run` で通過
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.3_
  - _Boundary: OmakaseButtons Component_

- [ ] 7. Validation: App.tsx 統合と旧ファイル削除
  _Depends: 4.2, 5.1, 6.1_
- [ ] 7.1 App.tsx に handleOmakase を追加し OmakaseButtons に差し替える
  - `import OmakaseButton from './components/OmakaseButton'` と `import { omakasePresets } from './config/omakasePresets'` を削除し、`OmakaseButtons`・`omakaseAreas`・`fetchOmakase` に差し替える
  - `handleOmakase(areaId: OmakaseAreaId)` を追加する: `setQuery('')`・既存 state リセット・`fetchOmakase(areaId)` 呼び出し・`setRecommendations / setOtherCandidates / setParsedConditions` 更新・catch でエラー設定・finally で `setIsLoading(false)`
  - `addToHistory` を `handleOmakase` 内で呼ばない（検索履歴に追加しない）
  - JSX 内の `<OmakaseButton ...>` を `<OmakaseButtons areas={omakaseAreas} onSelect={handleOmakase} isLoading={isLoading} />` に置き換える
  - `docker compose exec frontend pnpm build` で TypeScript エラーなしにビルド通過
  - _Requirements: 1.4, 3.1, 3.2, 4.1, 4.2, 4.3, 4.4, 5.2_

- [ ] 7.2 旧ファイルを削除し全テストの通過を確認する
  - `frontend/src/components/OmakaseButton.tsx` を削除する
  - `frontend/src/components/OmakaseButton.test.tsx` を削除する
  - `frontend/src/config/omakasePresets.ts` を削除する
  - `frontend/src/App.test.tsx` に旧 `OmakaseButton` への参照が残っていれば更新する
  - `docker compose exec frontend pnpm test --run` で全テスト通過
  - `docker compose exec backend bundle exec rspec` で全テスト通過
  - _Requirements: 1.1, 5.2, 5.3_
