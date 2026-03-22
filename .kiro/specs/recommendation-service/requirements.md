# Requirements Document

## Introduction

RecommendationServiceは、GooglePlacesServiceが返す候補店リストとユーザーの元の自然文クエリをOpenAI APIに渡し、3〜5件の厳選されたおすすめ店舗とその推薦理由を返すバックエンドサービスである。SearchController統合（Chunk 6）において、GooglePlacesServiceの後段・最終レスポンス生成の前段として動作する。

## Requirements

### Requirement 1: 推薦店舗の厳選

**Objective:** As a SearchController, I want RecommendationServiceが候補店リストからユーザーのクエリに最適な3〜5件を選んでほしい, so that 検索意図に合致した店舗だけを提案できる

#### Acceptance Criteria
1. When 候補店リスト（1件以上）と自然文クエリが渡された場合, the RecommendationService shall OpenAI APIを呼び出して3〜5件の店舗を厳選し、ハッシュの配列として返す
2. When 候補店が3件未満の場合, the RecommendationService shall 存在するすべての件数を返す（3件未満でも例外をraiseせず正常終了する）
3. The RecommendationService shall 厳選した各店舗を `name`、`rating`、`price_level`、`address`、`google_maps_url`、`reason` キーを持つハッシュとして返す

### Requirement 2: 推薦理由の生成

**Objective:** As a ユーザー, I want 各おすすめ店舗に日本語のおすすめ理由がついてほしい, so that なぜその店が選ばれたかを理解して選択の判断ができる

#### Acceptance Criteria
1. The RecommendationService shall 厳選した各店舗に対して `reason` フィールドに日本語のおすすめ理由を生成して設定する
2. The RecommendationService shall 元の自然文クエリとの関連性・評価・価格帯を考慮した推薦理由を生成する

### Requirement 3: OpenAI API 呼び出し（Structured Outputs）

**Objective:** As a 開発者, I want OpenAI APIをStructured Outputsで呼び出して安定した構造のレスポンスを得たい, so that パースエラーなく厳選結果を確実に取得できる

#### Acceptance Criteria
1. The RecommendationService shall OpenAI APIをJSON Schemaモード（Structured Outputs）で呼び出し、レスポンスの構造を保証する
2. The RecommendationService shall OpenAI APIのモデルとして `gpt-5-nano` を使用する
3. The RecommendationService shall 候補店リスト全件の情報（名前・評価・価格帯・住所）と元の自然文クエリをプロンプトに含める
4. The RecommendationService shall OpenAI APIキーをファイルパス `/openai_apikey` から読み取る

### Requirement 4: 候補店が0件の場合の処理

**Objective:** As a SearchController, I want 候補店が0件のときにも正常なレスポンスを受け取りたい, so that 後続処理でエラーにならず空の推薦結果として扱える

#### Acceptance Criteria
1. When 候補店リストが空配列で渡された場合, the RecommendationService shall OpenAI APIを呼び出さずに空配列を返す
2. While 候補店リストが空の場合, the RecommendationService shall 例外をraiseせず正常に処理を完了する

### Requirement 5: エラーハンドリング

**Objective:** As a SearchController, I want 外部API呼び出しの失敗を適切にハンドリングしてほしい, so that エラーの原因を特定しやすく、適切なHTTPステータスコードを返せる

#### Acceptance Criteria
1. If OpenAI APIが4xxステータスコードを返した場合, the RecommendationService shall エラーメッセージを含む例外をraiseする
2. If OpenAI APIが5xxステータスコードを返した場合, the RecommendationService shall エラーメッセージを含む例外をraiseする
3. If OpenAI APIへの接続がタイムアウトした場合, the RecommendationService shall エラーメッセージを含む例外をraiseする
4. If OpenAI APIのレスポンスが期待するJSON Schemaに適合しない場合, the RecommendationService shall エラーメッセージを含む例外をraiseする
5. If APIキーファイルが存在しない場合, the RecommendationService shall 適切なエラーメッセージとともに例外をraiseする
6. While エラーが発生した場合, the RecommendationService shall エラー詳細を `Rails.logger.error` に記録する
7. The RecommendationService shall 専用のエラークラス（RecommendationError）を使用して例外をraiseする

### Requirement 6: 入出力インターフェース

**Objective:** As a 開発者, I want サービスの入出力インターフェースが明確に定義されていることを保証したい, so that SearchControllerとの連携がスムーズに行える

#### Acceptance Criteria
1. The RecommendationService shall 入力として候補店ハッシュの配列（`places`）と元の自然文文字列（`query`）の2引数を受け取る
2. The RecommendationService shall 出力として `name`（String）、`rating`（Float or nil）、`price_level`（String or nil）、`address`（String）、`google_maps_url`（String）、`reason`（String）の6キーを持つハッシュの配列を返す
3. The RecommendationService shall `app/services/recommendation_service.rb` に配置される
