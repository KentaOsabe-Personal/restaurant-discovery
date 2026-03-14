# プロジェクト構造

## 構成哲学

フロントエンドとバックエンドを完全に分離したモノレポ構成。各サービスは独立したルートディレクトリを持つ。

```
restaurant-discovery/
├── frontend/   # React アプリ（独立したNode.jsプロジェクト）
├── backend/    # Rails アプリ（独立したRubyプロジェクト）
└── docker-compose.yml
```

## フロントエンド構造（`frontend/`）

### ソースコード
**場所**: `frontend/src/`
**原則**: 機能が増えたらフィーチャーファースト（`src/features/`）またはレイヤー構成（`src/components/`, `src/hooks/`, `src/api/`）で整理する
**現状**: スキャフォールド段階（`App.tsx`, `main.tsx` のみ）

### テスト
**場所**: `frontend/src/test/`または各コンポーネントの隣（`*.test.tsx`）
**セットアップ**: `src/test/setup.ts` — jest-dom マッチャーの初期化

## バックエンド構造（`backend/`）

Rails 標準のレイヤードアーキテクチャに従う：

| ディレクトリ | 用途 |
|---|---|
| `app/controllers/` | リクエスト処理・レスポンス |
| `app/models/` | ドメインロジック・DB |
| `app/views/` | Jbuilder テンプレート（JSON）|
| `config/routes.rb` | ルーティング定義 |
| `db/migrate/` | スキーマ変更履歴 |

## 命名規則

### フロントエンド
- **コンポーネントファイル**: PascalCase（例: `RestaurantCard.tsx`）
- **フック**: camelCase + `use` プレフィックス（例: `useRestaurants.ts`）
- **ユーティリティ/型**: camelCase または kebab-case
- **テストファイル**: `*.test.ts(x)` を同階層に配置

### バックエンド
- Rails 規約に準拠（snake_case ファイル名、PascalCase クラス名）
- API コントローラは `Api::` 名前空間を使用予定（例: `Api::V1::RestaurantsController`）

## インポート規則（フロントエンド）

現在パスエイリアスは未設定。追加時は `vite.config.ts` と `tsconfig.json` を同時に更新すること。

```typescript
// 相対パス（現状）
import { Component } from './Component'
import { helper } from '../utils/helper'

// エイリアス追加後（推奨パターン）
import { Component } from '@/components/Component'
```

## コード組織原則

- フロントエンドのビジネスロジックはコンポーネントから分離（カスタムフック・サービス層）
- バックエンドはコントローラを薄く保ち、ロジックはモデルまたはサービスオブジェクトへ
- フロントとバックの通信は REST API（Jbuilder でJSON整形）
