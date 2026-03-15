# Requirements Document

## Introduction
`POST /api/search` エンドポイントのスタブ実装。サービス層（QueryParserService, GooglePlacesService, RecommendationService）は呼び出さず、固定レスポンスを返す。後続の Chunk 3〜6 でサービス層を統合する際の土台となるエンドポイントを構築する。

## Requirements

### Requirement 1: 検索エンドポイント（正常系）
**Objective:** ユーザーとして、自然文で検索クエリを送信できるようにしたい。後続のサービス統合に備えた API インターフェースを確立するため。

#### Acceptance Criteria
1. When `POST /api/search` に `query` パラメータを含むJSONリクエストが送信された場合, the SearchController shall HTTPステータス 200 を返す
2. When 正常なリクエストを受信した場合, the SearchController shall 以下の構造を持つ固定JSONレスポンスを返す: `{ "recommendations": [], "parsed_conditions": { "area": null, "genre": null, "price_level": null } }`
3. The SearchController shall レスポンスの Content-Type を `application/json` とする

### Requirement 2: バリデーション（異常系）
**Objective:** ユーザーとして、不正なリクエストに対して適切なエラーレスポンスを受け取りたい。クライアント側で問題を特定しやすくするため。

#### Acceptance Criteria
1. When `query` パラメータが空文字で送信された場合, the SearchController shall HTTPステータス 422 (Unprocessable Entity) を返す
2. When `query` パラメータが存在しないリクエストが送信された場合, the SearchController shall HTTPステータス 422 (Unprocessable Entity) を返す
3. When `query` パラメータが文字列以外の型で送信された場合, the SearchController shall HTTPステータス 422 (Unprocessable Entity) を返す
4. If バリデーションエラーが発生した場合, the SearchController shall エラー内容を示すJSONレスポンスを返す

### Requirement 3: ルーティング
**Objective:** 開発者として、API のルーティングが適切に設定されていることを確認したい。フロントエンドからの接続性を保証するため。

#### Acceptance Criteria
1. The Rails Router shall `POST /api/search` を `Api::SearchController#create` にルーティングする
2. When `POST /api/search` 以外のHTTPメソッド（GET, PUT, DELETE）でアクセスされた場合, the Rails Router shall 適切なエラーレスポンスを返す
