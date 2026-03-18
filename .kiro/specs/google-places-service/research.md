# Research & Design Decisions: google-places-service

## Summary
- **Feature**: `google-places-service`
- **Discovery Scope**: New Feature（外部API統合）
- **Key Findings**:
  - Google Places API (New) Text Search のリクエストパラメータは `pageSize`（要件定義の `maxResultCount` とは異なる）
  - `PRICE_LEVEL_FREE` はリクエストの `priceLevels` フィルタに使用不可（レスポンスのみ）
  - Faraday 2.14.1 が ruby-openai の依存として利用可能。追加gem不要

## Research Log

### Google Places API (New) Text Search エンドポイント仕様
- **Context**: 要件 1, 2 の実装に必要な正確なAPI仕様の確認
- **Sources Consulted**: [Text Search (New) 公式ドキュメント](https://developers.google.com/maps/documentation/places/web-service/text-search)
- **Findings**:
  - エンドポイント: `POST https://places.googleapis.com/v1/places:searchText`
  - 必須ヘッダー:
    - `Content-Type: application/json`
    - `X-Goog-Api-Key: <API_KEY>`
    - `X-Goog-FieldMask: <comma-separated fields>`（スペース不可）
  - リクエストボディ主要パラメータ:
    - `textQuery` (string, 必須): 検索テキスト
    - `priceLevels` (array of string, 任意): 価格帯フィルタ
    - `languageCode` (string, 任意): 言語コード。デフォルト `en`
    - `pageSize` (integer 1-20, 任意): 1ページあたりの結果数。デフォルト 20
  - レスポンス構造:
    ```json
    {
      "places": [
        {
          "displayName": { "text": "店舗名", "languageCode": "ja" },
          "rating": 4.2,
          "priceLevel": "PRICE_LEVEL_MODERATE",
          "formattedAddress": "東京都渋谷区...",
          "googleMapsUri": "https://maps.google.com/..."
        }
      ]
    }
    ```
  - 最大60件（ページネーション含む）、1ページあたり最大20件
- **Implications**:
  - 要件定義の `maxResultCount` は `pageSize` に読み替える
  - `displayName` はネストされたオブジェクト（`.text` でアクセス）
  - `priceLevels` はリクエストフィルタなので `textQuery` に含めず分離する

### priceLevels パラメータの制約
- **Context**: QueryParserService が `PRICE_LEVEL_FREE` を出力する可能性がある
- **Sources Consulted**: [Text Search (New) 公式ドキュメント](https://developers.google.com/maps/documentation/places/web-service/text-search)
- **Findings**:
  - `PRICE_LEVEL_FREE` はリクエストの `priceLevels` フィルタに使用不可
  - リクエストで有効な値: `PRICE_LEVEL_INEXPENSIVE`, `PRICE_LEVEL_MODERATE`, `PRICE_LEVEL_EXPENSIVE`, `PRICE_LEVEL_VERY_EXPENSIVE`
  - レスポンスの `priceLevel` フィールドには `PRICE_LEVEL_FREE` が含まれる可能性あり
- **Implications**:
  - GooglePlacesService は入力の `price_level` が `PRICE_LEVEL_FREE` の場合、`priceLevels` パラメータから除外する必要がある
  - `PRICE_LEVEL_FREE` を受け取った場合の振る舞いを設計で明確化する

### HTTP クライアント選定
- **Context**: Google Places API 呼び出しに使用するHTTPクライアントの選定
- **Sources Consulted**: Gemfile、Gemfile.lock の依存関係調査
- **Findings**:
  - Faraday 2.14.1 が ruby-openai の transitive dependency として既にインストール済み
  - QueryParserService は OpenAI::Client（内部的にFaraday使用）経由で利用
  - Faraday を直接使用すれば追加gem不要
  - `Faraday::Error` のエラーハンドリングパターンが QueryParserService で確立済み
- **Implications**:
  - 新規gemの追加不要。Faraday を直接使用する
  - `Faraday::Error` を捕捉するパターンを踏襲

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| サービスオブジェクト（採用） | QueryParserServiceと同じパターンでFaradayを直接使用 | 既存パターンと統一、追加gem不要、テストパターン確立済み | Faraday直接使用によるボイラープレートコード | プロジェクトの規約に準拠 |
| 専用クライアントgem | google-places 等の専用gemを導入 | ボイラープレート削減、API変更への追従が容易 | 新規依存の追加、gem品質・メンテナンス状況の確認が必要 | 現時点ではoverengineering |

## Design Decisions

### Decision: Faraday直接使用
- **Context**: Google Places APIを呼び出すHTTPクライアントの選択
- **Alternatives Considered**:
  1. Faraday直接使用 — ruby-openaiの依存として既存
  2. 専用クライアントgem導入 — google-places等
- **Selected Approach**: Faraday直接使用
- **Rationale**: 追加依存なし、QueryParserServiceと同じエラーハンドリングパターンを踏襲でき、APIエンドポイントが1つのみのため専用gemはoverkill
- **Trade-offs**: ヘッダー設定・リクエスト構築のボイラープレートが必要だが、サービスクラス内に閉じるため許容範囲
- **Follow-up**: なし

### Decision: PRICE_LEVEL_FREE の除外処理
- **Context**: QueryParserServiceが `PRICE_LEVEL_FREE` を出力する可能性があるが、Google Places APIのリクエストでは使用不可
- **Alternatives Considered**:
  1. `PRICE_LEVEL_FREE` をnilとして扱い、priceLevelsパラメータを省略
  2. エラーとして例外をraise
- **Selected Approach**: `PRICE_LEVEL_FREE` をnilと同様に扱い、priceLevelsパラメータを省略（価格帯フィルタなしで検索）
- **Rationale**: ユーザー体験を損なわない。無料の飲食店は稀なケースであり、フィルタなしで検索した方が有用な結果が得られる
- **Trade-offs**: 厳密な価格帯フィルタリングが行われないが、RecommendationServiceで補完可能
- **Follow-up**: QueryParserServiceのSYSTEM_PROMPTから `PRICE_LEVEL_FREE` を除外することも将来的に検討

## Risks & Mitigations
- Google Places API のレート制限 — 個人利用ツールのため現時点では低リスク。将来的にはリトライ・バックオフの追加を検討
- Faraday のメジャーバージョンアップによる破壊的変更 — ruby-openai の依存としてバージョンが管理されるため、ruby-openai 更新時に確認

## References
- [Text Search (New) 公式ドキュメント](https://developers.google.com/maps/documentation/places/web-service/text-search)
- [Place Data Fields (New)](https://developers.google.com/maps/documentation/places/web-service/data-fields)
- [Google Maps Platform Pricing](https://developers.google.com/maps/billing-and-pricing/pricing)
