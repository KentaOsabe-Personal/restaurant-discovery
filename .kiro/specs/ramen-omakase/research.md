# 調査・設計判断ログ

## Summary
- **Feature**: `ramen-omakase`
- **Discovery Scope**: Extension
- **Key Findings**:
  - 既存の `App.tsx` は mode ごとの状態初期化、検索、再レコメンド、地図表示を一元管理しており、ラーメンおまかせも同じオーケストレーション層に載せるのが最小変更になる。
  - 既存の `OmakaseService` と `/api/omakase` は居酒屋 4 エリア前提の入力契約を持つため、ラーメン固有の距離条件付きランダム選定は別サービスに分離した方が後方互換を保ちやすい。
  - ラーメン通常検索はすでに `distance_km` 付与・距離フィルター・`mode: "ramen"` の再レコメンドに対応しているため、ラーメンおまかせは `parsed_conditions` と既存候補表示を再利用すれば結果面の新規 UI を最小化できる。
  - `SearchInput` のプレースホルダーは現状固定で居酒屋向け文言になっており、ラーメンタブ整合には mode-aware な文言注入が最小変更になる。

## Research Log

### 既存おまかせ導線の拡張ポイント
- **Context**: Requirement 1, 5 を満たすため、既存居酒屋おまかせを壊さずにラーメンタブへ導線を増やせるか確認した。
- **Sources Consulted**:
  - `frontend/src/App.tsx`
  - `frontend/src/api/omakase.ts`
  - `frontend/src/components/OmakaseButtons.tsx`
  - `backend/app/controllers/api/omakase_controller.rb`
  - `backend/app/services/omakase_service.rb`
- **Findings**:
  - フロントは居酒屋タブ時のみ `OmakaseButtons` を描画し、`handleOmakase` が `/api/omakase` を呼んでいる。
  - バックエンドの `Api::OmakaseController` は `area` を必須入力として受け取り、`OmakaseService` が居酒屋向け条件を生成している。
  - 現行レスポンスは `recommendations` / `other_candidates` / `parsed_conditions` / `omakase` の形で、フロントは `parsed_conditions` を中心に UI を構成している。
- **Implications**:
  - ラーメンおまかせは新エンドポイントを増やさず `/api/omakase` の mode 対応で十分。
  - ただし入力契約は居酒屋とラーメンで異なるため、型安全な discriminated union と controller 分岐が必要。
  - 既存居酒屋フローは `area` 主体のまま残し、ラーメン分だけ別サービスで責務を閉じる。

### 距離条件とラーメン検索の既存契約
- **Context**: Requirement 2, 4 の成立条件として、通常ラーメン検索の距離仕様と整合するかを確認した。
- **Sources Consulted**:
  - `backend/app/controllers/api/search_controller.rb`
  - `backend/app/services/distance_calculator_service.rb`
  - `backend/config/initializers/home_location.rb`
  - `frontend/src/components/DistanceFilterButtons.tsx`
  - `backend/spec/requests/api/search_spec.rb`
- **Findings**:
  - 距離区分は `within_30min`, `within_1hour`, `1_to_2_hours` の 3 値で、ホーム座標からの直線距離で候補を絞っている。
  - ラーメン通常検索では `distance_km` が recommendation / other candidate に付与され、`PlaceCard` が既存 UI として表示できる。
  - `travel_time` 未指定時は距離フィルターをかけず、全候補を扱う後方互換パスがすでに定義されている。
- **Implications**:
  - ラーメンおまかせのエリア選定も同じ 3 区分を使い、ホーム座標基準で事前定義エリアの中心点を絞り込む設計が自然。
  - 結果表示側は既存 `PlaceCard` と地図 UI を再利用できるため、新たな距離表示コンポーネントは不要。
  - 距離条件は「エリア選定時だけ効く前段フィルター」とし、選定後の再レコメンドでは選定済みエリアを固定する。

### 結果継続性と再レコメンド
- **Context**: Requirement 3.3, 4.4 を満たすため、選定エリアをどう結果・再レコメンドへ引き継ぐかを調べた。
- **Sources Consulted**:
  - `frontend/src/components/SearchConditionTags.tsx`
  - `frontend/src/components/PlaceCard.tsx`
  - `frontend/src/components/FeedbackInput.tsx`
  - `backend/app/controllers/api/refine_controller.rb`
  - `backend/spec/requests/api/refine_spec.rb`
