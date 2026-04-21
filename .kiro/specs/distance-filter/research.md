# リサーチ・設計決定ログ

---
**Purpose**: ディスカバリーフェーズの調査結果および設計決定の根拠を記録する。
---

## Summary

- **Feature**: `distance-filter`
- **Discovery Scope**: Extension（既存の検索パイプラインへの追加）
- **Key Findings**:
  - `GooglePlacesService`は現在位置情報・半径を一切使用しない純テキスト検索。`lat`/`lng`はすでに取得済み
  - `RecommendationService#merge_recommendations`は`place.merge(reason:)`を使用するため、placeハッシュに追加した`distance_km`が自動保持される
  - Google Places API `searchText` の`locationBias.circle.radius`は最大50000m（50km）の制限があり、60km・120kmケースで使用不可

## Research Log

### 既存検索パイプラインの分析

- **Context**: 距離フィルターをどこに組み込むかを決定するための現状把握
- **Findings**:
  - `SearchController#create`: query + mode → QueryParserService → GooglePlacesService → RecommendationService → JSON
  - `GooglePlacesService#call`: `textQuery`（area+genre+keyword）+ 任意`priceLevels`のみ。位置情報なし
  - `GooglePlacesService#format_place`: `places.location.latitude/longitude`を`lat`/`lng`として取得済み
  - `RecommendationService#build_user_message`: `p.slice(:name, :rating, :price_level, :address)`でAIには位置情報を渡さない（`distance_km`を含めないで正しい）
  - `RecommendationService#merge_recommendations`: `place.merge(reason: rec[:reason])`でplaceハッシュ全体を保持する
  - `SearchController`: `recommended_names`で推薦店を特定し、残りを`other_candidates`として構築
- **Implications**: `distance_km`はplaceハッシュに付与すればRecommendationService経由で自動的にフロントへ届く

### Google Places API `locationBias` の制限調査

- **Context**: 位置バイアスを使って検索品質を向上できるか検討
- **Findings**:
  - `searchText`エンドポイントは`locationBias.circle.radius`をサポートするが最大50000m（50km）
  - `within_1hour`（60km）・`1_to_2_hours`（120km）ケースで制限を超える
  - `locationRestriction.circle`は`searchText`ではサポートされていない（`nearbySearch`のみ）
  - `locationBias.rectangle`（バウンディングボックス）は制限なしだが、精度が下がる
- **Implications**: `locationBias`を一切使用しない方針を採用。ポストフィルタリングが唯一のhard constraintとなり、設計がシンプルになる

### refine APIへの影響調査

- **Context**: `Candidate`型に`distance_km`を追加することで`/api/refine`レスポンスに影響が出るか確認
- **Findings**:
  - `RefineController`は`GooglePlacesService.new.call(merged_conditions)`を呼ぶが、距離計算を行わない
  - `SearchController`と同様の`render json:`パターンだが、`distance_km`付与処理なし
  - `RefineController`のレスポンスは`other_candidates`に既存のplace structを使う（`distance_km`フィールドなし）
- **Implications**: refineのレスポンスには`distance_km`が付与されない。TypeScriptの`distance_km: number | null`で後方互換性を確保する。要件のスコープ境界「再レコメンド（refine）への距離フィルター適用は対象外」を遵守

## Architecture Pattern Evaluation

| オプション | 説明 | 長所 | リスク / 限界 |
|---------|------|------|-------------|
| locationBias + ポストフィルタリング | Google Places APIに位置バイアスを追加し、結果を距離でフィルタリング | 検索品質向上 | 50kmの上限制限で60km/120kmケースに使用不可 |
| ポストフィルタリングのみ | GooglePlacesServiceは変更せず、SearchControllerで距離計算・フィルタリング | シンプル、後方互換性維持 | pageSize=20の中で距離外の店が多いと結果が少なくなる可能性 |
| nearbySearchに切り替え | 位置ベースの検索エンドポイントを使用 | 高精度な位置フィルタリング | 大規模な変更が必要、既存テキスト検索との組み合わせが困難 |

**採用**: ポストフィルタリングのみ。シンプルさと後方互換性を優先。

## Design Decisions

### Decision: `locationBias`を使用しない

- **Context**: 60km/120kmの距離バイアスにGoogle Places APIの50km上限が適用される
- **Alternatives Considered**:
  1. `locationBias.circle`（50km以下のみ）+ ケース分けで対処
  2. `locationBias.rectangle`（バウンディングボックス）
  3. `locationBias`を使用しない
- **Selected Approach**: `locationBias`を使用しない
- **Rationale**: ポストフィルタリングがhard constraintとして機能するため、locationBiasはsoftな品質改善にすぎない。管理コストとAPI制限の複雑さを避けるためシンプルな方針を採用
- **Trade-offs**: `1_to_2_hours`（60-120km）ケースでは、ユーザーがクエリに遠方エリアを含めないと自然言語検索で近場の結果ばかり返る可能性がある。ユーザーが明示的に遠方エリアを指定することが前提
- **Follow-up**: pageSize=20で距離フィルター後に結果が著しく少なくなる場合、将来的に`locationBias.rectangle`の追加を検討

