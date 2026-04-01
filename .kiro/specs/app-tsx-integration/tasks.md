# 実装タスク

## Task Format

- `(P)` — 並行実行可能なタスク
- `- [ ]*` — 後回し可能なオプションテストタスク

---

## Implementation Plan

- [ ] 1. App コンポーネントに状態管理と検索フローを実装する (P)
- [ ] 1.1 (P) アプリケーション状態（isLoading / recommendations / error）を useState で定義し、初期値を設定する
  - `isLoading: false`・`recommendations: null`・`error: null` の初期状態を設定する
  - TypeScript strict モードで型エラーが発生しないよう `Recommendation[] | null` / `string | null` の型を付与する
  - _Requirements: 2.2_

- [ ] 1.2 (P) handleSearch 関数を実装し、検索ライフサイクル（開始・成功・エラー）を制御する
  - 関数開始時に `isLoading=true`・`error=null`・`recommendations=null` を設定する（前回状態のクリア）
  - `searchPlaces(query)` を try/catch/finally で呼び出す
  - 成功時に `recommendations` を更新し、finally で `isLoading=false` をセットする
  - catch ブロックで `e instanceof Error ? e.message : '検索に失敗しました'` のパターンでエラー状態を設定する
  - _Requirements: 2.1, 2.3, 2.4, 2.5, 2.6, 5.3_

- [ ] 1.3 SearchInput・タイトル・各レンダリング条件を JSX に組み込む
  - アプリタイトル（「Restaurant Discovery」）を見出し要素として表示する
  - `SearchInput` に `onSubmit={handleSearch}` と `isLoading={isLoading}` を渡す
  - `isLoading === true` のとき、ローディングインジケーター（テキストまたはアニメーション）を表示する
  - `error !== null && !isLoading` のとき、エラーメッセージを表示し結果リストを非表示にする
  - `recommendations !== null && recommendations.length === 0 && !isLoading && error === null` のとき、空状態メッセージを表示する
  - `recommendations !== null && recommendations.length > 0 && !isLoading` のとき、`RecommendationList` コンポーネントを表示する
  - 未検索状態（`recommendations === null && !isLoading && error === null`）では結果・エラー・ローディングを一切表示しない
  - `SearchInput`・`PlaceCard`・`searchPlaces` の import 宣言を追加する
  - 関数コンポーネントとして実装し、TypeScript strict モードでコンパイルエラーを出さない
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.2, 3.1, 3.2, 3.3, 5.1, 5.2, 6.1, 6.2, 6.3, 7.1, 7.3, 7.4_

- [ ] 2. RecommendationList コンポーネントを実装する (P)
- [ ] 2.1 (P) Recommendation 配列を受け取り PlaceCard のリストを `<ul>/<li>` 構造でレンダリングする
  - `recommendations: Recommendation[]` を Props として受け取るコンポーネントを関数コンポーネントで実装する
  - `<ul>` コンテナの中で各 `Recommendation` を `<li key={item.google_maps_url}>` でラップして `PlaceCard` を描画する
  - `Recommendation` 型の全フィールド（`name`・`rating`・`price_level`・`address`・`google_maps_url`・`reason`）を `PlaceCard` に Props として渡す
  - TypeScript strict モードでコンパイルエラーを出さない実装にする
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 7.2, 7.3, 7.4_

- [ ] 3. App コンポーネントの統合テストを App.test.tsx に記述する
- [ ] 3.1 成功シナリオと空状態シナリオのテストを実装する
  - `vi.mock` で `searchPlaces` をモジュールレベルでモックする
  - 成功シナリオ: `mockResolvedValueOnce` で推薦結果を返し、店舗名が DOM に表示されることを検証する
  - 空状態シナリオ: 空の `recommendations` 配列を返し、空状態メッセージが表示されることを検証する
  - _Requirements: 8.1, 8.2_

- [ ] 3.2 エラーシナリオのテストを実装する
  - `mockRejectedValueOnce` で `Error` をスローするよう設定する
  - エラーメッセージが DOM に表示されることを検証する
  - 結果リストが同時に表示されないことを確認する
  - _Requirements: 8.3_

- [ ] 3.3 ローディング状態のテストを実装する
  - 解決しない pending Promise を返す mock を使用して `isLoading` 中の状態を観察する
  - フォーム送信後に `SearchInput` の入力フィールドが disabled になることを検証する
  - Promise を解決した後に disabled が解除されることを検証する
  - _Requirements: 8.4_

- [ ] 3.4 全テストが pnpm test --run でパスすることを確認する
  - `docker compose exec frontend pnpm test --run` を実行してすべてのテストがグリーンであることを確認する
  - 既存テスト（SearchInput・PlaceCard 等）のリグレッションがないことも確認する
  - _Requirements: 8.5_
