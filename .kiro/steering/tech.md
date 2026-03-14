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
- **テスト**: Vitest 3 + jsdom + Testing Library
- **パッケージマネージャ**: pnpm

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

## データベース

- MySQL 8.4
- 接続情報は環境変数（`DATABASE_HOST`, `DATABASE_USER`, `DATABASE_PASSWORD`）で管理

## 主要技術的決定

- **疎結合構成**: フロントとバックは独立して開発・デプロイ可能
- **Docker First**: ローカル開発も本番も Docker Compose を基本とする
- **型安全優先**: TypeScript strict モードで型エラーを設計段階で検出
- **Solid スタック**: Rails 8 のデフォルト（DB-backed cache/queue/cable）を採用

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
```