### Decision: `DistanceCalculator`をモジュールで実装

- **Context**: 距離計算のコード配置を決定
- **Alternatives Considered**:
  1. Service Object（`DistanceCalculatorService.new.call(...)）
  2. モジュールのクラスメソッド（`DistanceCalculator.call(...)）
  3. `SearchController`のprivateメソッドとして直接実装
- **Selected Approach**: モジュールのクラスメソッド
- **Rationale**: ステートレスな純粋関数のため、Service Objectパターンのインスタンス化は不要。テスト容易性を維持しつつ最小限の抽象化に留める
- **Trade-offs**: 独立したファイルなのでテストが書きやすいが、Service Object規約（`.new.call`）からの逸脱

### Decision: `distance_km`をポストフィルタリング前に全件計算

- **Context**: `distance_km`の計算タイミングの決定
- **Alternatives Considered**:
  1. フィルタリング後にのみ計算（除外される店に無駄な計算をしない）
  2. フィルタリング前に全件計算
- **Selected Approach**: フィルタリング前に全件計算
- **Rationale**: `RecommendationService`に渡す前にdistance_kmを付与しておくことで、`place.merge(reason:)`の自動保持を活用できる。計算コスト（最大20件のHaversine演算）は無視できる水準

### Decision: refineのdistance_km付与はスコープ外

- **Context**: 要件5.2「ラーメン検索のすべてのレスポンスに付与」がrefineにも適用されるか判断
- **Selected Approach**: refineはスコープ外とする
- **Rationale**: 要件スコープ境界が「再レコメンド（refine）への距離フィルター適用は対象外」と明記している。distance_km付与はフィルター機能と一体化した本スペックの責務であり、refineへの適用は次フェーズの判断に委ねる
- **Trade-offs**: TypeScript側で`distance_km: number | null`とすることで後方互換性を確保。refine結果にはdistance_kmが付与されず、フロントは`null`チェックで表示を制御する

## Synthesis Outcomes

### Generalization
- `travel_time`は内部的に`{min_km, max_km}`の距離範囲に変換する。この表現は将来的にkm直接指定などに対応できるが、現実装はTravelTimeの4値のみに限定する

### Build vs Adopt
- Haversine計算: 標準的な数学式のためライブラリ不要。独自実装
- 距離フィルターUI: 単純なTailwindボタン群。ライブラリ不要
- Google Places API locationBias: 採用見送り（上限制限による）

### Simplification
- `GooglePlacesService`への変更ゼロ（当初はlocationBias追加を計画したが不要と判断）
- `DistanceCalculator`はService Objectではなくモジュールとして最小化
- フロントエンドはApp.txのstateに`distanceFilter`を追加するのみ（新しいhookやcontextは不要）

## Codebase Verification (2026-04-19)

### 検証結果

コードベース分析により、design.mdの全仮定が検証済み:

- **SearchController**: `create`アクションの行25（mode取得後）にtravel_timeバリデーション、行30（GooglePlacesService後）にdistance_km計算・ポストフィルタリングの挿入ポイントを確認。既存のempty-check（行32-44）はフィルタリング後に移動が必要
- **GooglePlacesService**: `format_place`メソッドの行75-76で`lat`/`lng`が既に抽出済み。変更不要を確認
- **RecommendationService**: 行160の`place.merge(reason:)`がdistance_kmを自動保持することを確認。`build_user_message`（行144）は`.slice(:name, :rating, :price_level, :address)`で距離情報をAIに送らないことを確認
- **PlaceCard**: 行3の`PlaceCardProps = Candidate & { reason?: string; ... }`パターンにより、Candidate型にdistance_kmを追加すれば自動的にpropsに反映
- **Frontend types**: `Candidate`型（行13-21）にdistance_km追加、`SearchRequest`型（行3-6）にtravel_time追加が必要
- **App.tsx**: 行19-31のステート管理パターン、行33-43の`handleTabChange`リセットパターンを確認。distanceFilterステートの追加は既存パターンに整合

### 不整合・懸念事項

なし。全設計仮定がコードベースと一致。

## Risks & Mitigations

- `pageSize=20`のうち距離フィルター後に結果が著しく少なくなる可能性 — ユーザーが遠方エリアを明示的にクエリに含めることを前提とする（特に`1_to_2_hours`ケース）
- フロントエンドとバックエンドの自宅位置定数の同期ズレ — READMEやコメントで両ファイルの同時更新を明記する
- `lat`/`lng`が`nil`のplace — `distance_km: nil`として扱い、`travel_time`指定時は除外する（既存の`lat`/`lng`取得失敗ケースと同様の軟性劣化）
