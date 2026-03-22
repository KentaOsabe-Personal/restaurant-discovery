# Implementation Plan

- [x] 1. (P) 型定義モジュールの実装
  - `src/types/search.ts` を新規作成し、バックエンドとの通信契約を TypeScript 型として定義する
  - `SearchRequest`（クエリ文字列を持つリクエスト型）を export する
  - `Recommendation`（店舗名・評価・価格帯・住所・Google Maps URL・写真・営業時間・推薦理由のフィールドを持つ型）を export する。省略可能なフィールドは `| null` で表現し、オプショナル記法（`?`）は使用しない
  - `SearchResponse`（推薦リストと解析済み条件を持つレスポンス型）を export する。`parsed_conditions` の各フィールドも `| null` で表現する
  - TypeScript strict モードでコンパイルエラーがないことを確認する
  - _Requirements: 1.1, 1.2, 2.1, 2.2, 3.1, 3.2_

- [ ] 2. (P) Vite dev server プロキシの設定
  - `vite.config.ts` の `server` セクションに `proxy` 設定を追加し、`/api` へのリクエストをバックエンドコンテナ（`http://backend:3000`）へフォワードする
  - `changeOrigin: true` を設定してホストヘッダーを書き換える
  - この設定により、フロントエンドから `/api/search` の相対パスでバックエンドにアクセスできるようになることを確認する（Docker Compose 起動時）

- [ ] 3. APIクライアント関数の実装
- [ ] 3.1 正常系の fetch 通信実装
  - `src/api/search.ts` を新規作成し、`searchPlaces(query)` 関数を実装する
  - `POST /api/search` に対して `Content-Type: application/json` ヘッダと `{ query }` ボディを付けた fetch リクエストを送信する
  - バックエンドが成功を返した場合、レスポンスの JSON を検索結果オブジェクトとしてパースして返す
  - 関数は型定義モジュール（Task 1）に依存する
  - _Requirements: 4.1, 4.2, 4.3_

- [ ] 3.2 エラーハンドリングの実装
  - `response.ok` が `false` の場合（4xx / 5xx を含む 422 も対象）、例外を throw するロジックを追加する
  - fetch 自体が throw する（ネットワーク障害・タイムアウト等）場合は例外を握りつぶさず呼び出し元に伝播させる
  - エラーは `try/catch` でラップせず、自然に伝播する設計とする
  - _Requirements: 5.1, 5.2, 6.1, 6.2_

- [ ] 4. fetch モックによるテストの実装
- [ ] 4.1 正常系テスト
  - `src/api/search.test.ts` を新規作成し、Vitest の `vi.stubGlobal` を使って `fetch` をモックする
  - fetch が 200 OK で `SearchResponse` 形式の JSON を返すようにモックし、`searchPlaces` が同じオブジェクトを resolve することを検証する
  - テスト後に `vi.restoreAllMocks()` でモックをリセットし、テスト間の副作用を排除する
  - _Requirements: 7.1, 7.2_

- [ ] 4.2 422 エラーテスト
  - fetch が 422 Unprocessable Entity を返すようにモックする
  - `searchPlaces` が正常値として resolve せず、例外を throw することを `rejects.toThrow()` で検証する
  - _Requirements: 7.1, 7.3_

- [ ] 4.3 ネットワークエラーテスト
  - fetch 自体が `TypeError: Failed to fetch` を throw するようにモックする
  - `searchPlaces` が例外を throw することを検証する
  - `docker compose exec frontend pnpm test --run` で全テストがパスすることを確認する
  - _Requirements: 7.1, 7.4, 7.5_
