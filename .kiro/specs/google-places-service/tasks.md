# 実装計画

- [ ] 1. 前提条件の準備
- [ ] 1.1 (P) `GooglePlacesError` 例外クラスの定義
  - `StandardError` を継承した専用例外クラスを作成する
  - 既存の `QueryParserError` と同じパターンで実装する
  - _Requirements: 6.5_

- [ ] 1.2 (P) Docker Compose へのAPIキーファイルマウントの追加
  - `docker-compose.yml` の backend サービスに `./google_places_apikey:/google_places_apikey:ro` ボリュームマウントを追加する
  - _Requirements: 5.1_

- [ ] 2. `GooglePlacesService` の実装
- [ ] 2.1 サービスクラスの基盤構築（定数定義・APIキー読み取り・Faraday 接続設定）
  - Task 1.1 の `GooglePlacesError` が実装済みであることが前提
  - APIエンドポイント、APIキーファイルパス、フィールドマスク、最大取得件数、有効価格帯リスト（`PRICE_LEVEL_FREE` を除外）の定数を定義する
  - `/google_places_apikey` ファイルからAPIキーを読み取り、Faraday コネクションの `X-Goog-Api-Key`、`X-Goog-FieldMask`、`Content-Type` ヘッダーに設定する
  - `Faraday::Response::RaiseError` ミドルウェアを設定し、4xx/5xx レスポンスで例外が発生するようにする
  - _Requirements: 2.1, 5.1, 5.2_

- [ ] 2.2 テキスト検索クエリとリクエストボディの構築
  - `area`、`genre`、`keyword` の nil 以外の値をスペース区切りで結合してテキストクエリを構築する
  - `price_level` が有効価格帯（`PRICE_LEVEL_FREE` を除く非 nil 値）の場合のみ `priceLevels` パラメータをリクエストボディに含める
  - リクエストボディに `languageCode: "ja"` と `pageSize: 20` を設定する
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.2_

- [ ] 2.3 Google Places API レスポンスの整形
  - `places` キーが存在しないまたは空の場合は空配列を返す
  - 各 place を `name`、`rating`、`price_level`、`address`、`google_maps_url` キーを持つハッシュに変換する（`displayName.text` を `name` にマッピング）
  - `rating` と `priceLevel` が欠落している場合は `nil` を設定する
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.2_

- [ ] 2.4 `call()` エントリポイントとエラーハンドリングの統合
  - `call(conditions)` で接続構築・リクエスト送信（`POST https://places.googleapis.com/v1/places:searchText`）・レスポンス整形を順に実行する
  - `Faraday::ClientError`、`Faraday::ServerError`、`Faraday::ConnectionFailed`、`Faraday::TimeoutError`、`JSON::ParserError`、`Errno::ENOENT` を捕捉し `GooglePlacesError` に変換する
  - エラー発生時は `Rails.logger.error` にエラー種別とメッセージを記録する
  - _Requirements: 1.4, 5.3, 6.1, 6.2, 6.3, 6.4, 6.5_

- [ ] 3. RSpec テストの実装
- [ ] 3.1 正常系・クエリ構築テスト
  - WebMock で `POST https://places.googleapis.com/v1/places:searchText` をスタブし、`File.read` をモックする
  - 全フィールドあり（area、genre、price_level、keyword）の正常系で整形済み店舗配列が返ることを検証する
  - nil フィールドがテキストクエリから除外され、`PRICE_LEVEL_FREE` が `priceLevels` から除外されることを検証する
  - リクエストヘッダー（`X-Goog-FieldMask`、`X-Goog-Api-Key`）と `languageCode`、`pageSize` が正しく設定されることを検証する
  - `rating`/`priceLevel` 欠落時に `nil` が設定されることを検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.5, 2.1, 2.2, 3.1, 3.2, 3.3_

- [ ] 3.2 0件・エラーハンドリングテスト
  - API レスポンスが空オブジェクト（`{}`）の場合に空配列が返ることを検証する
  - 4xx/5xx エラーレスポンスで `GooglePlacesError` が raise されることを検証する
  - タイムアウト（`stub_request.to_timeout`）で `GooglePlacesError` が raise されることを検証する
  - APIキーファイル不在（`Errno::ENOENT`）で `GooglePlacesError` が raise されることを検証する
  - _Requirements: 4.1, 4.2, 5.3, 6.1, 6.2, 6.3_
