# Research & Design Decisions

## Summary
- **Feature**: ramen-search-mode
- **Discovery Scope**: Extension（既存システムの拡張）
- **Key Findings**:
  - 既存の検索パイプライン（QueryParser → GooglePlaces → Recommendation）は `mode` パラメータの追加で自然にラーメンモードに対応可能
  - `QueryParserService` のプロンプト修正＋コントローラーでの genre 上書きで、ラーメンジャンルの自動付与を確実に実現できる
  - `useSearchHistory` の localStorage キーをモード別に分けることで、既存履歴の後方互換性を保ちつつタブ別管理を実現できる

## Research Log

### 既存検索パイプラインの拡張ポイント分析
- **Context**: ラーメンモード追加にあたり、既存パイプラインのどこを変更すべきかを調査
- **Sources Consulted**: `SearchController`, `RefineController`, `QueryParserService`, `GooglePlacesService`, `RecommendationService` の実装
- **Findings**:
  - `SearchController#create` は `query` のみ受け取り、`QueryParserService.call(query)` → `GooglePlacesService.call(parsed)` → `RecommendationService.call(places, query, parsed)` の順に呼び出す
  - `RefineController#create` は `feedback`, `original_query`, `parsed_conditions` を受け取り、差分マージ後に同様のパイプラインを実行
  - `GooglePlacesService` は `textQuery: "#{area} #{genre} #{keyword}".strip` で検索テキストを構築。genre="ラーメン" を設定すればラーメン店の検索に自動対応
  - `RecommendationService` はシステムプロンプトで選定基準を定義。ラーメン固有の特徴を考慮するプロンプトに切り替え可能
- **Implications**: 新規エンドポイント不要。既存の3エンドポイントに `mode` パラメータを追加し、サービス層でモード別の振る舞いを制御する設計が最適

### ラーメンモードでの QueryParserService 挙動
- **Context**: ジャンル「ラーメン」の自動付与方法の検討
- **Sources Consulted**: `QueryParserService` のシステムプロンプト、`RefineController` の条件マージロジック
- **Findings**:
  - 現行プロンプトは `genre` に料理ジャンルを抽出する設計。「味噌ラーメン」の場合、genre="ラーメン" or "味噌ラーメン" と解釈され、「味噌」がキーワードに分離されない可能性がある
  - ラーメンモード時にプロンプトに「genre は常に 'ラーメン'、ラーメン特徴は keyword に含めよ」と追記すれば、「味噌」などが keyword に正しく分離される
  - 安全策としてコントローラーで `parsed[:genre] = "ラーメン"` の上書きを行うことで、LLM の出力ブレに対応
  - `RefineController` の条件マージ後も同様にジャンル上書きが必要（フィードバックで genre が変わる可能性）
- **Implications**: プロンプト修正（品質向上）＋コントローラー上書き（安全策）の二重戦略を採用

### 検索履歴のタブ別分離
- **Context**: 既存の localStorage 履歴をタブ別に分離する方法
- **Sources Consulted**: `useSearchHistory` フック、localStorage 構造
- **Findings**:
  - 現行キー: `restaurant_search_history`（JSON配列 `[{query: string}]`、最大10件）
  - ラーメンモード用に別キー `ramen_search_history` を使用すれば、既存データに影響なし
  - `useSearchHistory` フックを `mode` パラメータ対応にすれば、キーの切り替えだけで対応完了
  - 既存履歴は `restaurant_search_history` キーに残るため、要件 5.5（既存履歴を居酒屋タブで表示）を自動的に満たす
- **Implications**: フックの引数追加のみで対応可能。マイグレーション不要

### RecommendationService のラーメン固有プロンプト
- **Context**: ラーメン推薦でどのような特徴を考慮すべきか
- **Sources Consulted**: 既存の RecommendationService プロンプト
- **Findings**:
  - 既存プロンプトは「条件一致度 → 評価 → 価格帯」の優先順で選定
  - ラーメンモードでは「味の系統（醤油・味噌・塩・豚骨）」「麺の太さ」「スープの種類」「ユーザーのキーワードとの関連性」を選定基準に含めるべき
  - Google Places の候補データには name, rating, price_level, address のみ含まれるため、LLM はレストラン名と自身の知識から特徴を推測する必要がある
  - 推薦理由（reason）にラーメン特徴を含めることで要件 3.1 を満たす
