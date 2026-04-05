# ギャップ分析: tabelog-link-auto-generation

---

## 分析サマリー

- **スコープ**: `PlaceCard.tsx` 単体の変更で完結するフロントエンドのみの機能
- **主な実装内容**: URL 生成ロジック（純粋関数）＋ JSX へのリンク追加
- **外部依存**: なし（`encodeURIComponent` はブラウザ標準）
- **推奨アプローチ**: Option A（既存コンポーネントの拡張）—— 追加の型変更・ファイル追加不要
- **工数 / リスク**: S（1〜3日）/ Low

---

## 1. 現状調査

### 対象ファイル

| ファイル | 役割 | 変更要否 |
|---|---|---|
| `frontend/src/components/PlaceCard.tsx` | 各店舗カードの表示コンポーネント | **要変更** |
| `frontend/src/components/PlaceCard.test.tsx` | PlaceCard のユニットテスト | **要追加** |
| `frontend/src/types/search.ts` | `Recommendation` 型定義 | 変更不要 |
| `frontend/src/components/RecommendationList.tsx` | PlaceCard のリスト表示 | 変更不要 |

### 既存 PlaceCard の構造（PlaceCard.tsx:17-37）

```
props: { name, rating, price_level, address, google_maps_url, reason }
         ^^^^
         食べログ URL 生成に直接利用可能（追加 prop 不要）

内部ロジック:
  formatPriceLevel(priceLevel)  ← 純粋関数パターン（今回も同様に追加）
  safeMapsUrl（XSS対策のURL検証）

JSX構造:
  <div>
    <h3> name </h3>
    <p>  address </p>
    <p>  reason  </p>
    <div> バッジ（rating / price_level）</div>
    <a>  Google Mapsで見る  </a>   ← 食べログリンクを並列追加
  </div>
```

### 確認済みパターン（再利用可能）

- `target="_blank" rel="noopener noreferrer"` パターンが Google Maps リンクで実装済み
- 条件付きレンダリング（`{rating !== null && ...}`）パターンが確立済み
- 純粋関数（`formatPriceLevel`）をコンポーネントファイル内に定義するパターンが確立済み

---

## 2. 要件フィージビリティ分析

### 要件 → 技術マッピング

| 要件 | 技術ニーズ | ギャップ判定 |
|---|---|---|
| 要件1-1: 各カードにリンク表示 | JSX への `<a>` 追加 | **Missing**（未実装） |
| 要件1-2: 視覚的区別 | Tailwind CSS クラス設計 | **Missing**（スタイル検討が必要） |
| 要件1-3: Google Maps リンクと並列表示 | レイアウト調整 | **Missing**（JSX 構造変更が必要） |
| 要件1-4: 0件時は非表示 | 親コンポーネント制御 | **制約**（RecommendationList が空配列時に PlaceCard 自体を描画しないため、自動的に満たされる） |
| 要件2-1: URL 生成ロジック | `encodeURIComponent` 使用 | **Missing**（未実装） |
| 要件2-2: 日本語・記号のエンコード | `encodeURIComponent` で対応 | **対応可**（ブラウザ標準機能） |
| 要件2-3: 新潟県固定 URL | テンプレート文字列 | **対応可** |
| 要件2-4: 空文字/undefined 時は非表示 | 空文字チェック | **Missing**（現状 `name` は `string` 型で null 非許容だが空文字チェックが未実装） |
| 要件3-1: 新タブで開く | `target="_blank"` | **対応可**（既存パターンの再利用） |
| 要件3-2: `rel="noopener noreferrer"` | 既存パターン | **対応可**（既存パターンの再利用） |
| 要件3-3: リンクテキスト「食べログで見る」 | JSX テキスト | **Missing**（未実装） |

### 制約

- `Recommendation` 型（`types/search.ts:5-12`）の `name` は `string` 型（null 非許容）。空文字チェックのみ追加が必要で、型定義の変更は不要。
- `RecommendationList.tsx` は `recommendations` が空配列の場合、自動的に PlaceCard を描画しないため、要件1-4（0件時非表示）は構造上すでに満たされている。

---

## 3. 実装アプローチ比較

### Option A: PlaceCard.tsx を直接拡張（推奨）

**変更箇所**:
1. `PlaceCard.tsx` — URL 生成純粋関数を追加、JSX に食べログリンクを追加
2. `PlaceCard.test.tsx` — 食べログリンク関連テストを追加

**実装イメージ**:
```typescript
// 追加する純粋関数（formatPriceLevel と同パターン）
function buildTabelogUrl(name: string): string | null {
  if (!name) return null;
  return `https://tabelog.com/niigata/rstLst/?vs=1&sk=${encodeURIComponent(name)}`;
}

// JSX に追加
const tabelogUrl = buildTabelogUrl(name);
// ...
{tabelogUrl && (
  <a href={tabelogUrl} target="_blank" rel="noopener noreferrer" className="...">
    食べログで見る
  </a>
)}
```

**トレードオフ**:
- ✅ 追加ファイルゼロ、既存パターン（`formatPriceLevel`）に完全準拠
- ✅ `name` は既存 props のため型変更不要
- ✅ テストも既存構造に沿って追加可能
- ❌ URL 生成ロジックが PlaceCard 専用に閉じており、他コンポーネントからの再利用は考慮しない

### Option B: 新規ユーティリティ関数として切り出し

**変更箇所**:
1. `frontend/src/utils/tabelogUrl.ts` — URL 生成ロジック（新規）
2. `PlaceCard.tsx` — ユーティリティを import して使用
3. `frontend/src/utils/tabelogUrl.test.ts` — ユーティリティの単体テスト（新規）

**トレードオフ**:
- ✅ 純粋関数として独立してテスト可能
- ✅ 将来他コンポーネントで同様の URL を生成する場合に再利用可能
- ❌ 今回の要件では単一コンポーネントのみの利用であり、過剰な抽象化
- ❌ `src/utils/` ディレクトリが現在存在せず、新規ディレクトリ追加が必要

### Option C: ハイブリッド（現時点では不要）

現状の機能スコープでは A/B の選択で十分であり、ハイブリッドアプローチの必要性はない。

---

## 4. 複雑度・リスク評価

| 項目 | 評価 | 根拠 |
|---|---|---|
| **工数** | **S（1〜3日）** | 変更は PlaceCard.tsx 1ファイル + テスト追加のみ。外部依存なし |
| **リスク** | **Low** | 既存パターンの拡張のみ。バックエンド変更不要。既存機能への影響なし |

---

## 5. 設計フェーズへの推奨事項

### 推奨アプローチ

**Option A（PlaceCard.tsx の直接拡張）**

理由: 変更規模が小さく（1ファイル）、既存の `formatPriceLevel` と同じ純粋関数パターンで URL 生成ロジックを追加でき、コードの一貫性が保たれる。

### 設計フェーズで決定すべき事項

1. **スタイリング方針**: 食べログリンクを Google Maps リンクと横並び（`flex`）にするか、縦並びにするか（要件1-3の「レイアウトが崩れない」の具体化）
2. **リンクの視覚的区別**: 食べログリンクに独自カラー（例: `text-orange-500`）を使うか、Google Maps リンクと同一スタイルにするか

### Research Needed

- なし（すべて既知の技術で対応可能）
