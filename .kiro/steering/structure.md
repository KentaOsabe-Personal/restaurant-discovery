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
**レイヤー構成**（実装済み）:

| ディレクトリ | 用途 | 例 |
|---|---|---|
| `src/api/` | バックエンドAPIとの通信（fetch ベース） | `search.ts`, `omakase.ts` |
| `src/components/` | UIコンポーネント（PascalCase） | `SearchInput.tsx`, `PlaceCard.tsx` |
| `src/hooks/` | カスタムフック（`use` プレフィックス） | `useSearchHistory.ts` |
| `src/config/` | 静的設定データ（型定義付き） | `omakaseAreas.ts` |
| `src/types/` | 共有TypeScript型定義 | `search.ts` |

機能が増えたらフィーチャーファースト（`src/features/`）への移行も検討する。

### テスト
**場所**: `frontend/src/test/`または各コンポーネントの隣（`*.test.tsx`）
**セットアップ**: `src/test/setup.ts` — jest-dom マッチャーの初期化

## バックエンド構造（`backend/`）

Rails 標準のレイヤードアーキテクチャに Service Object 層を追加した構成：

| ディレクトリ | 用途 |
|---|---|
| `app/controllers/api/` | API リクエスト処理（`render json:` で直接レスポンス） |
| `app/services/` | 外部API統合・ビジネスロジック（Service Object パターン） |
| `app/models/` | ドメインロジック・DB |
| `config/routes.rb` | ルーティング定義（`namespace :api` 使用） |
| `db/migrate/` | スキーマ変更履歴 |

### Service Object パターン
- **配置**: `app/services/`
- **呼び出し**: `ServiceName.new.call(args)` 形式。テスタビリティのため依存をコンストラクタに注入する場合あり（例: `OmakaseService.new(random: rand)`）
- **エラークラス**: 原則は独立ファイル（例: `GooglePlacesError`）。単純なケースはサービス内インライン定義も可（例: `OmakaseService::UnknownArea = Class.new(StandardError)`）
- **コントローラーでの処理**: 各コントローラー内に `rescue_from` を直接定義してエラーハンドリング（`BaseController` は現在共通処理なし）

## 命名規則

### フロントエンド
- **コンポーネントファイル**: PascalCase（例: `RestaurantCard.tsx`）
- **フック**: camelCase + `use` プレフィックス（例: `useRestaurants.ts`）
- **ユーティリティ/型**: camelCase または kebab-case
- **テストファイル**: `*.test.ts(x)` を同階層に配置

### バックエンド
- Rails 規約に準拠（snake_case ファイル名、PascalCase クラス名）
- API コントローラは `Api::` 名前空間を使用（例: `Api::SearchController`）
- Service は `PascalCaseService` 命名、エラークラスは `PascalCaseError`

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
