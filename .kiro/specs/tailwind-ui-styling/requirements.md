# 要件定義書

## はじめに

本仕様は「Restaurant Discovery」アプリケーションのフロントエンドUIにTailwind CSSを導入し、全コンポーネントを視覚的に整えることを目的とする。現状のコンポーネント（`App.tsx`・`SearchInput.tsx`・`PlaceCard.tsx`・`RecommendationList.tsx`）はスタイルが未適用のスキャフォールド状態であり、ユーザー体験として不完全である。本フィーチャーではTailwindのセットアップからコンポーネント単位のスタイリングまでを扱う。

---

## 要件

### 要件 1: Tailwind CSS のセットアップ

**目的:** 開発者として、Tailwind CSS をプロジェクトに導入したい。これにより、ユーティリティクラスを用いて効率的にUIを構築できるようにする。

#### 受け入れ基準

1. The フロントエンドアプリ shall Tailwind CSS パッケージ（`@tailwindcss/vite` および `tailwindcss`）を `devDependencies` に含む。
2. The フロントエンドアプリ shall Vite プラグインとして Tailwind CSS が `vite.config.ts` に登録されている。
3. The フロントエンドアプリ shall グローバル CSS ファイル（`src/index.css`）に `@import "tailwindcss"` が記述されており、`main.tsx` からインポートされている。
4. When Tailwind の設定が完了したとき、the フロントエンドアプリ shall ビルド（`pnpm build`）がエラーなく完了する。
5. When Tailwind の設定が完了したとき、the フロントエンドアプリ shall テスト（`pnpm test --run`）が全件パスする。

---

### 要件 2: アプリ全体レイアウトのスタイリング

**目的:** ユーザーとして、アプリ全体が整ったレイアウトで表示されることを望む。これにより、レストラン検索が快適に行える。

#### 受け入れ基準

1. The フロントエンドアプリ shall ページ全体に最小高さ `min-h-screen` および背景色（グレー系）を適用する。
2. The フロントエンドアプリ shall コンテンツ領域を中央寄せ（`max-width` + `mx-auto`）かつ適切なパディングで配置する。
3. The フロントエンドアプリ shall アプリ名「Restaurant Discovery」を見出し（`h1`）として、フォントサイズ・ウェイトを強調したスタイルで表示する。
4. While モバイル幅（〜767px）のとき、the フロントエンドアプリ shall コンテンツが横スクロールなしに1カラムで表示される。
5. While タブレット以上の幅（768px〜）のとき、the フロントエンドアプリ shall コンテンツ幅が適切な最大幅に制限され、余白が確保される。

---

### 要件 3: 検索フォームのスタイリング（SearchInput）

**目的:** ユーザーとして、検索フォームが見やすく操作しやすいデザインで表示されることを望む。これにより、スムーズにレストランを検索できる。

#### 受け入れ基準

1. The SearchInput コンポーネント shall テキスト入力フィールドに枠線・角丸・パディングを適用し、フォーカス時にリングスタイルが表示される。
2. The SearchInput コンポーネント shall 検索ボタン（「探す」）に背景色・テキスト色・ホバー時の色変化を適用する。
3. While `isLoading` が `true` のとき、the SearchInput コンポーネント shall 入力フィールドおよびボタンが視覚的に無効状態（`opacity` 低下またはカーソル変化）で表示される。
4. The SearchInput コンポーネント shall 入力フィールドとボタンが横並び（`flex`）でレイアウトされる。
5. While モバイル幅のとき、the SearchInput コンポーネント shall 検索フォームが画面幅いっぱいに広がって表示される。

---

### 要件 4: レストランカードのスタイリング（PlaceCard）

**目的:** ユーザーとして、各レストランの情報がカード形式で整然と表示されることを望む。これにより、情報を素早く把握できる。

#### 受け入れ基準

1. The PlaceCard コンポーネント shall カード全体に背景色（白）・角丸・影（`shadow`）・パディングを適用する。
2. The PlaceCard コンポーネント shall レストラン名（`h3`）を大きめのフォントサイズ・太字で表示する。
3. The PlaceCard コンポーネント shall 住所（`address`）をグレー系の小さめテキストで表示する。
4. The PlaceCard コンポーネント shall おすすめ理由（`reason`）を通常テキストで適切な余白とともに表示する。
5. When `rating` が `null` でないとき、the PlaceCard コンポーネント shall 評価値をバッジまたはインラインスタイルで視覚的に区別して表示する。
6. When `price_level` が `null` でないとき、the PlaceCard コンポーネント shall 価格帯（¥〜¥¥¥¥）をバッジまたはインラインスタイルで表示する。
7. The PlaceCard コンポーネント shall 「Google Mapsで見る」リンクにリンク色・ホバー時のアンダーラインを適用する。

---

### 要件 5: 検索結果リストのスタイリング（RecommendationList）

**目的:** ユーザーとして、複数の検索結果が見やすいグリッドまたはリスト形式で表示されることを望む。これにより、候補店を比較しやすくなる。

#### 受け入れ基準

1. The RecommendationList コンポーネント shall カード一覧をリストマーカーなし（`list-none`）で表示する。
2. While モバイル幅のとき、the RecommendationList コンポーネント shall カードが1カラムの縦並びで表示される。
3. While タブレット幅（768px〜）のとき、the RecommendationList コンポーネント shall カードが2カラムのグリッドで表示される。
4. While デスクトップ幅（1024px〜）のとき、the RecommendationList コンポーネント shall カードが3カラムのグリッドで表示される。
5. The RecommendationList コンポーネント shall カード間に適切なギャップ（`gap`）を適用する。

---

### 要件 6: ローディング・エラー・空状態のスタイリング

**目的:** ユーザーとして、検索中・エラー発生時・結果ゼロ時に状態を視覚的に把握できることを望む。これにより、アプリの状態を直感的に理解できる。

#### 受け入れ基準

1. While `isLoading` が `true` のとき、the フロントエンドアプリ shall 「読み込み中...」テキストをグレー系の斜体またはスピナー的な視覚表現で表示する。
2. When エラーが発生したとき、the フロントエンドアプリ shall エラーメッセージを赤系の警告色テキストまたはアラートボックスで表示する。
3. When 検索結果が0件のとき、the フロントエンドアプリ shall 「条件に合うレストランが見つかりませんでした」メッセージを中央寄せ・グレー系テキストで表示する。
