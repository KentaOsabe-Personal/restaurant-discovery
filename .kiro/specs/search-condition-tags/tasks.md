# 実装タスク: search-condition-tags

## 概要

- メジャータスク: 4、サブタスク: 6
- 全要件カバー: 1.1–1.3, 2.1–2.2, 3.1–3.8, 4.1–4.5, 5.1–5.3

---

- [x] 1. (P) バックエンド: keyword フィールドを API レスポンスに追加する
- [x] 1.1 SearchController のレスポンス構築に keyword を含める
  - 通常レスポンスと空結果レスポンスの2箇所の parsed_conditions ブロックに keyword フィールドを追加する
  - QueryParserService の戻り値から keyword を直接参照し、null の場合はそのまま null として返す
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 1.2 バックエンドのリクエストスペックを更新する
  - search_spec.rb の `not_to have_key("keyword")` アサーションを `to have_key("keyword")` に反転させる
  - keyword が非 null の場合と null の場合の両パターンを検証するテストケースを確認・追加する
  - 空結果レスポンスパスでも keyword が含まれることを検証する
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. (P) フロントエンド型定義に keyword フィールドを追加する
  - ParsedConditions 型に `keyword: string | null` フィールドを追加する
  - TypeScript strict モードでの型チェックが通過することを確認する
  - _Requirements: 2.1, 2.2_

- [x] 3. SearchConditionTags コンポーネントを作成する
- [x] 3.1 価格帯ラベル変換を含む SearchConditionTags コンポーネントを実装する
  - タスク2（ParsedConditions 型更新）が完了していること
  - area・genre・price_level・keyword の各フィールドを走査し、null でないものだけタグとして表示する
  - 全フィールドが null の場合は、4フィールドを明示的に列挙したガードでコンポーネントを非表示にする
  - price_level は `Partial<Record<string, string>>` 型のマッピング定数で日本語ラベルに変換し、未知の値はフォールバックで元の値を表示する
  - タグは横並びレイアウト（flex flex-wrap）で、各タグに条件種別ラベルと値を表示する（例: "エリア: 渋谷"）
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3_

- [x] 3.2 SearchConditionTags のユニットテストを作成する
  - 全フィールド非 null 時に4つのタグが全て表示されることを検証する
  - 一部フィールドが null の場合に該当タグが非表示になることを検証する
  - 全フィールド null 時にコンポーネントが何も表示しないことを検証する
  - 価格帯の5つの enum 値がそれぞれ正しい日本語ラベルに変換されることを検証する
  - 未知の price_level 値がフォールバックで元の値として表示されることを検証する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 4. App.tsx に parsedConditions ステートを追加して SearchConditionTags を組み込む
- [x] 4.1 App.tsx のステート管理と SearchConditionTags の表示制御を実装する
  - タスク2（ParsedConditions 型更新）とタスク3（SearchConditionTags 作成）が完了していること
  - parsedConditions state を追加し、初期値を null とする
  - 検索開始時（handleSearch 冒頭）に parsedConditions を null にリセットする
  - 検索成功後にレスポンスの parsed_conditions を state にセットする
  - ローディング中はタグを表示せず、parsedConditions が non-null のときのみ SearchConditionTags をレンダリングする
  - _Requirements: 3.7, 3.8_

- [x] 4.2 App.test.tsx の統合テストを更新する
  - 既存テストフィクスチャの parsed_conditions に keyword フィールドを追加して型エラーを解消する
  - 検索成功後に SearchConditionTags が表示されることを検証する
  - 新しい検索開始時に前回のタグがクリアされることを検証する
  - ローディング中にタグが表示されないことを検証する
  - _Requirements: 3.7, 3.8_
