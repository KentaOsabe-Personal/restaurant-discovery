# Requirements Document

## Project Description (Input)
Chunk7の内容を開発します

## Introduction

本機能は、レストラン発見アプリのフロントエンド（React + TypeScript）において、バックエンド `POST /api/search` エンドポイントとの通信を担う **型定義** と **APIクライアント関数** を実装する。

対象ファイルは以下の2点：
- `frontend/src/types/search.ts` — `SearchRequest` / `Recommendation` / `SearchResponse` 型
- `frontend/src/api/search.ts` — `searchPlaces(query: string): Promise<SearchResponse>` 関数

TypeScript strict モードに準拠し、Vitest + fetch モックによるテストで動作を保証する。

---

## Requirements

### Requirement 1: SearchRequest 型定義

**Objective:** フロントエンド開発者として、リクエストの型を定義したい。これにより、APIクライアント関数への引数が型安全に渡せるようになる。

#### Acceptance Criteria
1. The APIクライアントモジュール shall `SearchRequest` 型を `{ query: string }` として export する
2. The APIクライアントモジュール shall TypeScript strict モードでコンパイルエラーが発生しない `SearchRequest` 型を提供する

---

### Requirement 2: Recommendation 型定義

**Objective:** フロントエンド開発者として、1件の推薦店舗の型を定義したい。これにより、コンポーネントが型安全に店舗データを受け取れるようになる。

#### Acceptance Criteria
1. The APIクライアントモジュール shall `Recommendation` 型を以下のフィールドを持つオブジェクト型として export する：`name: string`、`rating: number | null`、`price_level: string | null`、`address: string`、`google_maps_url: string`、`photo_url: string | null`、`opening_hours: { open_now: boolean; weekday_text: string[] } | null`、`reason: string`
2. The `Recommendation` 型 shall `rating`・`price_level`・`photo_url`・`opening_hours` を `null` 許容型として定義し、オプショナルフィールドとして扱わない

---

### Requirement 3: SearchResponse 型定義

**Objective:** フロントエンド開発者として、APIレスポンス全体の型を定義したい。これにより、画面表示コンポーネントが型安全にレスポンスデータを受け取れるようになる。

#### Acceptance Criteria
1. The APIクライアントモジュール shall `SearchResponse` 型を `{ recommendations: Recommendation[]; parsed_conditions: { area: string | null; genre: string | null; price_level: string | null } }` として export する
2. The `SearchResponse` 型 shall `parsed_conditions` の各フィールドを `null` 許容型として定義する

---

### Requirement 4: searchPlaces 関数 — 正常系

**Objective:** フロントエンド開発者として、自然文クエリを送信して推薦店舗リストを取得できる関数が欲しい。これにより、検索フロー全体を組み立てられるようになる。

#### Acceptance Criteria
1. The `searchPlaces` 関数 shall `query: string` を受け取り `Promise<SearchResponse>` を返すシグネチャで export される
2. When `searchPlaces(query)` が呼び出された場合、the `searchPlaces` 関数 shall `POST /api/search` に `Content-Type: application/json` ヘッダと `{ query }` ボディで fetch リクエストを送信する
3. When バックエンドが 200 OK で `SearchResponse` 形式の JSON を返した場合、the `searchPlaces` 関数 shall そのデータをパースして `SearchResponse` 型のオブジェクトとして resolve する

---

### Requirement 5: searchPlaces 関数 — HTTPエラー

**Objective:** フロントエンド開発者として、バックエンドがエラーを返した際に適切に例外を受け取りたい。これにより、呼び出し元がエラー状態をハンドリングできるようになる。

#### Acceptance Criteria
1. If バックエンドが 4xx または 5xx ステータスコードを返した場合、the `searchPlaces` 関数 shall 例外を throw する
2. If バックエンドが 422 Unprocessable Entity を返した場合、the `searchPlaces` 関数 shall 例外を throw し、正常値として resolve しない

---

### Requirement 6: searchPlaces 関数 — ネットワークエラー

**Objective:** フロントエンド開発者として、ネットワーク障害時にも例外として通知を受け取りたい。これにより、呼び出し元が一貫したエラーハンドリングを実装できるようになる。

#### Acceptance Criteria
1. If ネットワーク障害により fetch が失敗した場合、the `searchPlaces` 関数 shall 例外を throw する（resolve しない）
2. The `searchPlaces` 関数 shall ネットワークエラーを握りつぶさず、呼び出し元に伝播させる

---

### Requirement 7: テストカバレッジ

**Objective:** フロントエンド開発者として、APIクライアントの動作が自動テストで保証されている状態にしたい。これにより、将来の変更で回帰バグが検出できるようになる。

#### Acceptance Criteria
1. The テストスイート shall Vitest + fetch モックを使用して `searchPlaces` の正常系・異常系を検証するテストファイルを含む
2. When fetch が 200 OK で `SearchResponse` 形式データを返すようモックされた場合、the テスト shall `searchPlaces` が `SearchResponse` 型のオブジェクトを返すことを検証する
3. When fetch が 422 を返すようモックされた場合、the テスト shall `searchPlaces` が例外を throw することを検証する
4. When fetch がネットワークエラーを throw するようモックされた場合、the テスト shall `searchPlaces` が例外を throw することを検証する
5. The テストスイート shall `docker compose exec frontend pnpm test --run` で全テストがパスする
