# Research & Design Decisions

---
**Purpose**: Capture discovery findings, architectural investigations, and rationale that inform the technical design.

---

## Summary

- **Feature**: `frontend-api-client`
- **Discovery Scope**: Simple Addition（スキャフォールド段階のフロントエンドに新規モジュールを追加）
- **Key Findings**:
  - フロントエンドは `App.tsx` / `main.tsx` / `test/setup.ts` のみのスキャフォールド。`src/types/` と `src/api/` ディレクトリは未存在で、新規作成が必要
  - Vitest globals 有効・jsdom 環境設定済み。`fetch` はグローバルで利用可能なため、追加ライブラリなしで `vi.fn()` によるモックが可能
  - TypeScript strict モード（`noUnusedLocals`・`noUnusedParameters` 含む）が有効。`any` 型・オプショナル乱用は型エラーの原因になる
  - フロントエンド（5175）とバックエンド（3001）は別ポート。Vite dev server の proxy 設定で `/api` をバックエンドへフォワードする設計が必要

## Research Log

### fetch モックの方法（Vitest + jsdom）

- **Context**: テスト内で `fetch` をモックする方法の確認
- **Sources Consulted**: Vitest 公式ドキュメント、package.json の依存バージョン確認
- **Findings**:
  - Vitest は jsdom 環境で `globalThis.fetch` が利用可能
  - `vi.stubGlobal('fetch', vi.fn(...))` または `vi.spyOn(global, 'fetch')` でモック可能
  - `afterEach(() => vi.restoreAllMocks())` でテスト間の副作用を排除
  - 追加ライブラリ（`msw` 等）は不要。Vitest globals のみで完結
- **Implications**: `src/api/search.test.ts` において `vi.stubGlobal` パターンを採用する

### API URL 戦略（相対パス vs 絶対パス vs 環境変数）

- **Context**: フロントエンド（5175）からバックエンド（3001）への API 呼び出し URL の設計
- **Sources Consulted**: `docker-compose.yml`、`vite.config.ts` の現状確認
- **Findings**:
  - 現状の Vite config に `server.proxy` の設定なし
  - Docker Compose 内部ネットワークでは `http://backend:3000` でバックエンドに到達可能
  - ブラウザからは `http://localhost:3001/api/search` が正確だが、ハードコードは環境依存になる
  - Vite の `server.proxy` で `/api` → `http://backend:3000` にフォワードすれば、相対パス `/api/search` で統一できる
- **Implications**: `searchPlaces` 関数内は `/api/search` の相対パスを使用し、Vite dev server の proxy 設定を `vite.config.ts` に追加する。テスト時は fetch をモックするため URL は影響しない

### TypeScript 型設計：`null` vs オプショナル

- **Context**: `rating`, `photo_url` 等の省略可能フィールドを `field?: T` とすべきか `field: T | null` とすべきかの検討
- **Sources Consulted**: app-design.md の型定義セクション、TypeScript ベストプラクティス
- **Findings**:
  - `field?: T` は `undefined` を許容し、JSON デシリアライズ時にフィールド欠如と `null` を区別できない
  - バックエンドの JSON レスポンスでは `null` として明示的に返すことが一般的（Rails の `nil` は JSON で `null` になる）
  - `field: T | null` はフィールドが必ず存在するが値が `null` であることを明示し、型ガードが書きやすい
- **Implications**: app-design.md 準拠で `T | null` パターンを採用する

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| 型と API を同一ファイルに統合 | `src/api/search.ts` に型と関数を共置 | ファイル数が少ない | Chunk 8〜10 で型だけを import したい場合に循環依存リスク | 不採用 |
| 型と API を分離（採用） | `src/types/search.ts` + `src/api/search.ts` | app-design.md の設計に準拠。型は API 依存なし | ファイルが2つ増える | steering の構造原則に合致 |

## Design Decisions

### Decision: API ベース URL の管理方法

- **Context**: フロントエンドからバックエンドへの fetch URL をどう管理するか
- **Alternatives Considered**:
  1. 絶対 URL（`http://localhost:3001`）— 環境依存・ハードコード
  2. 環境変数（`import.meta.env.VITE_API_BASE_URL`）— 柔軟だが設定ファイルが増える
  3. 相対パス + Vite proxy — Docker Compose 内部でも動作、環境変数不要
- **Selected Approach**: 相対パス `/api/search` + `vite.config.ts` の `server.proxy` に `/api` → `http://backend:3000` を追加
- **Rationale**: テスト時は fetch をモックするため URL 形式は不問。Dev/本番共通で相対パスが使えるため、環境変数管理が不要になりシンプル
- **Trade-offs**: Vite proxy 設定の追加が必要。本番では Nginx 等のリバースプロキシでも同様のルーティングが必要
- **Follow-up**: バックエンド CORS 設定が不要になることを確認する

### Decision: テストファイルの配置場所

- **Context**: テストを `src/test/` 配下に集約するか、テスト対象ファイルと同階層に置くか
- **Alternatives Considered**:
  1. `src/test/api/search.test.ts` — テスト集約型
  2. `src/api/search.test.ts` — コロケーション型（同階層）
- **Selected Approach**: `src/api/search.test.ts`（コロケーション）
- **Rationale**: steering の構造原則（`*.test.ts(x)` を同階層）に準拠。変更箇所とテストが近いほど保守性が高い
- **Trade-offs**: テストファイルが機能ファイルと混在するが、`.test.ts` 拡張子で明確に区別できる

## Risks & Mitigations

- Vite proxy 未設定時は開発環境でブラウザからの API 呼び出しが CORS エラーになる — `vite.config.ts` の proxy 設定を本 Chunk に含める
- TypeScript `noUnusedParameters` が有効なため、`searchPlaces` の引数シグネチャを正確に定義しないとコンパイルエラー — 型定義を `types/search.ts` として先に固める
- jsdom の `fetch` は Vitest が提供するが、Node 環境のバージョンによって挙動が異なる場合がある — `vi.stubGlobal` で完全にモック制御する

## References

- app-design.md Section 7（フロントエンド設計）— 型定義の原典
- app-design.md Section 5（API設計）— リクエスト・レスポンス仕様
- Vitest 公式: https://vitest.dev/guide/mocking — fetch モックパターン
