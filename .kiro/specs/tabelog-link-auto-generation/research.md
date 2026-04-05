# リサーチ・設計判断ログ

---
**Purpose**: ディスカバリーフェーズの調査記録、設計判断の根拠、および将来の参照用エビデンスを記録する。

---

## Summary

- **Feature**: `tabelog-link-auto-generation`
- **Discovery Scope**: Simple Addition（既存 `PlaceCard` コンポーネントへの UI 拡張）
- **Key Findings**:
  1. 食べログ検索 URL はフロントエンドのみで生成可能（`encodeURIComponent` はブラウザ標準 API）。バックエンド変更不要
  2. 変更対象は `PlaceCard.tsx` 単一ファイル。型定義・API 通信・バックエンドへの影響ゼロ
  3. 既存の `formatPriceLevel` 純粋関数パターンおよび `target="_blank" rel="noopener noreferrer"` リンクパターンをそのまま踏襲可能

---

## Research Log

### 食べログ検索 URL の構造確認

- **Context**: 要件 2.1 で指定された URL 形式の妥当性確認と `encodeURIComponent` の動作検証
- **Sources Consulted**: `requirements.md`（要件 2.1〜2.3）
- **Findings**:
  - 食べログ新潟の店舗一覧検索エンドポイントは `https://tabelog.com/niigata/rstLst/` 固定
  - `vs=1` パラメータは「店名で検索」モードを示す
  - `sk=` パラメータに `encodeURIComponent(店名)` を付与することで日本語店名を安全に URL エンコードできる
  - `encodeURIComponent` はスペース→`%20`、全角文字→`%EF%BC%...` 等に変換（WHATWG URL 仕様準拠）
  - 記号（`&`, `#`, `=` 等）も安全にエンコードされるため二重エンコードのリスクなし
- **Implications**: ブラウザネイティブ API のみで要件 2.1〜2.3 を満たせる。外部ライブラリ不要

### 既存 PlaceCard コンポーネントの統合分析

- **Context**: 変更対象コンポーネントの現状把握と統合ポイント特定
- **Sources Consulted**: `frontend/src/components/PlaceCard.tsx`、`frontend/src/types/search.ts`、`gap-analysis.md`
- **Findings**:
  - `PlaceCard` は `Recommendation` 型を Props として受け取る（`name: string`、非 nullable）
  - 既存 Google Maps リンクは `className="block mt-2 text-blue-600 ..."` で `block` 表示
  - `formatPriceLevel` という純粋関数をファイル内モジュールスコープに定義するパターンが確立済み
  - 条件付きレンダリング `{rating !== null && <span>...}` パターンが確立済み
  - `name` は `string` 型（undefined は来ない）。空文字チェックのみ追加が必要
- **Implications**:
  - Props 変更不要
  - `buildTabelogSearchUrl` は `formatPriceLevel` と同パターンでファイル内定義が適切
  - Google Maps リンクと食べログリンクを `div` で囲み `flex flex-wrap gap-3` にすることで並列表示と折り返しを実現

### URL 生成関数の配置オプション評価

- **Context**: URL 生成ロジックの配置方針の決定（PlaceCard 内 vs. 外部ユーティリティ）
- **Sources Consulted**: `.kiro/steering/structure.md`（フロントエンド構造）、`.kiro/steering/tech.md`（技術設計方針）
- **Findings**:
  - `src/utils/` ディレクトリは現存しない
  - steering「フロントエンドのビジネスロジックはコンポーネントから分離」は複数コンポーネント間共有の文脈であり単一利用には非該当
  - CLAUDE.md「三行同じコードが揃うまで抽象化しない」原則に合致するのは PlaceCard 内インライン配置
- **Implications**: `buildTabelogSearchUrl` は `PlaceCard.tsx` 内モジュールスコープ関数として配置。`gap-analysis.md` の Option A を採用

### スタイリング方針（要件 1.2・1.3）

- **Context**: 食べログリンクと Google Maps リンクの並列表示とビジュアル区別の設計
- **Sources Consulted**: `frontend/src/components/PlaceCard.tsx`（既存スタイル）、`.kiro/steering/tech.md`（Tailwind CSS v4）
- **Findings**:
  - 既存 Google Maps リンクの色: `text-blue-600`
  - Tabelog ブランドカラーはオレンジ系。`text-orange-500` が視覚的区別として適切
  - `div.flex.flex-wrap.gap-3.mt-2` でラップすることで両リンクを横並び表示し、長い場合は折り返し可能
