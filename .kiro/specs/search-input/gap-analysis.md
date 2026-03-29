# ギャップ分析: search-input

## 1. 現状調査

### 既存ファイル構成

```
frontend/src/
├── main.tsx                  # エントリポイント（StrictMode + createRoot）
├── App.tsx                   # 最小スキャフォールド（<div>のみ）
├── types/
│   └── search.ts             # 型定義（SearchRequest / SearchResponse / Recommendation など）
├── api/
│   ├── search.ts             # searchPlaces() 実装済み
│   └── search.test.ts        # Vitest テスト済み（vi.stubGlobal fetch モック）
└── test/
    └── setup.ts              # @testing-library/jest-dom import 済み
```

`frontend/src/components/` ディレクトリは**存在しない**（未作成）。

### 既存パターン・規約の抽出

| 観点 | 現状 |
|---|---|
| テストスタイル | `vi.stubGlobal('fetch', vi.fn())` パターン、`describe/it/expect` はグローバル |
| テストファイル配置 | `*.test.ts` を同階層（`api/search.test.ts`）に配置 |
| TypeScript | `strict` モード、型は `src/types/` に集約 |
| インポート | 相対パスのみ（パスエイリアス未設定） |
| コンポーネント命名 | PascalCase（steering 規約による） |
| テストセットアップ | `src/test/setup.ts` → `@testing-library/jest-dom` 初期化済み |

### テストインフラ確認

```json
devDependencies:
  "@testing-library/jest-dom": "^6.6.3"   ✅ インストール済み
  "@testing-library/react": "^16.3.0"     ✅ インストール済み
  "vitest": "^3.2.4"                       ✅
  "jsdom": "^26.1.0"                       ✅
```

`vite.config.ts` の `test.globals: true` / `environment: "jsdom"` / `setupFiles` も設定済み。

---

## 2. 要件実現可能性分析

### 技術的必要要素と既存資産マッピング

| 要件 | 必要なもの | 現状 | ステータス |
|---|---|---|---|
| Req 1: テキスト入力・ボタン表示 | React コンポーネント | なし | **Missing** |
| Req 2: 送信ボタン disabled 制御 | useState（入力値管理） | なし | **Missing** |
| Req 3: isLoading 状態制御 | Props 受け取り + 条件レンダリング | なし | **Missing** |
| Req 4: onSubmit コールバック | Props + イベントハンドラ | なし | **Missing** |
| Req 5: Props インターフェース | TypeScript 型定義 | `types/search.ts` 参照可 | **Missing（コンポーネント Props 型）** |
| Req 6: アクセシビリティ | aria-label / semantic HTML | なし | **Missing** |
| コンポーネントテスト | `@testing-library/react` | インストール済み | ✅ 利用可能 |
| テスト環境 | jsdom + Vitest globals | 設定済み | ✅ 利用可能 |

### ギャップ要約

- **中心的ギャップ**: `SearchInput` コンポーネント本体が存在しない（完全新規作成）
- **制約なし**: テストインフラは完備済み。コンポーネントテストの前例はないが、`api/search.test.ts` の Vitest 記述スタイルを参考にできる
- **Research Needed**: Testing Library の `render / screen / fireEvent / userEvent` の使用パターン（プロジェクト初の React コンポーネントテスト）

---

## 3. 実装アプローチ選択肢

### Option A: App.tsx に直接組み込む

**概要**: `App.tsx` 内に SearchInput の HTML とロジックをインライン実装する。

**対象ファイル**: `frontend/src/App.tsx` のみ変更

**トレードオフ**:
- ✅ ファイル数最小
- ❌ App.tsx と SearchInput の責務が混在し、単体テストが困難
- ❌ Chunk 10（App.tsx 統合）で SearchInput を独立 import する前提に反する
- ❌ `app-design.md` のコンポーネント分割設計方針に違反

→ **不採用**

---

### Option B: 新規コンポーネントとして作成（推奨）

**概要**: `frontend/src/components/SearchInput.tsx` を新規作成し、`SearchInput.test.tsx` を同階層に配置する。

**作成ファイル**:
```
frontend/src/
  components/
    SearchInput.tsx          ← 新規
    SearchInput.test.tsx     ← 新規
```

**統合方法**: Chunk 10 で App.tsx から `import SearchInput from './components/SearchInput'` として使用。

**トレードオフ**:
- ✅ 単一責務・単体テスト容易
- ✅ `app-design.md` の設計方針に準拠
- ✅ Chunk 10 統合が自然に行える
- ✅ `@testing-library/react` の `render/screen/userEvent` パターンを確立できる
- ❌ `components/` ディレクトリを新規作成する必要がある（軽微）

→ **採用推奨**

---

### Option C: カスタムフック + コンポーネント分離

**概要**: 入力値管理ロジックを `useSearchInput.ts` フックに切り出し、コンポーネントは表示に専念する。

**作成ファイル**:
```
frontend/src/
  components/SearchInput.tsx
  hooks/useSearchInput.ts
  components/SearchInput.test.tsx
  hooks/useSearchInput.test.ts
```

**トレードオフ**:
- ✅ ロジック・表示を分離（将来的に拡張しやすい）
- ❌ Chunk 8 のスコープ（シンプルなフォームコンポーネント）に対して過剰設計
- ❌ `useState` 数行のために hooks に切り出す必要はない

→ **今回スコープ外（Chunk 10 以降で必要なら検討）**

---

## 4. 複雑性・リスク評価

| 指標 | 評価 | 根拠 |
|---|---|---|
| **工数** | **S（1〜3日）** | React フォームの標準パターン。外部連携なし。テストインフラ完備 |
| **リスク** | **Low** | 既存コードへの影響ゼロ（完全新規ファイル）。React 19 + Testing Library の組み合わせは安定 |

---

## 5. 設計フェーズへの推奨事項

### 採用アプローチ
**Option B（新規コンポーネント作成）** を推奨。

### 設計フェーズで決定すべき事項

1. **テストの `userEvent` vs `fireEvent`**: `@testing-library/user-event` がインストールされていない（`package.json` 確認済み）。`fireEvent` を使うか、`@testing-library/user-event` を追加するかを決定する。
2. **ボタンラベルとプレースホルダー**: UI文言（例: ボタン「探す」、プレースホルダー「渋谷でイタリアンなど」）
3. **スタイリング**: CSSモジュール / インラインスタイル / Tailwind など（プロジェクトにCSSフレームワーク未導入のため、シンプルなインラインスタイルか素の CSS が現実的）

### 持ち越し調査項目（Research Needed）

- `@testing-library/user-event` の追加要否（`fireEvent.change` で十分かどうか）
- `aria-busy` 属性のブラウザ/スクリーンリーダー対応度（Req 6 の実装判断に影響）
