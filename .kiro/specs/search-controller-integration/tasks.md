# Implementation Plan

- [ ] 1. SearchController にエラーハンドリング基盤を追加する
- [ ] 1.1 (P) サービス固有エラーを 502 に変換する `rescue_from` を定義する
  - QueryParserError・GooglePlacesError・RecommendationError の 3 クラスを一括で 502 にマッピングする
  - エラーレスポンスは `{ error: exception.message }` の JSON 形式で返す
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 1.2 (P) 予期しない例外を 500 に変換する `rescue_from` を定義する
  - StandardError を捕捉し 500 を返す
  - `Rails.logger.error` でクラス名とメッセージをログに出力する
  - エラーレスポンスは `{ error: "内部エラーが発生しました" }` の固定文言で返す
  - _Requirements: 4.4, 4.5_

- [ ] 2. `create` アクションにエンドツーエンドの検索フローを実装する
- [ ] 2.1 QueryParserService を呼び出して自然文を構造化条件に変換する
  - 既存のバリデーション（空文字・型チェック）を維持したまま、その後に QueryParserService を呼び出す
  - 戻り値の構造化条件（area / genre / price_level / keyword）を後続処理に引き渡す
  - _Requirements: 1.1, 1.5_

- [ ] 2.2 GooglePlacesService を呼び出して候補店リストを取得し、空の場合は早期リターンする
  - 構造化条件を GooglePlacesService に渡して候補店の配列を取得する
  - 候補が空配列の場合は `recommendations: []` と `parsed_conditions`（area / genre / price_level）を含む 200 レスポンスを返して処理を終了する
  - _Requirements: 1.2, 2.1, 5.4_

- [ ] 2.3 RecommendationService を呼び出してレスポンスを組み立てる
  - 候補店リストと元の自然文クエリを RecommendationService に渡す
  - 返された推薦リストと `parsed_conditions`（QueryParserService 戻り値から area / genre / price_level の 3 フィールドのみを抽出し keyword を除外）をまとめて 200 レスポンスとして返す
  - _Requirements: 1.3, 1.4, 5.1, 5.2, 5.3, 5.4_

- [ ] 3. request spec を統合フロー向けに更新する
- [ ] 3.1 (P) 正常系テストを 3 サービスモック付きで実装する
  - QueryParserService・GooglePlacesService・RecommendationService をモックし、200 + 正しい JSON 構造が返ることを確認する
  - `parsed_conditions` に `area` / `genre` / `price_level` が含まれ `keyword` が含まれないことを検証する
  - 既存のスタブ正常系テスト（固定の空レスポンスを期待するもの）は削除する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 5.1, 5.2, 5.3, 5.4_

- [ ] 3.2 (P) 候補 0 件・エラー系テストを実装する
  - GooglePlacesService が空配列を返す場合、RecommendationService が呼ばれず 200 + `recommendations: []` が返ることを確認する
  - QueryParserError・GooglePlacesError・RecommendationError をそれぞれ raise した場合に 502 が返ることを確認する
  - StandardError サブクラスを raise した場合に 500 が返ることを確認する
  - バリデーション異常系（query なし / 空文字 / 非文字列 → 422）は既存テストを維持する
  - _Requirements: 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 4.3, 4.4_