- **Implications**: モード別のシステムプロンプトを用意。ラーメン固有の選定基準と出力規則を定義

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| mode パラメータ追加 | 既存エンドポイントに `mode` を追加し、サービス層で分岐 | 最小変更、後方互換、コード重複なし | モード増加時にサービス内の分岐が増える | **採用** |
| 専用エンドポイント | `/api/ramen-search` を新設 | 関心の分離が明確 | コード重複大、メンテナンスコスト増 | 却下 |
| ミドルウェア方式 | リクエストヘッダーでモード判定 | コントローラー変更不要 | 暗黙的で分かりにくい、テストしにくい | 却下 |

## Design Decisions

### Decision: mode パラメータによる既存パイプライン拡張
- **Context**: ラーメン検索機能の追加方法
- **Alternatives Considered**:
  1. 既存エンドポイントに `mode` パラメータ追加（パイプライン共有）
  2. ラーメン専用エンドポイント新設（パイプライン分離）
  3. ジェネリックな `food_type` フィルター追加
- **Selected Approach**: Option 1 — `mode` パラメータ追加
- **Rationale**: brief.md の方針と一致。検索・推薦・再レコメンドのパイプラインは共通で、差分はプロンプトとジャンル固定のみ。エンドポイント分離はコード重複が大きく正当化できない
- **Trade-offs**: サービス内のモード分岐が増えるが、現時点では2モードのみで複雑性は低い
- **Follow-up**: 3モード以上に増えた場合はストラテジーパターンへのリファクタリングを検討

### Decision: プロンプト修正＋コントローラー上書きの二重戦略
- **Context**: ラーメンモードで genre を確実に「ラーメン」にする方法
- **Alternatives Considered**:
  1. コントローラーでの事後上書きのみ
  2. プロンプト修正のみ
  3. プロンプト修正＋事後上書き（二重戦略）
- **Selected Approach**: Option 3 — 二重戦略
- **Rationale**: プロンプト修正でラーメン特徴（味噌、豚骨等）を keyword に正しく分離。事後上書きで LLM 出力のブレを吸収
- **Trade-offs**: 若干の冗長性があるが、堅牢性を優先
- **Follow-up**: なし

### Decision: localStorage キー分離による検索履歴管理
- **Context**: タブ別検索履歴の実現方法
- **Alternatives Considered**:
  1. キー分離（`restaurant_search_history` / `ramen_search_history`）
  2. 単一キーに `mode` フィールド追加（`[{query, mode}]`）
  3. sessionStorage 使用
- **Selected Approach**: Option 1 — キー分離
- **Rationale**: 既存の `restaurant_search_history` キーをそのまま居酒屋タブ用として使えるため、マイグレーション不要で後方互換性を完全に維持。実装も最もシンプル
- **Trade-offs**: キーが増えるが、2つなら問題なし
- **Follow-up**: なし

## Risks & Mitigations
- ラーメン店の Google Places 検索結果が少ない可能性 — genre="ラーメン" のみでなく keyword も検索テキストに含めることでカバレッジ確保
- LLM がラーメン固有特徴を正確に推測できない可能性 — Google Places データに基づく推薦であるため限界はあるが、既知のラーメン店については LLM の知識で補完
- モード増加時のサービス複雑化 — 現時点では2モードのみ。3モード以上になった場合にストラテジーパターンへのリファクタリングを検討

## Synthesis Outcomes

### Generalization
- `mode` パラメータは `SearchMode` 型（`'izakaya' | 'ramen'`）として定義。将来的なモード追加（cafe, sushi 等）は型の拡張で対応可能
- `useSearchHistory` の localStorage キー生成ロジックはモード値から導出。新モード追加時にキーマッピング追加のみで対応

### Build vs. Adopt
- 新規ライブラリ不要。全変更は既存コードベースの拡張のみ
- タブ UI はカスタムコンポーネントで実装（外部ライブラリのオーバーヘッド不要）

### Simplification
- 新規エンドポイント不要。既存3エンドポイント（search, refine, omakase）のうち2つに `mode` 追加
- 新規サービス不要。既存サービスのメソッドシグネチャ拡張のみ
- 新規コンポーネントは `ModeTabs` 1つのみ
