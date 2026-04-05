# 実装タスクリスト

- [x] 1. 検索履歴エントリの型定義を追加する
  - 共有型ファイルに `SearchHistoryEntry` 型（クエリ文字列フィールドを持つ値オブジェクト）を追記する
  - フックと UI コンポーネントの両方がこの型をインポートして使用できることを確認する
  - _Requirements: 1.1, 6.1_

- [x] 2. 検索履歴ロジックフックを実装する
- [x] 2.1 (P) フックの基盤と localStorage 永続化を実装する
  - `src/hooks/` ディレクトリを新設し、検索履歴フックファイルを作成する
  - コンポーネントマウント時に `restaurant_search_history` キーで localStorage から履歴を読み込み、React ステートに格納する
  - JSON パース失敗・アクセスエラーは `try/catch` で捕捉し、空配列でフォールバックする
  - 書き込み失敗時も `try/catch` で捕捉し、React ステートの更新は継続する（UI は正常動作を維持）
  - 3.1 と並行して実装可能（触れるファイルが独立している）
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 2.2 履歴の追加・重複排除・上限制御を実装する
  - `addToHistory` の実装：空文字列（トリム後）は即リターンする
  - 同一クエリが既存履歴に存在する場合は削除して先頭に挿入し直す（重複排除・先頭移動）
  - 追加後のリストが 10 件を超えた場合は末尾エントリを削除して上限を維持する
  - 変更のたびに localStorage へ全件書き込んで永続化する
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2.3 個別削除と全件クリアを実装する
  - `removeFromHistory` の実装：対象クエリを除いた配列で React ステートと localStorage を更新する
  - `clearHistory` の実装：ステートを空配列にして localStorage も消去する
  - _Requirements: 4.1, 5.1_

- [x] 3. 検索履歴チップコンポーネントを実装する
- [x] 3.1 (P) チップリストの表示とレイアウトを実装する
  - `src/components/SearchHistoryChips.tsx` を新規作成し、Props（履歴配列・各コールバック・ローディング状態）を定義する
  - 履歴が空の場合は `null` を返してエリア全体を非表示にする
  - 履歴を配列順（新しい順）にチップとして並べ、各チップにクエリテキストと個別削除ボタン（×）を表示する
  - 履歴が 1 件以上の場合に「履歴クリア」ボタンをチップリストの隣に表示する
  - Tailwind CSS を使い、既存の `QuickSearchButtons` と一貫したスタイルを適用する
  - 2.1 と並行して実装可能（触れるファイルが独立している）
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.2 再検索・個別削除・全件クリアのインタラクションを実装する
  - チップクリックで `onSelect(query)` を呼び出す
  - ×ボタンクリックで `event.stopPropagation()` を呼んだあとに `onRemove(query)` を呼び出し、チップの再検索イベントと競合しないようにする
  - クリアボタンクリックで `onClear()` を呼び出す
  - `isLoading` が `true` のときはチップと「履歴クリア」ボタンを `disabled` にして操作を無効化する
  - _Requirements: 3.1, 4.1, 4.2, 5.1, 5.2_

- [x] 4. App.tsx に検索履歴機能を統合する
  - `useSearchHistory` フックを `App.tsx` のコンポーネントトップで呼び出し、`history`・`addToHistory`・`removeFromHistory`・`clearHistory` を取得する
  - `handleSearch` 関数の先頭で `addToHistory(query)` を実行し、検索のたびに履歴が保存されるようにする
  - `handleHistorySelect(query)` 関数を追加し、検索バーにクエリをセットしてそのまま検索を実行する
  - `<SearchHistoryChips>` を `<SearchInput>` の直下（`<QuickSearchButtons>` の前）に配置し、必要な Props を渡す
  - _Requirements: 1.1, 3.1, 3.2_

- [ ] 5. テストを実装する
- [ ] 5.1 (P) useSearchHistory のユニットテストを実装する
  - `addToHistory` の通常保存・重複排除・最大 10 件制限・空文字除外の各ケースを検証する
  - `removeFromHistory` の対象削除・存在しないクエリへのノーオペレーション動作を検証する
  - `clearHistory` の全件削除と空配列への遷移を検証する
  - localStorage の読み込み失敗時に空の履歴でフォールバックする動作を検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 5.1, 6.1, 6.3_

- [ ] 5.2 (P) SearchHistoryChips のユニットテストを実装する
  - `history` が空のとき何もレンダリングされないことを検証する
  - チップクリックで `onSelect` が正しいクエリで呼ばれることを検証する
  - ×ボタンクリックで `onRemove` が呼ばれ、`onSelect` は呼ばれないことを検証する
  - クリアボタンクリックで `onClear` が呼ばれることを検証する
  - `isLoading=true` のときチップとクリアボタンが `disabled` になることを検証する
  - _Requirements: 2.3, 3.1, 4.1, 5.1_

- [ ] 5.3 App.tsx の統合テストを実装する
  - 検索実行後に履歴チップが表示されることを検証する
  - 同一クエリの再実行で重複チップが生じないことを検証する
  - 履歴チップのクリックで検索バーにクエリが入り、検索が実行されることを検証する
  - ×ボタンクリックで対象チップが消えることを検証する
  - クリアボタンクリックで全チップが消えることを検証する
  - localStorage に事前データを投入した状態で履歴が復元されることを検証する
  - _Requirements: 1.1, 1.2, 3.1, 4.1, 5.1, 6.1_
