# ギャップ分析: google-places-service

## 1. 現状調査

### 既存アセット

| カテゴリ | アセット | 状態 |
|---------|---------|------|
| サービスパターン | `QueryParserService` | 完了済み。`call()` メソッド、定数ベースの設定、`File.read` によるAPIキー読み取り、カスタムエラークラスの雛形あり |
| エラークラス | `QueryParserError < StandardError` | 完了済み。同パターンで `GooglePlacesError` を作成可能 |
| コントローラ | `Api::SearchController` | スタブ実装済み。固定レスポンスを返す状態。Chunk 6 で統合予定 |
| HTTPクライアント | Faraday 2.14.1 | ruby-openai の依存として利用可能。直接利用でGoogle Places APIを呼び出せる |
| テスト基盤 | RSpec 7 + WebMock 3.24 | 設定済み。`stub_request` によるHTTPスタブ、`File.read` モックのパターンが確立されている |
| Docker | `docker-compose.yml` | バックエンドコンテナ構成済み。APIキーファイルのボリュームマウント追加が必要 |

### 確立されたパターン・規約

- **サービスクラス構造**: 定数（API設定）+ `call()` エントリポイント + private ヘルパーメソッド
- **エラーハンドリング**: `Rails.logger.error("ClassName: #{e.class} - #{e.message}")` → カスタムエラーを raise
- **APIキー管理**: ファイルパスからの読み取り（`File.read(path).strip`）+ `Errno::ENOENT` キャッチ
- **テスト配置**: `spec/services/` にサービススペック、`spec/requests/api/` にリクエストスペック
- **HTTPモック**: WebMock の `stub_request(:post, url).to_return(status:, body:, headers:)`

---

## 2. 要件フィジビリティ分析

### 要件 → 技術ニーズのマッピング

| 要件 | 技術ニーズ | ギャップ状態 |
|------|-----------|-------------|
| Req 1: クエリ構築 | area/genre/keywordの文字列結合、priceLevelsパラメータ設定 | **対応可能** — ロジックのみ |
| Req 2: フィールドマスク | `X-Goog-FieldMask` ヘッダー設定 | **対応可能** — Faradayでカスタムヘッダー設定可能 |
| Req 3: レスポンス整形 | Google Places APIレスポンスのJSONパース・キーマッピング | **対応可能** — パターン確立済み |
| Req 4: 0件処理 | 空配列の返却 | **対応可能** — 単純なガード節 |
| Req 5: APIキー管理 | ファイル読み取り + `X-Goog-Api-Key` ヘッダー | **一部ギャップ** — docker-compose.yml にボリュームマウント追加が必要 |
| Req 6: エラーハンドリング | Faradayエラーキャッチ + GooglePlacesError | **対応可能** — QueryParserServiceと同パターン |

### 不足している要素

| 不足項目 | 種別 | 説明 |
|---------|------|------|
| `GooglePlacesService` クラス | Missing | 新規作成が必要 |
| `GooglePlacesError` クラス | Missing | 新規作成が必要（`QueryParserError` と同パターン） |
| `google_places_apikey` ボリュームマウント | Missing | `docker-compose.yml` に追加が必要 |
| Google Places API (New) のリクエスト/レスポンス仕様 | Research Needed | Text Search エンドポイントの正確なリクエスト形式・レスポンス構造を設計フェーズで確認 |

### 複雑性シグナル

- **外部API統合**: Google Places API (New) への HTTP POST リクエスト — 中程度の複雑性
- **データ変換**: Google API のキャメルケース → アプリ内のスネークケース変換 — 低複雑性
- **エラーハンドリング**: 複数のエラーパターン（4xx/5xx/ネットワーク/ファイル不在）— 低複雑性（パターン確立済み）

---

## 3. 実装アプローチの選択肢

### Option A: 既存コンポーネントの拡張
**該当なし** — GooglePlacesServiceは新しい外部APIとの統合であり、既存コンポーネントに該当する拡張先がない。

### Option B: 新規コンポーネントの作成 ✅ 推奨
**根拠**: GooglePlacesServiceはQueryParserServiceと明確に異なる責務（Google Places API呼び出し）を持ち、独立したサービスクラスとして作成するのが自然。

**作成ファイル**:

| ファイル | 責務 |
|---------|------|
| `backend/app/services/google_places_service.rb` | メインサービスクラス |
| `backend/app/services/google_places_error.rb` | カスタムエラークラス |
| `backend/spec/services/google_places_service_spec.rb` | サービステスト |

**統合ポイント**:
- 入力: `QueryParserService#call` の出力ハッシュ（`{ area:, genre:, price_level:, keyword: }`）
- 出力: 整形済み店舗ハッシュの配列 → `RecommendationService` の入力
- 呼び出し元: `Api::SearchController#create`（Chunk 6 で統合）

**インフラ変更**:

| ファイル | 変更内容 |
|---------|----------|
| `docker-compose.yml` | `./google_places_apikey:/google_places_apikey:ro` ボリュームマウント追加 |

**トレードオフ**:
- ✅ QueryParserServiceと同パターンで統一感がある
- ✅ 独立テストが容易
- ✅ SearchController統合（Chunk 6）がシンプルになる
- ❌ Faraday を直接使うため、ruby-openai のような専用クライアントgemに比べてボイラープレートが多い

### Option C: ハイブリッドアプローチ
**該当なし** — スコープが単一サービスクラスに収まるため不要。

---

## 4. 実装の複雑性とリスク

### 工数: S（1〜3日）
既存のサービスパターンに沿った実装で、Faraday も依存済み。外部API統合ではあるが、WebMock でのテストパターンが確立されている。

### リスク: Low
- 技術スタック: Faraday（既存依存）、RSpec + WebMock（確立済み）
- アーキテクチャ変更: なし。既存パターンの踏襲
- 統合影響: SearchController はスタブ段階のため、既存機能への影響なし

### 注意事項
- Google Places API (New) の Text Search リクエスト/レスポンスの正確な構造は設計フェーズで公式ドキュメントを参照して確定する（Research Needed）

---

## 5. 設計フェーズへの推奨事項

### 推奨アプローチ
**Option B（新規コンポーネント作成）** を採用。QueryParserService と同じサービスオブジェクトパターンに従う。

### 設計フェーズで確認すべき項目
1. Google Places API (New) Text Search の正確なリクエストボディ形式（`textQuery`, `priceLevels`, `languageCode` 等のパラメータ名・型）
2. Google Places API のレスポンス JSON 構造（`displayName.text` のネスト構造等）
3. Faraday の接続設定（タイムアウト値、リトライポリシーの要否）
