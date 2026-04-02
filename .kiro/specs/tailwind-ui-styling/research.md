# リサーチ・設計決定ログ

---
**Purpose**: Tailwind CSS UI スタイリングフィーチャーのディスカバリー結果と設計根拠を記録する。

---

## Summary

- **Feature**: `tailwind-ui-styling`
- **Discovery Scope**: Extension（既存システムへのスタイリング拡張）
- **Key Findings**:
  - Tailwind CSS v4 は `@tailwindcss/vite` プラグインによりゼロコンフィグで Vite 6 に統合可能。`tailwind.config.js` 不要。
  - `frontend/src/index.css` が未存在のため新規作成が必要。`main.tsx` に CSS インポートの追加が必要。
  - 既存テストは DOM の機能（`disabled` 属性・aria 属性・テキスト内容）を検証しており、`className` 追加による既存テストへの影響はゼロ。

---

## Research Log

### Tailwind CSS v4 + Vite 6 の統合パターン

- **Context**: 既存の Vite 6 プロジェクトに Tailwind CSS を追加する最適な方法の確認
- **Sources Consulted**: Tailwind CSS v4 公式ドキュメント（Vite インストールガイド）
- **Findings**:
  - v4 では `@tailwindcss/vite` プラグインを使用。v3 の `@tailwindcss/postcss` + `postcss.config.js` は不要。
  - `vite.config.ts` の `plugins` 配列に `tailwindcss()` を追加（`@vitejs/plugin-react` との共存可能）。
  - グローバル CSS ファイルに `@import "tailwindcss"` を記述することで全ユーティリティクラスが有効化される。
  - v4 は JIT（Just-In-Time）がデフォルト。コンテンツスキャンも自動化されており、設定ファイルは不要。
  - `devDependencies` に追加するパッケージは `tailwindcss` と `@tailwindcss/vite` の2つ。
- **Implications**: 設定ファイル不要でセットアップが最小限。既存のビルドパイプラインへの侵食が最小。

### 既存コンポーネントのスタイリング統合ポイント分析

- **Context**: 既存 React コンポーネントに `className` を追加する際の影響範囲確認
- **Sources Consulted**: コードベース分析（`App.tsx`, `SearchInput.tsx`, `PlaceCard.tsx`, `RecommendationList.tsx`, テストファイル群）
- **Findings**:
  - 全コンポーネントは現在 `className` 属性なしのスキャフォールド状態。
  - `SearchInput.tsx` は `disabled` 属性で無効状態を制御済み。Tailwind の `disabled:` バリアントをネイティブ活用可能。
  - `PlaceCard.tsx` は `rating`/`price_level` の null チェック済み。バッジ表示はインライン条件レンダリングで対応できる。
  - `App.tsx` の状態管理（`isLoading`/`error`/`recommendations`）は完全に保持。スタイリング変更のみ。
  - 既存テストはすべて `disabled`・`aria-busy`・テキスト内容・ロール属性を検証しており、`className` 変更に非依存。
- **Implications**: 既存ロジックへの変更なし。`className` の追加と `index.css` 新規作成のみで要件を満たせる。

### レスポンシブブレークポイント設計

- **Context**: 要件 5 の 2/3 カラムグリッドと要件 2/3 のモバイル対応に必要なブレークポイント確認
- **Sources Consulted**: Tailwind CSS v4 ブレークポイント仕様
- **Findings**:
  - `md:` → 768px 以上（タブレット）
  - `lg:` → 1024px 以上（デスクトップ）
  - デフォルト（プレフィックスなし）はモバイルファースト（〜767px）
- **Implications**: 要件の「モバイル〜767px」「768px〜」「1024px〜」が Tailwind の `md:`/`lg:` に直接マッピング可能。追加の設定不要。

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| Tailwind CSS v4 + `@tailwindcss/vite` | ゼロコンフィグの Vite プラグイン統合 | 設定最小・JIT 自動・Vite 6 ネイティブ | v4 は v3 と一部 API 差異あり | 要件 1.1〜1.3 に直接対応 |
| Tailwind CSS v3 + PostCSS | `tailwind.config.js` + `postcss.config.js` 経由 | 実績豊富 | 設定ファイルが増加・v4 より冗長 | 要件が `@tailwindcss/vite` を明示 |
| CSS Modules | コンポーネントスコープ CSS | 既存パターンとして一般的 | ユーティリティファーストでない | 要件がTailwindを明示指定 |

---

## Design Decisions

### Decision: Tailwind CSS v4 の採用

- **Context**: 要件 1.1 が `@tailwindcss/vite` および `tailwindcss` パッケージを明示。最新 v4 系の採用。
- **Alternatives Considered**:
  1. Tailwind CSS v3 — `tailwind.config.js` が必要、PostCSS 経由で設定が複雑
  2. Tailwind CSS v4 — `@tailwindcss/vite` で Vite ネイティブ統合、設定ファイル不要
- **Selected Approach**: Tailwind CSS v4（`@tailwindcss/vite` + `tailwindcss`）
- **Rationale**: Vite 6 との親和性が高く、設定の最小化がプロジェクトのシンプルさと一致する。要件が明示的にこのパッケージを指定している。
- **Trade-offs**: v4 は v3 より新しいが、公式ドキュメントが整備されており実装リスクは低い。
- **Follow-up**: `pnpm build` と `pnpm test --run` での動作確認が必須。

### Decision: `index.css` 新規作成 + `main.tsx` へのインポート追加

- **Context**: `main.tsx` に CSS インポートがなく、`index.css` も存在しない。
- **Alternatives Considered**:
  1. `App.tsx` 内で直接インポート — グローバルスタイルをコンポーネントに依存させるのは不適切
  2. `index.css` を新規作成し `main.tsx` からインポート — Vite + Tailwind の標準パターン
- **Selected Approach**: `frontend/src/index.css` を新規作成し、`main.tsx` の先頭からインポート
- **Rationale**: Vite + React + Tailwind プロジェクトの標準構造に準拠する。グローバルスタイルはアプリエントリポイントで管理するのが責務分離として適切。
- **Trade-offs**: なし。新規ファイル1件の追加のみ。
- **Follow-up**: `main.tsx` の変更が既存テストに影響しないことを `pnpm test --run` で確認。

---

## Risks & Mitigations

- Tailwind v4 と Vite 6 の互換性 — `@tailwindcss/vite` は Vite 6 対応済み。pnpm インストール後に `pnpm build` で即座に確認可能。
- 既存テストへの影響 — テストは DOM の機能（テキスト内容・aria 属性・`disabled`）を検証しており、`className` 変更はテスト非依存。リスクなし。
- Tailwind v4 の `@import "tailwindcss"` CSS 構文 — v4 は PostCSS 不要のネイティブ CSS @import を採用。`vite.config.ts` のプラグイン経由で処理される。
- `main.tsx` の変更による副作用 — インポート追加のみでロジック変更なし。副作用リスクはない。

---

## References

- Tailwind CSS v4 Vite Installation — [tailwindcss.com/docs/installation/vite](https://tailwindcss.com/docs/installation/vite)
- Tailwind CSS v4 ブレークポイント — tailwindcss.com/docs/responsive-design
- Vite 6 プラグイン API — vitejs.dev/guide/api-plugin
