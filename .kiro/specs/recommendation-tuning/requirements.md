# Requirements Document

## Introduction
レコメンドパイプラインの精度を改善するための3つの改修。
現在の `RecommendationService` はユーザーのクエリ文字列のみを受け取り、`QueryParserService` が構造化した条件（エリア・ジャンル・価格帯）を利用していない。
この仕様では、構造化条件の引き渡し、システムプロンプトの選定基準詳細化、低品質候補の事前フィルタリングの3点を要件として定義する。

## Boundary Context
- **In scope**: `RecommendationService` の呼び出しシグネチャ変更、AIへのリクエストペイロード拡張、システムプロンプト更新、前処理フィルタリングロジック追加、`SearchController` / `OmakaseController` の呼び出し箇所更新
- **Out of scope**: フィードバックUI（別途仕様化予定）、`QueryParserService` 自体の変更、`GooglePlacesService`、フロントエンドコンポーネント
- **Adjacent expectations**: `QueryParserService` が `{area:, genre:, price_level:, keyword:}` のシンボルキーHashを返すことに依存する（このサービスへの変更はスコープ外）

## Requirements

### Requirement 1: 構造化条件の引き渡し

**Objective:** As a レストラン検索ユーザー, I want AI推薦がクエリの構造化条件（エリア・ジャンル・価格帯）を直接参照して選定する, so that クエリの再解釈による情報劣化なく、条件に合った店舗が推薦される。

#### Acceptance Criteria
1. When `RecommendationService` が呼び出されるとき, the `RecommendationService` shall `parsed_conditions` をオプションパラメータとして受け付ける（省略時は従来動作を維持する）
2. When `parsed_conditions` が渡されたとき, the `RecommendationService` shall AIへのリクエストペイロードに `parsed_conditions` の内容を含める
3. When 検索クエリが実行されるとき, the `SearchController` shall `QueryParserService` の結果である `parsed_conditions` を `RecommendationService` に渡す
4. When おまかせリクエストが実行されるとき, the `OmakaseController` shall `parsed_conditions` を `RecommendationService` に渡す
5. The `RecommendationService` shall `parsed_conditions` が `nil` の場合も従来と同等の動作を保証する

### Requirement 2: システムプロンプトの詳細化

**Objective:** As a レストラン検索ユーザー, I want AI が条件一致度・評価・価格帯の優先順位に基づいて店舗を選定し、選んだ理由を他候補との比較で説明する, so that 推薦結果の質と納得感が向上する。

#### Acceptance Criteria
1. The `RecommendationService` shall システムプロンプトに条件一致度を最優先とする選定基準を含める
2. The `RecommendationService` shall システムプロンプトに `rating` の評価基準（優秀・普通・回避の閾値）を含める
3. The `RecommendationService` shall システムプロンプトに除外基準（`rating` が null かつ評価済み代替がある場合、価格帯が明確に不一致の場合）を含める
4. When AI が推薦理由を生成するとき, the `RecommendationService` shall 他候補との比較と条件への合致点を含む推薦理由をユーザーに返す
5. The `RecommendationService` shall `candidates` に含まれる `name` を変更・省略・翻訳せずそのまま使用するよう AI に指示する

### Requirement 3: 前処理フィルタリング

**Objective:** As a レストラン検索ユーザー, I want 評価が著しく低い候補が推薦対象から外れる, so that 推薦品質が向上し、AI への不要なトークン送信が削減される。

#### Acceptance Criteria
1. When `RecommendationService` が AI を呼び出す前に, the `RecommendationService` shall `rating` が 3.5 未満の候補を除外する
2. When フィルタリング後の候補数が `min_count` 以上のとき, the `RecommendationService` shall フィルタリング済み候補のみを AI に送信する
3. When フィルタリング後の候補数が `min_count` 未満のとき, the `RecommendationService` shall フィルタリングを適用せず全候補を AI に送信する（推薦可能件数を確保するため）
4. If `places` が空のとき, the `RecommendationService` shall AI を呼び出さず空配列を返す（既存の動作を維持する）