- **Implications**: 要件 1.2（視覚的区別）は色クラスで、要件 1.3（レイアウト崩れなし）は `flex-wrap` で対応

---

## Architecture Pattern Evaluation

| Option | Description | Strengths | Risks / Limitations | Notes |
|--------|-------------|-----------|---------------------|-------|
| PlaceCard インライン関数（選択） | `buildTabelogSearchUrl` を `PlaceCard.tsx` 内に定義 | ファイル増加なし・既存パターンと一致・変更スコープ最小 | 他コンポーネントで使う場合は移動が必要 | `gap-analysis.md` Option A に対応 |
| `src/utils/` 外部モジュール | 独立ファイルとして分離 | 再利用性向上 | `utils/` ディレクトリ新設・現時点では過剰設計 | Steering の「不要な抽象化を避ける」原則に反する |

---

## Design Decisions

### Decision: `buildTabelogSearchUrl` の配置

- **Context**: URL 生成ロジックを PlaceCard 内に置くかユーティリティモジュールに分離するか
- **Alternatives Considered**:
  1. `PlaceCard.tsx` 内モジュールスコープ関数 — 単一利用・既存 `formatPriceLevel` と同パターン
  2. `src/utils/tabelogUrl.ts` への分離 — 再利用性優先
- **Selected Approach**: `PlaceCard.tsx` 内インライン配置
- **Rationale**: 現時点では `PlaceCard` のみが使用する関数。steering および CLAUDE.md の「推測的な抽象化をしない」方針に合致
- **Trade-offs**: 将来別コンポーネントで使う場合は移動が必要（低リスク・容易）
- **Follow-up**: 他コンポーネントで同一ロジックが必要になった時点で `src/utils/` へ移動を検討

### Decision: 空文字・undefined ガードの戦略

- **Context**: 要件 2.4「店名が空文字または undefined の場合はリンクを表示しない」への対応
- **Alternatives Considered**:
  1. `name.trim() === ''` のみ — TypeScript の型保証（`string` 非 nullable）を信頼
  2. `name == null || name.trim() === ''` — 防御的チェック
- **Selected Approach**: `name.trim() === ''` チェックのみ
- **Rationale**: TypeScript strict モードで `Recommendation.name` が `string` 型保証されており、`undefined` チェックは型定義との乖離を招く
- **Trade-offs**: `Recommendation` 型が変更された場合は修正必要（TypeScript コンパイラが検出）
- **Follow-up**: `types/search.ts` 変更時に確認

### Decision: リンクレイアウト（横並び vs. 縦並び）

- **Context**: Google Maps リンクと食べログリンクの配置方式
- **Alternatives Considered**:
  1. `flex flex-wrap gap-3` — 横並び、画面幅が狭い場合は折り返し
  2. 縦並び（`block` × 2） — シンプルだが画面スペースを使う
- **Selected Approach**: `div.flex.flex-wrap.gap-3.mt-2` でラップして横並び
- **Rationale**: 要件 1.3「レイアウトが崩れないようにする」に `flex-wrap` が適合。Google Maps リンクの現在の `mt-2` を div に移動するのみで変更最小
- **Trade-offs**: JSX 構造の微小変更が必要（既存 `<a>` の `block` クラスと `mt-2` を div に移動）
- **Follow-up**: テストで両リンクの同時表示を確認

---

## Risks & Mitigations

- **食べログ URL 形式の仕様変更** → URL テンプレートは `buildTabelogSearchUrl` 関数の定数部分のみ。変更箇所が1箇所に集約されているため対応容易
- **特殊文字の二重エンコード** → `encodeURIComponent` の単一適用で対処済み。ユーザー入力はバックエンド側で処理済みの店名が渡るため、追加エンコードは不要

---

## References

- MDN Web Docs: `encodeURIComponent` — パーセントエンコードの動作仕様
- `gap-analysis.md` — 既存コードの詳細分析と Option A/B 比較
- `requirements.md` — 要件 2.1〜2.3: URL 形式の仕様