- **Findings**:
  - `SearchConditionTags` は `parsed_conditions` の `area / genre / price_level / keyword` をそのまま表示する。
  - `RefineController` は前回 `parsed_conditions` を起点に差分条件をマージし、`mode: "ramen"` 時は `genre` を強制的に `ラーメン` に戻している。
  - `FeedbackInput` は検索結果が存在すればそのまま利用でき、ラーメン専用 UI は不要。
- **Implications**:
  - ラーメンおまかせでは選定エリアを `parsed_conditions.area` に確実に書き戻すことで、結果画面と refine の両方を既存契約上で継続利用できる。
  - refine 時にランダム再抽選を行う必要はなく、選定済みエリアを固定した再推薦で十分。
  - 結果説明の追加 UI ではなく、`parsed_conditions` と推薦理由の質を設計上の主責務に置く。

### 検索入力プレースホルダーの mode 整合
- **Context**: Requirement 4.5 として、ラーメンタブでは居酒屋向け例示文言を出さないことを明示する必要が生じた。
- **Sources Consulted**:
  - `frontend/src/components/SearchInput.tsx`
  - `frontend/src/components/SearchInput.test.tsx`
  - `frontend/src/App.tsx`
- **Findings**:
  - `SearchInput` は現在 `placeholder="古町の海鮮居酒屋など"` を内部で固定している。
  - `App.tsx` は `activeTab` を持っているが、`SearchInput` には mode 固有文言を渡していない。
  - `SearchInput.test.tsx` も固定プレースホルダー前提で検証している。
- **Implications**:
  - mode 判定は既存の `App.tsx` に集約し、`SearchInput` は placeholder を props で受ける汎用入力に寄せるのが最小差分。
  - 居酒屋タブの既存文言を維持しつつ、ラーメンタブだけラーメン向け例示文言へ切り替える設計が自然。

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| `/api/omakase` を mode 対応し、ラーメン専用サービスを追加 | 既存 endpoint を維持しつつ、controller が izakaya / ramen を分岐する | 既存導線を再利用できる、後方互換が明確、責務境界を分けやすい | controller に分岐が増える | **採用** |
| `/api/ramen_omakase` を新設 | 入力契約が単純になる | API とクライアントが重複し、結果契約が分岐する | 既存パターンから外れ、保守箇所が増える | 不採用 |
| `OmakaseService` にラーメン分岐を内包 | ファイル数を増やさない | 居酒屋 4 エリアロジックと距離付きラーメンロジックが混在し責務が曖昧になる | Requirement 5 の独立性レビューに弱い | 不採用 |

## Design Decisions

### Decision: `/api/omakase` を mode-aware 契約へ拡張する
- **Context**: 1.1, 1.3, 5.1, 5.2 を満たしつつ既存 UI と API の流れを崩したくない。
- **Alternatives Considered**:
  1. 新規 endpoint を追加する
  2. 既存 endpoint に mode を追加する
- **Selected Approach**: `POST /api/omakase` を `izakaya` / `ramen` の discriminated union 入力にし、居酒屋は `area`、ラーメンは `travel_time` を受ける。
- **Rationale**: クライアント変更が `fetchOmakase` と `App.tsx` に集約され、既存結果契約も再利用できる。
- **Trade-offs**: controller 分岐の明示化が必要になるが、API 面の重複と文脈分断を避けられる。
- **Follow-up**: request spec と frontend API test で mode ごとの request body を固定する。

### Decision: ラーメン激戦区はバックエンド静的カタログとして保持する
- **Context**: 2.1, 2.2, 2.3 のランダム選定は事前定義データに依存するが、管理画面は scope 外。
- **Alternatives Considered**:
  1. DB 化する
  2. frontend / backend の両方で重複定義する
  3. backend の service 内で静的カタログを持つ
- **Selected Approach**: `RamenOmakaseService` が area id、表示名、検索用 area 文字列、住所フィルタ用キーワード群、中心座標を持つ。
- **Rationale**: 選定ロジックの責務を backend 側に閉じられ、距離判定と Google Places 条件生成を同じ境界で完結できる。
- **Trade-offs**: カタログ更新はコード変更になる。
- **Follow-up**: area id の安定性と距離閾値の spec を service spec で固定する。

