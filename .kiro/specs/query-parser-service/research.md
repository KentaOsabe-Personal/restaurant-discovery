# Research & Design Decisions

## Summary
- **Feature**: `query-parser-service`
- **Discovery Scope**: New Feature（新規サービス、外部API統合あり）
- **Key Findings**:
  - `ruby-openai` gem（v8.3.0）は `response_format` パラメータ経由で JSON Schema モードをサポート
  - 公式 OpenAI Ruby SDK（openai-ruby）も存在するが、ruby-openai の方がエコシステムで成熟
  - エラーハンドリングは `Faraday::Error` ベース、自動リトライ機能内蔵

## Research Log

### OpenAI Ruby Gem 選定
- **Context**: QueryParserService で OpenAI API を呼び出すための Ruby クライアントライブラリが必要
- **Sources Consulted**: RubyGems、GitHub alexrudall/ruby-openai、GitHub openai/openai-ruby
- **Findings**:
  - `ruby-openai`（alexrudall）: v8.3.0、成熟したコミュニティ、広い採用実績
  - `openai-ruby`（公式）: v0.55.0、2025年4月リリース、ネイティブ Structured Outputs サポート
  - 両者は同じ名前空間（`OpenAI`）を使うため混在不可
- **Implications**: `ruby-openai` を採用。成熟度と Rails エコシステムとの親和性を優先

### Structured Outputs / JSON Schema モード
- **Context**: 自然文から構造化データを確実に抽出するため、レスポンスの JSON スキーマを保証する必要がある
- **Sources Consulted**: OpenAI API ドキュメント、GitHub Issue #508
- **Findings**:
  - `response_format: { type: "json_schema", json_schema: { name: "...", schema: {...} } }` でスキーマ制約付きレスポンスを取得可能
  - ruby-openai はパラメータをそのまま API に転送するため、この形式は動作する
  - `strict: true` を指定することで、スキーマへの厳密な準拠を強制可能
- **Implications**: `json_schema` タイプの `response_format` を使用し、出力構造を保証する

### エラーハンドリングパターン
- **Context**: OpenAI API のエラーを SearchController に適切に伝播する必要がある
- **Sources Consulted**: ruby-openai ソースコード、Faraday ドキュメント
- **Findings**:
  - `Faraday::Error` が基底例外クラス
  - `Faraday::ClientError`（4xx）、`Faraday::ServerError`（5xx）が派生クラス
  - タイムアウトは `Faraday::TimeoutError` として発生
  - デフォルトで最大2回の自動リトライあり
- **Implications**: カスタム例外クラス `QueryParserError` を定義し、Faraday 例外をラップして上位に伝播

### API キー管理
- **Context**: Docker Compose でマウントされたファイルから API キーを読み取る
- **Findings**:
  - `/openai_apikey` がコンテナ内にマウント（read-only）
  - ファイルの内容を `strip` して使用する
  - 環境変数ではなくファイルベースの管理方式

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Service Object | Rails 標準の PORO サービスクラス | シンプル、テスト容易、Rails 慣習に沿う | 複雑な依存注入には不向き | 既存の SearchController スタブパターンと整合 |
| Interactor パターン | gem `interactor` 使用 | 組み立て可能、明確な成功/失敗 | 依存追加、小規模サービスにはオーバー | 不採用 |

## Design Decisions

### Decision: ruby-openai gem の採用
- **Context**: OpenAI API クライアントライブラリの選定
- **Alternatives Considered**:
  1. `ruby-openai`（alexrudall）— 成熟、広い採用
  2. `openai-ruby`（公式）— ネイティブ Structured Outputs、新しい
  3. 直接 HTTP クライアント（Net::HTTP / Faraday）— 依存最小
- **Selected Approach**: `ruby-openai` gem v8.3.0
- **Rationale**: Rails エコシステムでの採用実績が豊富。`response_format` パラメータはそのまま API に転送されるため、JSON Schema モードも利用可能
- **Trade-offs**: 公式 SDK のネイティブ型サポートは得られないが、実用上は十分
- **Follow-up**: gem のバージョン更新を定期的に確認

### Decision: Service Object パターンの採用
- **Context**: QueryParserService のアーキテクチャパターン選定
- **Selected Approach**: Rails 標準の PORO Service Object
- **Rationale**: 既存の SearchController スタブが薄いコントローラパターンを採用しており、サービスオブジェクトで責務を分離する Rails の慣習に沿う
- **Trade-offs**: 依存注入はコンストラクタ引数で手動管理

### Decision: カスタム例外クラスの導入
- **Context**: OpenAI API エラーを SearchController が 502 に変換する設計（Chunk 6）への対応
- **Selected Approach**: `QueryParserError` カスタム例外クラスを定義し、Faraday 例外をラップ
- **Rationale**: 呼び出し元が特定の例外クラスで rescue できるようにし、エラーの発生源を明確化

## Risks & Mitigations
- OpenAI API のレスポンス品質が入力言語（日本語）に依存 — プロンプトに日本語例を含め、テストで検証
- API レート制限 — 個人利用ツールのため当面は問題なし。将来的にはリトライ・バックオフを検討
- API キーファイルの欠如 — サービス初期化時にファイル存在チェックを実施
