# テクノロジースタック

## アーキテクチャ

フロントエンドとバックエンドを疎結合に分離したフルスタック構成。Docker Composeで全サービスをオーケストレーション。

```
frontend (React) ←→ backend (Rails API) ←→ db (MySQL)
port 5175              port 3001               port 3306
```

## フロントエンド

- **言語**: TypeScript 5（strict モード）
- **フレームワーク**: React 19
- **ビルドツール**: Vite 6
- **スタイリング**: Tailwind CSS v4（`@tailwindcss/vite` プラグイン）
- **地図**: `@vis.gl/react-google-maps`（Google Maps表示）
- **テスト**: Vitest 3 + jsdom + Testing Library
- **パッケージマネージャ**: pnpm

### フロントエンド実装パターン
- 画面状態のオーケストレーションは現状 `App.tsx` に集約し、表示責務は `src/components/` に分離
- API クライアントは `src/api/` にエンドポイント単位で配置し、`fetch` で `/api/search`・`/api/omakase`・`/api/refine` を呼び出す
- 追加要望による再レコメンドは独立した `refine` API として扱い、初回検索と同じレスポンス形を保つ
- 検索モードは `SearchMode = 'izakaya' | 'ramen'` として型で管理し、タブ状態・API リクエスト・履歴キーを同じモード値でそろえる
- ラーメン向け距離条件は `TravelTime` 型（`within_30min` / `within_1hour` / `1_to_2_hours`）で扱い、未指定時はリクエスト body から `travel_time` を省く

### TypeScript 設定
`strict: true`に加えて以下を有効化：
- `noUnusedLocals` / `noUnusedParameters`
- `noFallthroughCasesInSwitch`
- `noUncheckedSideEffectImports`

### テスト規約
- Vitest globals 有効（`describe`/`it`/`expect` をインポート不要）
- セットアップファイル: `src/test/setup.ts`（jest-dom を import）
- テスト実行: `docker compose exec frontend pnpm test --run`

## バックエンド

- **言語**: Ruby（Rails 8.1）
- **フレームワーク**: Ruby on Rails 8.1
- **DBアダプタ**: mysql2 / Active Record
- **Webサーバ**: Puma + Thruster
- **JSON**: jbuilder
- **バックグラウンド処理**: Solid Queue / Solid Cache / Solid Cable

### コード品質
- Linter: RuboCop（rubocop-rails-omakase ベース）
- セキュリティ: Brakeman + bundler-audit
- オーバーライド: `backend/.rubocop.yml`

### テスト
- RSpec Rails（`rspec-rails ~> 7.0`）
- HTTP スタブ: Webmock（外部APIのモック）

### 外部API統合
- **OpenAI API**（`ruby-openai ~> 8.3` gem）: 自然文解析・推薦生成に使用。自然文解析モデル: `gpt-5-nano`、推薦モデル: `gpt-5.4-nano`
- **Google Places API**（Faraday で直接HTTP）: テキスト検索で店舗を取得

### API 応答パターン
- Rails API は `render json:` を使う薄いエンドポイントとして実装
- 検索系エンドポイントは `recommendations` / `other_candidates` / `parsed_conditions` を共通レスポンス形として返す
- `mode=ramen` では `parsed_conditions.genre` を必ず「ラーメン」に固定し、味・種類は `keyword` に寄せる
- ラーメン検索・ラーメンおまかせでは候補に `distance_km` を付与できる。緯度経度がない候補は `distance_km: nil` として扱う
- 外部API失敗は `502 Bad Gateway`、入力不正は `422 Unprocessable Content` を返す

### 距離計算
- 自宅起点の緯度経度は `backend/config/initializers/home_location.rb` の `HOME_LOCATION` で管理する
- 距離は `DistanceCalculatorService` の Haversine 公式による直線距離で概算し、正確な移動時間 API には依存しない
- `travel_time` の距離帯は検索コントローラーと `RamenOmakaseService` で同じ列挙値を使う

### APIキー管理
- APIキーはファイルとして Docker ボリュームマウント: `/openai_apikey`, `/google_places_apikey`
- コードはファイルから `File.read(API_KEY_PATH).strip` で読み込む
- キーファイルはホストの `./openai_apikey`, `./google_places_apikey` に配置（git 管理外）

## データベース

- MySQL 8.4
- 接続情報は環境変数（`DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`）で管理

## 主要技術的決定

- **疎結合構成**: フロントとバックは独立して開発・デプロイ可能
- **Docker First**: ローカル開発も本番も Docker Compose を基本とする
- **型安全優先**: TypeScript strict モードで型エラーを設計段階で検出
- **Solid スタック**: Rails 8 のデフォルト（DB-backed cache/queue/cable）を採用
- **Service Object パターン**: 外部API処理は `app/services/` に分離、`.new.call(args)` 形式で呼び出す
- **モードパラメータ方式**: ラーメンなど近い検索体験は新規パイプラインを丸ごと複製せず、`mode` とサービス内プロンプト分岐で拡張する
- **コントローラーで直接 JSON レンダリング**: jbuilder ビューは使わず `render json:` を使用
- **Vite プロキシ**: フロントの `/api` → バックエンドコンテナ（`http://backend:3000`）に転送

## 開発コマンド

```bash
# 全サービス起動
docker compose up

# フロントエンド
docker compose exec frontend pnpm test --run  # テスト
docker compose exec frontend pnpm build       # ビルド

# バックエンド
docker compose exec backend bin/rubocop       # Lint
docker compose exec backend bin/brakeman --no-pager  # セキュリティ
docker compose exec backend rails db:migrate  # マイグレーション
docker compose exec backend bundle exec rspec # テスト
```
_updated_at: 2026-04-25 (sync: ラーメンモード・距離計算・推薦モデル更新を反映)_
