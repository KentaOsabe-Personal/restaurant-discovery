# Requirements Document

## Introduction
GooglePlacesServiceは、QueryParserServiceが出力した構造化検索条件（エリア・ジャンル・予算・キーワード）を受け取り、Google Places API (New) の Text Search エンドポイントを呼び出して候補店舗リストを返すバックエンドサービスである。SearchController統合（Chunk 6）において、QueryParserServiceの後段・RecommendationServiceの前段として動作する。

## Requirements

### Requirement 1: テキスト検索クエリの構築
**Objective:** As a SearchController, I want GooglePlacesServiceに構造化条件を渡してテキスト検索クエリを生成してほしい, so that Google Places APIに適切な検索リクエストを送信できる

#### Acceptance Criteria
1. When 構造化条件（area, genre, price_level, keyword）が渡された場合, the GooglePlacesService shall area・genre・keywordを結合してテキストクエリ文字列を構築する
2. When price_levelがnil以外で渡された場合, the GooglePlacesService shall Google Places APIのpriceLevelsパラメータとして設定する
3. When area, genre, keywordのいずれかがnilの場合, the GooglePlacesService shall nilのフィールドをスキップし、存在するフィールドのみでクエリ文字列を構築する
4. The GooglePlacesService shall `POST https://places.googleapis.com/v1/places:searchText` エンドポイントにリクエストを送信する
5. The GooglePlacesService shall リクエストに言語コード `ja` を設定し、日本語の結果を取得する

### Requirement 2: フィールドマスクの設定
**Objective:** As a SearchController, I want 必要な店舗情報フィールドのみを取得してほしい, so that APIコストを抑えつつ必要十分な情報を得られる

#### Acceptance Criteria
1. The GooglePlacesService shall リクエストヘッダー `X-Goog-FieldMask` に以下のフィールドを設定する: `places.displayName`, `places.rating`, `places.priceLevel`, `places.formattedAddress`, `places.googleMapsUri`
2. The GooglePlacesService shall 最大件数パラメータ（maxResultCount）を20に設定する

#### Design Decision: フィールドマスクの最小化
Google Places API (New) はリクエスト内の最上位SKUフィールドで全体課金が決まる（5段階: Essentials IDs Only 無料 → Essentials → Pro $32 → Enterprise $35 → Enterprise+Atmosphere $40/1,000リクエスト）。

以下のフィールドは初期構築のスコープから意図的に除外した:

| 除外フィールド | SKU tier | 除外理由 |
|---------------|----------|----------|
| `places.photos` | Essentials (IDs Only) | 写真参照自体は安価だが、実画像表示には別途 Photos API 呼び出しが必要。AI推薦の判断に不要 |
| `places.currentOpeningHours` | Enterprise | 営業時間はAI推薦の意思決定に必須ではない |

`rating` / `priceLevel` (いずれもEnterprise tier) はRecommendationServiceの推薦精度に不可欠なため保持。この2フィールドを含む時点でEnterprise ($35/1,000) が適用されるため、`currentOpeningHours` 追加による追加課金は発生しないが、「初期は最小限で構築し、必要なら追加開発で足す」方針に基づき除外した。

将来 photos・営業時間の表示機能を追加する際は、推薦後の3〜5件のみに Place Details API で個別取得する方がコスト効率が良い。

### Requirement 3: レスポンスの整形
**Objective:** As a SearchController, I want Google Places APIのレスポンスを統一されたハッシュ形式で受け取りたい, so that 後続のRecommendationServiceが利用しやすい形式でデータを渡せる

#### Acceptance Criteria
1. When Google Places APIが正常なレスポンスを返した場合, the GooglePlacesService shall 各店舗を以下のキーを持つハッシュの配列に整形して返す: `name`, `rating`, `price_level`, `address`, `google_maps_url`
2. When レスポンス内の `rating`, `priceLevel` のいずれかが欠落している場合, the GooglePlacesService shall 該当フィールドをnilとして整形する
3. The GooglePlacesService shall `displayName.text` の値を `name` フィールドにマッピングする

### Requirement 4: 検索結果が0件の場合の処理
**Objective:** As a SearchController, I want 検索結果がない場合にも正常なレスポンスを受け取りたい, so that 後続処理でエラーにならず空の結果として扱える

#### Acceptance Criteria
1. When Google Places APIが結果0件（placesキーが空または存在しない）を返した場合, the GooglePlacesService shall 空配列を返す
2. While 検索結果が0件の場合, the GooglePlacesService shall 例外をraiseせず正常に処理を完了する

### Requirement 5: APIキーの管理
**Objective:** As a システム管理者, I want APIキーをセキュアに管理したい, so that キーの漏洩リスクを最小限にできる

#### Acceptance Criteria
1. The GooglePlacesService shall APIキーをファイルパス `/google_places_apikey` から読み取る
2. The GooglePlacesService shall リクエストヘッダー `X-Goog-Api-Key` にAPIキーを設定する
3. If APIキーファイルが存在しない場合, the GooglePlacesService shall 適切なエラーメッセージと共に例外をraiseする

### Requirement 6: エラーハンドリング
**Objective:** As a SearchController, I want 外部API呼び出しの失敗を適切にハンドリングしてほしい, so that エラーの原因を特定しやすく、適切なHTTPステータスコードを返せる

#### Acceptance Criteria
1. If Google Places APIが4xxステータスコードを返した場合, the GooglePlacesService shall エラーメッセージを含む例外をraiseする
2. If Google Places APIが5xxステータスコードを返した場合, the GooglePlacesService shall エラーメッセージを含む例外をraiseする
3. If ネットワークエラー（タイムアウト、接続拒否等）が発生した場合, the GooglePlacesService shall エラーメッセージを含む例外をraiseする
4. While エラーが発生した場合, the GooglePlacesService shall エラー詳細をRails.loggerに記録する
5. The GooglePlacesService shall 専用のエラークラス（GooglePlacesError）を使用して例外をraiseする
