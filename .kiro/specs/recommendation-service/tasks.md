# Implementation Plan

- [x] 1. RecommendationError クラスの作成
  - `StandardError` を継承する専用例外クラスを新規ファイルとして作成する
  - _Requirements: 5.7_

- [x] 2. RecommendationService の実装
- [x] 2.1 定数と骨格の定義
  - `MODEL`、`API_KEY_PATH`、`SYSTEM_PROMPT`（ヒアドキュメント）、`RESPONSE_SCHEMA`（JSON Schema）の 4 定数をクラスレベルで定義する
  - `SYSTEM_PROMPT` にはクエリ・評価・価格帯を考慮した日本語推薦理由の生成指示と「name を変更しないこと」の制約を含める
  - `RESPONSE_SCHEMA` は `{ recommendations: [{ name, reason }] }` 形式の Structured Outputs スキーマとし、`strict: true` と `additionalProperties: false` を設定する
  - ファイルを `app/services/recommendation_service.rb` に配置する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 6.3_

- [x] 2.2 call メソッドのコア実装
  - `call(places, query)` を公開メソッドとして定義し、`places` が空の場合は OpenAI API を呼び出さずに空配列を即座に返す
  - `/openai_apikey` ファイルから API キーを読み取り OpenAI クライアントを構築する
  - `places` の各要素から `name`、`rating`、`price_level`、`address` の 4 フィールドのみを抽出してユーザーメッセージに含める（`google_maps_url` は送信しない）
  - `gpt-5-nano` モデルと `RESPONSE_SCHEMA` を指定して OpenAI Structured Outputs API を呼び出す
  - AI 応答の `recommendations` 配列から各 `name` を使って元の `places` 配列を検索し、一致した店舗に `reason` フィールドを付加して返す（名前不一致はスキップ）
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 4.1, 4.2, 6.1, 6.2_

- [x] 2.3 エラーハンドリングの実装
  - `call` メソッドに rescue チェーンを追加し、`Faraday::ClientError`（4xx）・`Faraday::ServerError`（5xx）・`Faraday::ConnectionFailed` / `Faraday::TimeoutError`（接続・タイムアウト）・`JSON::ParserError`（不正 JSON）・`Errno::ENOENT`（API キーファイル不在）のそれぞれを `RecommendationError` に変換して raise する
  - 各 rescue ブロックで `Rails.logger.error` にエラークラスとメッセージを記録する
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7_

- [x] 3. テストの実装
- [x] 3.1 (P) RecommendationError のテスト作成
  - `RecommendationError` が `StandardError` を継承していることを確認するテストを `spec/services/recommendation_error_spec.rb` に作成する
  - _Requirements: 5.7_

- [x] 3.2 (P) サービスの正常系・境界値テスト
  - `spec/services/recommendation_service_spec.rb` を作成し、`allow(File).to receive(:read)` と WebMock で OpenAI API をスタブする共通ヘルパーを定義する
  - 候補 10 件＋クエリを渡したとき 3〜5 件が返り各要素に `reason` フィールドが付加されることを検証する
  - AI が推薦した名前の一部が `places` に存在しない場合、一致した件数分だけ返されることを検証する
  - 候補 0 件のとき OpenAI API が呼び出されず空配列が返ることを検証する
  - 候補 2 件のとき全件返却されることを検証する
  - _Requirements: 1.1, 1.2, 1.3, 4.1, 4.2, 6.1, 6.2_

- [x] 3.3 サービスのエラー系・リクエスト検証テスト
  - 4xx・5xx・タイムアウト・不正 JSON・API キーファイル不在のそれぞれのケースで `RecommendationError` が raise されることを検証する（3.2 の共通ヘルパーを利用）
  - リクエストボディに `gpt-5-nano` モデル、正しい `response_format`（`name: "recommendations"`, `strict: true`）、`query` と candidates が含まれること、および `Authorization` ヘッダーが正しいことを検証する
  - _Requirements: 2.1, 2.2, 3.1, 3.2, 3.3, 3.4, 5.1, 5.2, 5.3, 5.4, 5.5_
