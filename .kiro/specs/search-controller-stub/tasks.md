# Implementation Plan

- [x] 1. API 名前空間の基盤構築
  - API 専用の基底コントローラを作成し、API コントローラ群の土台を整備する
  - ルーティングに API 名前空間を追加し、検索エンドポイントへの POST リクエストを受付可能にする
  - POST 以外の HTTP メソッドでのアクセスは Rails のデフォルト動作でルーティングエラーとする
  - _Requirements: 3.1, 3.2_

- [x] 2. 検索エンドポイントのスタブ実装
  - 正常な検索クエリを受け付けたとき、固定の JSON スタブレスポンス（空の recommendations 配列と null の parsed_conditions）を 200 で返す
  - `query` パラメータが存在しない・空文字・文字列以外の場合に 422 とエラー内容を含む JSON を返すバリデーションを実装する
  - レスポンスの Content-Type が `application/json` であることを保証する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

- [x] 3. テストの実装
- [x] 3.1 (P) 検索エンドポイントの Request Spec を作成する
  - 正常な `query` を含むリクエストで 200 OK とスタブ JSON 構造が返ることを検証する
  - `query` 欠如・空文字・文字列以外のリクエストで 422 とエラー JSON が返ることを検証する
  - レスポンスの Content-Type が `application/json` であることを検証する
  - _Requirements: 1.1, 1.2, 1.3, 2.1, 2.2, 2.3, 2.4_

- [x] 3.2 (P) ルーティングの Routing Spec を作成する
  - `POST /api/search` が正しいコントローラアクションにルーティングされることを検証する
  - GET / PUT / DELETE でのアクセスがルーティングエラーとなることを検証する
  - _Requirements: 3.1, 3.2_
