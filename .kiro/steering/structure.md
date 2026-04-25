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

### フロントエンドの責務分離
- 現状は `App.tsx` が検索・おまかせ・再レコメンド・地図選択の状態をまとめて管理するルートコンポーネント
- 検索モード（居酒屋・バー / ラーメン）と距離条件は `App.tsx` が保持し、タブ切り替え時に検索結果・選択中マーカー・距離条件をリセットする
- `src/components/` の部品は入力・一覧・地図・補助UIに分かれ、データ取得責務は持たない
- モード切り替え、距離フィルター、ラーメンおまかせなどの操作 UI は小さなコンポーネントとして `src/components/` に置き、API 呼び出しは `App.tsx` と `src/api/` に集約する
- API クライアントと UI テストは同階層に寄せる傾向があり、`src/api/*.test.ts` / `src/components/*.test.tsx` の形を取る

### テスト
**場所**: `frontend/src/test/`または各コンポーネントの隣（`*.test.tsx`）
**セットアップ**: `src/test/setup.ts` — jest-dom マッチャーの初期化

## バックエンド構造（`backend/`）

Rails 標準のレイヤードアーキテクチャに Service Object 層を追加した構成：

| ディレクトリ | 用途 |
|---|---|
| `app/controllers/api/base_controller.rb` | API コントローラの共通基底 |
| `app/controllers/api/` | API リクエスト処理（`render json:` で直接レスポンス） |
| `app/services/` | 外部API統合・ビジネスロジック（Service Object パターン） |
| `app/models/` | ドメインロジック・DB |
| `config/initializers/` | アプリ全体の静的設定（例: 自宅位置 `HOME_LOCATION`） |
| `config/routes.rb` | ルーティング定義（`namespace :api` 使用） |
| `db/migrate/` | スキーマ変更履歴 |

### Service Object パターン
- **配置**: `app/services/`
- **呼び出し**: `ServiceName.new.call(args)` 形式。テスタビリティのため依存をコンストラクタに注入する場合あり（例: `OmakaseService.new(random: rand)`）
- **モード分岐**: 近い機能差はサービス内で `mode` を受け取り、プロンプトや条件構築だけを分岐する（例: `QueryParserService`, `RecommendationService`）
- **距離系ロジック**: 地理計算は `DistanceCalculatorService` に分離し、エリア選定は `RamenOmakaseService` が担当する
- **エラークラス**: 原則は独立ファイル（例: `GooglePlacesError`）。単純なケースはサービス内インライン定義も可（例: `OmakaseService::UnknownArea = Class.new(StandardError)`）
- **コントローラーでの処理**: 各コントローラー内に `rescue_from` を直接定義してエラーハンドリング（`BaseController` は現在共通処理なし）

### API 構成パターン
- ルーティングは `namespace :api` 配下の明示的な POST エンドポイントで管理する
- 検索関連の API は「初回検索」「おまかせ」「再レコメンド」を別エンドポイントで分離し、フロント側の責務を明確にする。ラーメンなどの近い検索体験は同じエンドポイントに `mode` を渡して扱う
- 検索条件は `parsed_conditions` として明示的に返し、フロントはそのままタグ表示や再検索に再利用する
- ラーメンおまかせ後の再レコメンドでは `origin: 'ramen_omakase'` を使い、おまかせで選ばれたエリア文脈を維持する

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
- フロントとバックの通信は REST API（コントローラーで `render json:` を返す）
_updated_at: 2026-04-25 (sync: ラーメンモード・距離フィルター・サービス分担を反映)_
