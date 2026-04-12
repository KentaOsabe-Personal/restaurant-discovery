# Implementation Plan

- [x] 1. RecommendationService の改修
- [x] 1.1 前処理フィルタリング（prefilter）の追加
  - `call` 内で AI 呼び出し前に `prefilter(places, min_count)` を適用する
  - `prefilter` は rating 3.5 以上の候補を選択し、件数が min_count 未満の場合は全件にフォールバックする
  - `places.empty?` の既存チェックは維持し、フィルタは空チェックの後に行う
  - `prefilter` 後の候補リストが `build_user_message` に渡されること（ログまたはテストで確認可能）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 1.2 parsed_conditions の引き渡し対応
  - `call` のシグネチャに `parsed_conditions: nil` キーワード引数を追加する
  - `build_user_message` に `parsed_conditions` を渡し、非 nil の場合はペイロードの `:conditions` キーに追加する
  - `parsed_conditions` が nil のとき従来と同じ `{query:, candidates:}` ペイロードが生成されること
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 1.3 SYSTEM_PROMPT_TEMPLATE の詳細化
  - 選定基準（条件一致度最優先・rating 閾値 4.0/3.5・価格帯一致）、除外基準、推薦理由の品質基準（他候補との比較・条件合致点）を含む詳細版プロンプトに差し替える
  - `%<min>d` / `%<max>d` プレースホルダーは維持する
  - 設計書に定義された3セクション（選定基準・除外基準・出力規則）が定数に反映されること
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. コントローラーの呼び出し更新
- [x] 2.1 (P) SearchController の更新
  - `RecommendationService.new.call` の呼び出しに `parsed_conditions: parsed_conditions` を追加する
  - `parsed_conditions` は既存の `QueryParserService.new.call(query)` の結果をそのまま使用する（新規呼び出し不要）
  - 検索フローが引き続き正常に動作すること（既存の RSpec テストがパスすること）
  - _Requirements: 1.3_
  - _Boundary: SearchController_
  - _Depends: 1.2_

- [x] 2.2 (P) OmakaseController の更新
  - `conditions[:sub_area]` を使って `parsed_conditions` を手動生成する（`{ area: conditions[:sub_area], genre: "居酒屋・バー", price_level: nil, keyword: nil }`）
  - `RecommendationService.new.call` の呼び出しに `parsed_conditions:` を追加する
  - おまかせフローが引き続き正常に動作すること（既存の RSpec テストがパスすること）
  - _Requirements: 1.4_
  - _Boundary: OmakaseController_
  - _Depends: 1.2_

- [x] 3. テストの追加
- [x] 3.1 prefilter のテスト追加
  - rating 3.5 以上の候補が min_count 以上あるとき、rating < 3.5 の候補が OpenAI リクエストに含まれないことを WebMock で検証する
  - フィルタ後の件数が min_count 未満のとき、全候補が AI に送信されることを検証する
  - rating が正確に 3.5 の候補が除外されないこと（`>=` の境界値確認）
  - 既存の `build_place` ヘルパーと WebMock スタブを活用する
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3.2 parsed_conditions のペイロード検証テスト追加
  - `parsed_conditions` を渡したとき OpenAI リクエストボディに `:conditions` キーが含まれることを WebMock で検証する
  - `parsed_conditions` を渡さないとき（または nil のとき）`:conditions` キーが含まれないことを検証する（後方互換の確認）
  - `bundle exec rspec spec/services/recommendation_service_spec.rb` で全テストがパスすること
  - _Requirements: 1.1, 1.2, 1.5_