### Decision: 選定エリアの継続性は `parsed_conditions` を正とする
- **Context**: 3.3, 4.4 を満たすには、選定エリアが結果表示と再レコメンドに一貫して現れる必要がある。
- **Alternatives Considered**:
  1. 専用の結果バナー状態を追加する
  2. `parsed_conditions.area` を選定エリアに置き換える
- **Selected Approach**: ラーメンおまかせレスポンスでは `parsed_conditions.area` を選定エリア名、`genre` を `ラーメン` に固定し、既存のタグ表示と refine に引き継ぐ。
- **Rationale**: 既存 UI 契約を変えずに「どのエリアで選ばれたか」を表示できる。
- **Trade-offs**: 選定メタ情報の詳細表示は `omakase` に退避し、主 UI は `parsed_conditions` に依存する。
- **Follow-up**: App 統合 test でタグ表示と refine の条件維持を確認する。

### Decision: zero-result を 2 種類に分けて扱う
- **Context**: 2.4 と 3.4 は「候補エリアが作れない場合」と「選定エリアで店が見つからない場合」を区別して伝える必要がある。
- **Alternatives Considered**:
  1. どちらも 200 空配列で返す
  2. 候補エリアゼロは 422、店舗ゼロは 200 空配列で返す
- **Selected Approach**: 候補エリアゼロは user-facing な 422 エラー、店舗ゼロは選定済み `parsed_conditions` を含む 200 空配列にする。
- **Rationale**: ユーザーに原因を伝えつつ、結果画面側では既存空状態 UI をそのまま再利用できる。
- **Trade-offs**: クライアントは error path と empty path の両方を扱う必要がある。
- **Follow-up**: request spec と App test で 422 文言と空結果文言の両方を固定する。

### Decision: 検索欄プレースホルダーは `App.tsx` から mode-aware に注入する
- **Context**: 4.5 を満たすには、ラーメンタブ選択時に検索入力の例示文言だけを差し替える必要がある。
- **Alternatives Considered**:
  1. `SearchInput` 内で mode を判定する
  2. `App.tsx` が placeholder を決めて `SearchInput` に渡す
- **Selected Approach**: `SearchInput` を汎用入力コンポーネントとして保ち、`App.tsx` が `activeTab` に応じた placeholder を props で渡す。
- **Rationale**: mode 状態はすでに `App.tsx` が保持しており、`SearchInput` に mode 依存ロジックを持ち込まない方が責務が明確。
- **Trade-offs**: props が 1 つ増えるが、UI 文言変更の影響範囲を局所化できる。
- **Follow-up**: `SearchInput.test.tsx` と `App.test.tsx` に mode 切替時のプレースホルダー表示確認を追加する。

## Risks & Mitigations
- 距離閾値が通常ラーメン検索とずれるリスク — `travel_time` 値は既存 3 区分を再利用し、spec/test でしきい値の意味を固定する。
- ランダム選定がテスト不安定になるリスク — `RamenOmakaseService` は `Random` を注入可能にし、サービス spec を決定的にする。
- Google Places のテキスト検索が周辺エリアを混ぜるリスク — area 文字列だけでなく `filter_terms` による住所フィルタを controller 側で追加する。
- 結果が空の理由が曖昧になるリスク — 候補エリアゼロと候補店舗ゼロで HTTP path を分け、ログにも mode / selected area / travel_time を残す。

## References
- `frontend/src/App.tsx` — mode 切替、検索・おまかせ・再レコメンド状態の集約点
- `frontend/src/api/omakase.ts` — 既存おまかせ API クライアント
- `backend/app/controllers/api/omakase_controller.rb` — 既存おまかせ endpoint 契約
- `backend/app/controllers/api/search_controller.rb` — ラーメン距離フィルターと `distance_km` 付与
- `backend/app/controllers/api/refine_controller.rb` — ラーメン mode の条件維持
- `backend/app/services/omakase_service.rb` — 居酒屋おまかせ条件生成
- `backend/app/services/distance_calculator_service.rb` — ホーム座標からの距離計算
