# Requirements Document

## Introduction

QueryParserService は、ユーザーが入力した自然文（例:「渋谷で安くてうまいイタリアン」）を OpenAI API を用いて解析し、エリア・ジャンル・予算・キーワードの構造化された検索条件に変換するバックエンドサービスである。本サービスは Google Places API による店舗検索の前段処理として機能し、自然文検索フローの中核を担う。

## Requirements

### Requirement 1: 自然文の構造化解析

**Objective:** 開発者として、自然文を構造化された検索条件に変換する機能が欲しい。これにより、後続の Google Places API 検索で正確な店舗候補を取得できる。

#### Acceptance Criteria
1. When 自然文が渡された場合, the QueryParserService shall OpenAI API を JSON Schema モードで呼び出し、以下のフィールドを持つハッシュを返す: `area`（エリア）, `genre`（ジャンル）, `price_level`（価格帯）, `keyword`（キーワード）
2. When 自然文にエリア・ジャンル・価格帯・キーワードがすべて含まれる場合, the QueryParserService shall 各フィールドを正しく抽出した構造化データを返す
3. When 自然文に一部の条件のみ含まれる場合（例: エリアのみ）, the QueryParserService shall 読み取れないフィールドを `nil` として返す
4. When 空文字列が渡された場合, the QueryParserService shall 全フィールドが `nil` の構造化データを返す

### Requirement 2: 価格帯の正規化

**Objective:** 開発者として、自然文中の価格に関する表現を Google Places API の価格帯列挙値に正規化したい。これにより、後続の検索パラメータとして直接利用できる。

#### Acceptance Criteria
1. The QueryParserService shall `price_level` を以下の列挙値のいずれかとして返す: `PRICE_LEVEL_FREE`, `PRICE_LEVEL_INEXPENSIVE`, `PRICE_LEVEL_MODERATE`, `PRICE_LEVEL_EXPENSIVE`, `PRICE_LEVEL_VERY_EXPENSIVE`
2. When 自然文に価格に関する表現が含まれない場合, the QueryParserService shall `price_level` を `nil` として返す

### Requirement 3: OpenAI API 呼び出し

**Objective:** 開発者として、OpenAI API への呼び出しが適切に行われることを保証したい。これにより、安定した解析結果を得られる。

#### Acceptance Criteria
1. The QueryParserService shall OpenAI API を JSON Schema モード（Structured Outputs）で呼び出し、レスポンスの構造を保証する
2. The QueryParserService shall OpenAI API のモデルとして `gpt-5-nano` を使用する
3. The QueryParserService shall OpenAI API キーをファイル（`/openai_apikey`）から読み取る

### Requirement 4: エラーハンドリング

**Objective:** 開発者として、OpenAI API のエラーが適切に伝播されることを保証したい。これにより、呼び出し元（SearchController）が適切な HTTP ステータスを返せる。

#### Acceptance Criteria
1. If OpenAI API がエラーレスポンス（4xx/5xx）を返した場合, the QueryParserService shall 例外を raise する
2. If OpenAI API への接続がタイムアウトした場合, the QueryParserService shall 例外を raise する
3. If OpenAI API のレスポンスが期待する JSON Schema に適合しない場合, the QueryParserService shall 例外を raise する

### Requirement 5: 入出力インターフェース

**Objective:** 開発者として、サービスの入出力インターフェースが明確に定義されていることを保証したい。これにより、他のサービスとの連携がスムーズに行える。

#### Acceptance Criteria
1. The QueryParserService shall 入力として単一の文字列（自然文）を受け取る
2. The QueryParserService shall 出力として以下のキーを持つハッシュを返す: `area`（String or nil）, `genre`（String or nil）, `price_level`（String or nil）, `keyword`（String or nil）
3. The QueryParserService shall `app/services/query_parser_service.rb` に配置される
