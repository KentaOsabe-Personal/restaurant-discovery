# 実装計画

- [x] 1. Tailwind CSS セットアップ
- [x] 1.1 @tailwindcss/vite と tailwindcss のインストール
  - コンテナ内で `pnpm add -D tailwindcss @tailwindcss/vite` を実行してパッケージを devDependencies に追加する
  - `package.json` の `devDependencies` に両パッケージが追加されたことを確認する
  - タスク 1.2・1.3 の前提条件であり、最初に完了させる
  - _Requirements: 1.1_

- [x] 1.2 (P) vite.config.ts へのプラグイン登録
  - `@tailwindcss/vite` から `tailwindcss` をインポートする
  - `plugins` 配列の先頭に `tailwindcss()` を追加し、`react()` より前に配置する
  - `postcss.config.js` は作成しない（v4 はゼロコンフィグ）
  - ※ 1.1 完了後に実行。1.3 と同時実行可
  - _Requirements: 1.2_

- [x] 1.3 (P) index.css の作成と main.tsx へのインポート追加
  - `frontend/src/index.css` を新規作成し、先頭行に `@import "tailwindcss"` を記述する
  - `main.tsx` の先頭に `import './index.css'` を追加する
  - `tailwind.config.js` は作成しない（v4 はゼロコンフィグ）
  - ※ 1.1 完了後に実行。1.2 と同時実行可
  - _Requirements: 1.3_

- [x] 2. App コンポーネントのスタイリング
- [x] 2.1 (P) ページレイアウトと見出しのスタイリング
  - ルート `<div>` に `min-h-screen` とグレー系の背景色（`bg-gray-100` 相当）を適用する
  - コンテンツラッパー `<div>` に `max-w-3xl mx-auto px-4 py-8` 相当のクラスを適用する
  - アプリ名 `<h1>` に `text-3xl font-bold` 相当のクラスを適用する
  - モバイル幅で横スクロールが発生しないことを確認する
  - ※ タスク 1 完了後に実行。タスク 3・4・5 と同時実行可
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2.2 ローディング・エラー・空状態の視覚表現
  - `isLoading` が `true` のとき表示される「読み込み中...」`<p>` に `text-gray-500 italic` 相当を適用する
  - `error` が存在するとき表示されるエラー `<p>` に `text-red-600` 相当を適用する
  - 検索結果が 0 件のとき表示されるメッセージ `<p>` に `text-center text-gray-400` 相当を適用する
  - コンポーネントのロジック・状態管理は変更しない
  - ※ 2.1 完了後に実行
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 3. SearchInput コンポーネントのスタイリング
- [x] 3.1 (P) フォームレイアウトと入力フィールドのスタイリング
  - `<form>` に `flex w-full gap-2` 相当のクラスを適用して入力とボタンを横並びにする
  - `<input>` に `flex-1 border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:outline-none` 相当を適用する
  - ※ タスク 1 完了後に実行。タスク 2・4・5 と同時実行可
  - _Requirements: 3.1, 3.4, 3.5_

- [x] 3.2 検索ボタンと無効状態のスタイリング
  - `<button>` に `bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700` 相当を適用する
  - `disabled:opacity-50 disabled:cursor-not-allowed` を追加し、ローディング時の視覚的無効状態を表現する
  - 既存の `disabled` 属性制御ロジックは変更しない
  - ※ 3.1 完了後に実行
  - _Requirements: 3.2, 3.3_

- [x] 4. PlaceCard コンポーネントのスタイリング
- [x] 4.1 (P) カード基本情報エリアのスタイリング
  - ルート `<div>` に `bg-white rounded-lg shadow p-4` 相当を適用する
  - レストラン名 `<h3>` に `text-lg font-bold mb-1` 相当を適用する
  - 住所 `<p>` に `text-sm text-gray-500 mb-2` 相当を適用する
  - おすすめ理由 `<p>` に `text-base mb-3` 相当を適用する
  - ※ タスク 1 完了後に実行。タスク 2・3・5 と同時実行可
  - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 4.2 バッジとリンクのスタイリング
  - `rating` が非 null のとき表示される評価バッジ `<span>` に `inline-block bg-yellow-100 text-yellow-800 text-sm px-2 py-0.5 rounded` 相当を適用する
  - `price_level` が非 null のとき表示される価格帯バッジ `<span>` に `inline-block bg-green-100 text-green-800 text-sm px-2 py-0.5 rounded ml-2` 相当を適用する
  - Google Maps `<a>` タグに `text-blue-600 hover:underline text-sm` 相当を適用する
  - `formatPriceLevel` / `safeMapsUrl` ロジックは変更しない
  - ※ 4.1 完了後に実行
  - _Requirements: 4.5, 4.6, 4.7_

- [x] 5. (P) RecommendationList コンポーネントのスタイリング
  - `<ul>` に `list-none p-0 grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3` 相当を適用する
  - モバイル（`grid-cols-1`）・タブレット（`md:grid-cols-2`）・デスクトップ（`lg:grid-cols-3`）のレスポンシブカラムを設定する
  - `gap-4` でカード間の均等な余白を確保する
  - `<li>` のマーカーは `list-none` で除去し、`<li>` 自体への追加クラスは不要
  - コンポーネントの内部ロジックおよび `key` 設定は変更しない
  - ※ タスク 1 完了後に実行。タスク 2・3・4 と同時実行可
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

- [x] 6. ビルド・テスト検証
- [x] 6.1 ビルド検証
  - コンテナ内で `docker compose exec frontend pnpm build` を実行し、TypeScript エラーや Vite ビルドエラーがないことを確認する
  - Tailwind ユーティリティクラスが正常にバンドルされていることを確認する
  - ※ タスク 1〜5 の完了後に実行
  - _Requirements: 1.4_

- [x] 6.2 (P) テスト検証
  - コンテナ内で `docker compose exec frontend pnpm test --run` を実行し、全テストケースがパスすることを確認する
  - `className` の追加によって既存テスト（`SearchInput.test.tsx`・`PlaceCard.test.tsx`・`App.test.tsx`）が壊れていないことを確認する
  - ※ タスク 1〜5 の完了後に実行。6.1 と同時実行可
  - _Requirements: 1.5_

- [ ]* 6.3 レスポンシブデザインの手動確認
  - モバイル幅（375px）でカードが 1 カラム縦並びになることをブラウザの DevTools で確認する
  - タブレット幅（768px）でカードが 2 カラムグリッドになることを確認する
  - デスクトップ幅（1024px）でカードが 3 カラムグリッドになることを確認する
  - `isLoading` 時に検索フォームが視覚的無効状態になることを確認する
  - ※ MVP 後に実施可能な補足確認
  - _Requirements: 2.4, 3.3, 5.2, 5.3, 5.4_
