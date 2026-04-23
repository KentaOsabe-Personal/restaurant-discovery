# Implementation Plan

- [x] 1. (P) GooglePlacesService クエリ合成ロジック実装
  - `RAMEN_FLAVOR_MODIFIERS = %w[塩 醤油 味噌 豚骨 鶏白湯 鶏清湯 あっさり こってり 辛].freeze` をクラス定数として追加する
  - `RAMEN_STANDALONE_TYPES = %w[まぜそば つけ麺 担々麺 油そば].freeze` をクラス定数として追加する
  - `build_text_query` に `conditions[:genre] == "ラーメン"` を gate とした条件分岐を実装する
  - 味修飾語の場合は `[area, "#{keyword}ラーメン"].compact.join(" ")` で合成する
  - 独立種類語の場合は `[area, keyword].compact.join(" ")` で genre を省略する
  - 上記以外（未知キーワード・非ラーメンジャンル）は `[area, genre, keyword].compact.join(" ")` の既存動作を維持する
  - 実装後、"塩" × "ラーメン" → `"新潟市中央区 塩ラーメン"`、"まぜそば" × "ラーメン" → `"新潟市中央区 まぜそば"` のクエリが生成されること
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Boundary: GooglePlacesService_

- [x] 2. (P) RAMEN_SYSTEM_PROMPT_TEMPLATE 更新
  - 選定基準を以下の通り変更する: 優先1位を「keyword で指定された味/種類を看板メニューまたは主力商品としている可能性が高い店を優先、店名・特徴から明らかに異なる場合は除外」に変更し、rating・price_level 基準はそのまま維持する
  - 除外基準に「keyword で指定された味/種類を提供していないことが店名・情報から明らかな場合は除外（例: 塩ラーメン検索でまぜそば専門店）」「条件合致度が高い候補がある場合は不確かな候補より優先すること」を追記する
  - 出力規則の reason を「指定された味/種類が看板メニューである根拠（店名・既知の評判など）を含める。根拠が不明な場合はその旨を明記した上で推薦する」に変更する
  - `%<min>d` / `%<max>d` フォーマット変数・フィードバック付加ロジックは変更しないこと
  - 更新後の `RAMEN_SYSTEM_PROMPT_TEMPLATE` が: 味/種類合致度を最優先選定基準として含み、除外基準に味/種類不一致ルールを含み、reason に根拠記載要求を含むこと
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Boundary: RecommendationService_

- [x] 3. テストによる検証
- [x] 3.1 (P) GooglePlacesService クエリ合成テスト追加
  - 既存の `spec/services/google_places_service_spec.rb` に `build_text_query` の新テストケースを追加する
  - 各定数のうち代表的な値を使用して以下を検証する: 味修飾語 × "ラーメン" → `"[area] [keyword]ラーメン"` の形式であること、独立種類語 × "ラーメン" → `"[area] [keyword]"` の形式（ジャンルなし）であること
  - 未知キーワード × "ラーメン" および keyword nil の場合は既存 compact join と同一結果であること
  - 居酒屋ジャンルに味修飾語を組み合わせた場合は既存動作（compact join）が維持されること
  - `bundle exec rspec spec/services/google_places_service_spec.rb` が全パスすること
  - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - _Boundary: GooglePlacesService_

- [x] 3.2 (P) RecommendationService プロンプト更新テスト追加
  - 既存の `spec/services/recommendation_service_spec.rb` に `RAMEN_SYSTEM_PROMPT_TEMPLATE` の構造検証テストを追加する
  - 更新後のプロンプトが選定基準として「味/種類合致度の優先化」を含む段落を持つこと（Task 2 で追加した選定基準1位の内容が存在すること）
  - 更新後のプロンプトが除外基準として「味/種類不一致の除外ルール」の段落を含むこと（Task 2 で追加した除外基準の追記内容が存在すること）
  - 更新後のプロンプトが出力規則として「根拠記載・不明時の明記」の指示を含むこと
  - rating 3.5 閾値・価格帯除外基準の記述が維持されていること
  - `bundle exec rspec spec/services/recommendation_service_spec.rb` が全パスすること
  - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - _Boundary: RecommendationService_

- [x] 4. LLMプロンプトのログ出力
  - `RecommendationService#call` 内で `build_prompt` が返したシステムプロンプトを `Rails.logger.debug` で出力する
  - ログにはモード（ramen / izakaya）とプロンプト全文を含める（例: `[RecommendationService] mode=ramen\n#{prompt}`）
  - `docker compose logs backend` でラーメン検索を実行したとき、送信するシステムプロンプト全文がログに出力されること
  - _Boundary: RecommendationService_
