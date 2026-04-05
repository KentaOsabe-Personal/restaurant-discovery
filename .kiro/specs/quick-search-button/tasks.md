# 実装計画

- [x] 1. (P) プリセット設定ファイルの作成
  - `QuickSearchPreset` 型（`label: string; query: string`）を定義して export する
  - エリア系3件（駅前・駅南・古町）とシーン系3件（友達・一人飲み・デート）の初期プリセットを配列で定義する
  - 配列は `readonly` として定義し、ランタイムでの変更を禁止する
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. (P) SearchInput の制御コンポーネント化
  - 内部の `query` ステートを除去し、外部から `value` と `onChange` を受け取る制御コンポーネントに変換する
  - 空文字チェック（`value.trim() === ''`）による送信ガードはコンポーネント内で引き続き行う
  - App.tsx の SearchInput 呼び出し箇所に `value` と `onChange` props を追加する
  - _Requirements: 3.1_

- [x] 3. (P) SearchInput テストの制御コンポーネント対応
  - Task 2 完了後に着手する。Task 4.1 と並列実行可能
  - 制御コンポーネント化により必須化された `value`/`onChange` props をすべてのテストに追加する
  - 「入力後にボタンが有効化される」系テストを、`useState` ラッパーまたは `rerender` による `value` 更新パターンに書き直す
  - 既存の全テストケース（Task 1.2〜Task 4.3 の describe ブロック）が引き続きパスすることを確認する
  - _Requirements: 3.1_

- [x] 4. クイック検索ボタンコンポーネントの実装
- [x] 4.1 (P) QuickSearchButtons コンポーネントの実装
  - Task 1 完了後に着手する。Task 3 と並列実行可能
  - プリセット配列の各要素に対して `<button>` 要素を生成し、`label` をボタンテキストとして表示する
  - ボタン群を flex-wrap レイアウトで配置し、画面幅に応じて自動折り返しする
  - `isLoading` が `true` のとき全ボタンに `disabled` 属性を付与し、opacity 低下とカーソル変更で視覚的に区別する
  - 各ボタンのタップ領域が最低 44×44px になるよう `min-h-[44px]` を適用する
  - 内部ステートを持たないプレゼンテーショナルコンポーネントとして実装する
  - _Requirements: 2.1, 2.2, 2.3, 4.1, 4.2, 4.3, 5.1, 5.2, 5.3, 5.4_

- [x] 4.2 QuickSearchButtons 単体テストの作成
  - プリセット数と同数のボタンが描画されること
  - 各ボタンに `preset.label` が表示テキストとして使われること
  - `isLoading=false` のとき全ボタンが enabled、`isLoading=true` のとき全ボタンが disabled になること
  - ボタンクリック時に `onSelect(preset.query)` が呼ばれること、disabled 状態ではクリックしても呼ばれないこと
  - _Requirements: 2.1, 2.2, 4.1, 4.3, 5.1, 5.2_

- [x] 5. App.tsx へのクイック検索機能の統合とテスト
- [x] 5.1 App.tsx にクイック検索機能を統合する
  - Task 2 および Task 4.1 完了後に着手する
  - `query` ステートを App.tsx に追加し、SearchInput と QuickSearchButtons 双方へ渡す単一の管理点とする
  - クリック時にクエリを検索フィールドに設定してそのまま即時検索を実行するハンドラを追加する
  - QuickSearchButtons を SearchInput の直後・RecommendationList の前に配置する
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 5.2 App.tsx の統合テストを追加する
  - クイック検索ボタンクリック後、SearchInput のテキストフィールドに対応するクエリが反映されること
  - クイック検索ボタンクリック後、検索が実行されてローディング状態に遷移すること
  - ローディング中はクイック検索ボタンが全て disabled になり、完了後に enabled に戻ること
  - _Requirements: 3.1, 3.2, 3.3, 4.1, 4.3_
