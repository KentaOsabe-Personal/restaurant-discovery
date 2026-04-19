# Implementation Plan

- [x] 1. Frontend 型定義とコンポーネント・フック実装
- [x] 1.1 SearchMode 型定義と API クライアントの mode パラメータ追加
  - `SearchMode = 'izakaya' | 'ramen'` 型をフロントエンド型定義ファイルに追加する
  - `searchPlaces` 関数の引数に `mode: SearchMode` を追加し、リクエストボディに `mode` を含める
  - `RefineRequest` 型に `mode?: SearchMode` フィールドを追加し、リファインリクエストに `mode` を含める
  - `pnpm build` が型エラーなく通る
  - _Requirements: 2.1, 4.1_
  - _Boundary: search.ts, refine.ts, types/search.ts_

- [x] 1.2 ModeTabs コンポーネントの作成とユニットテスト
  - 「居酒屋・バー」と「ラーメン」の2つのタブを水平に並べて表示するコンポーネントを作成する
  - `activeTab` と `onTabChange` を props として受け取る Controlled Component として実装する
  - アクティブタブに視覚的なハイライト（Tailwind CSS）を適用する
  - アクセシビリティ属性（`role="tablist"`, `role="tab"`, `aria-selected`）を設定する
  - ユニットテスト: 2タブ表示、アクティブ状態のスタイル、クリック時のコールバック呼び出しを検証する
  - テスト実行で全件パスする
  - _Requirements: 1.1, 1.2, 1.3_
  - _Boundary: ModeTabs_

- [x] 1.3 (P) useSearchHistory のモード別 localStorage キー管理とユニットテスト
  - `useSearchHistory` フックに `mode: SearchMode` パラメータを追加する
  - `izakaya` モード時は既存の `restaurant_search_history` キーを使用する（既存データとの後方互換性を維持）
  - `ramen` モード時は新規の `ramen_search_history` キーを使用する
  - `mode` 変更時に `useEffect` で対応する localStorage から履歴を再読み込みする
  - ユニットテスト: モード別キー分離、既存履歴が izakaya として読み込まれる、mode 切り替えで履歴が切り替わることを検証する
  - テスト実行で全件パスする
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_
  - _Boundary: useSearchHistory_

- [x] 2. (P) Backend サービス層のラーメンモード対応
- [x] 2.1 (P) QueryParserService のラーメンモード対応とユニットテスト
  - `call` メソッドに `mode:` キーワード引数を追加する（デフォルト: `"izakaya"`）
  - `mode == "ramen"` の場合、ラーメン専用追記（genre は常に「ラーメン」、ラーメン特徴を keyword に分離する指示）をシステムプロンプトに追加する
  - 既存プロンプト構造は変更せず追記のみ行う
  - ユニットテスト（RSpec + WebMock）: mode=ramen 時にプロンプトにラーメン追記が含まれる、mode=izakaya 時は追記なしであることを検証する
  - テスト実行で全件パスする
  - _Requirements: 2.1, 2.2, 2.3_
  - _Boundary: QueryParserService_

- [x] 2.2 (P) RecommendationService のラーメン専用プロンプトとユニットテスト
  - `call` メソッドに `mode:` キーワード引数を追加する（デフォルト: `"izakaya"`）
  - `mode == "ramen"` の場合、ラーメン専用システムプロンプトを使用する（選定基準: 条件一致度 → ラーメン特徴 → 評価、推薦理由に味の系統・麺の太さ・スープの種類を含む）
  - `mode == "ramen"` かつ `feedback` ありの場合、フィードバック追記をラーメンプロンプトに追加する
  - レスポンス形状（`name` + `reason`）は既存と同一であること
  - ユニットテスト（RSpec + WebMock）: mode=ramen でラーメン専用プロンプトが使用される、mode=izakaya で従来プロンプトであることを検証する
  - テスト実行で全件パスする
  - _Requirements: 3.1, 3.2_
  - _Boundary: RecommendationService_

- [x] 3. Backend コントローラー層の mode パラメータ処理と統合テスト
- [x] 3.1 (P) SearchController の mode パラメータ処理と統合テスト
  - リクエストパラメータから `mode` を取得する（デフォルト: `"izakaya"`）
  - `mode` を `QueryParserService.call` と `RecommendationService.call` に伝播する
  - `mode == "ramen"` の場合、`QueryParserService` の結果の `genre` を `"ラーメン"` に上書きする
  - 統合テスト（RSpec + WebMock）: mode=ramen で `parsed_conditions.genre` が「ラーメン」になる、mode 未指定で従来動作を維持することを検証する
  - テスト実行で全件パスする
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 6.2_
  - _Boundary: SearchController_
  - _Depends: 2.1, 2.2_

- [x] 3.2 (P) RefineController の mode パラメータ処理と統合テスト
  - リクエストパラメータから `mode` を取得する（デフォルト: `"izakaya"`）
  - 条件マージ後に `mode == "ramen"` なら `merged[:genre] = "ラーメン"` で上書きする
  - `mode` を `QueryParserService.call` と `RecommendationService.call` に伝播する
  - 統合テスト（RSpec + WebMock）: mode=ramen でマージ後の `genre` が「ラーメン」を維持する、mode 未指定で従来動作を維持することを検証する
  - テスト実行で全件パスする
  - _Requirements: 4.1, 6.2_
  - _Boundary: RefineController_
  - _Depends: 2.1, 2.2_

- [x] 4. (P) App.tsx のモード状態管理とタブ切り替え統合
  - `useState<SearchMode>('izakaya')` で `activeTab` 状態を管理する
  - タブ切り替え時に `query`, `recommendations`, `otherCandidates`, `parsedConditions`, `error`, `showOtherCandidates`, `selectedGoogleMapsUrl`, `infoWindowVisible` をリセットする
  - `activeTab` を `searchPlaces`, `refinePlaces`, `useSearchHistory` に伝播する
  - `ModeTabs` コンポーネントを画面上部に配置する
  - `activeTab === 'izakaya'` の場合のみおまかせボタンを表示し、`ramen` では非表示にする
  - 既存 UI コンポーネント（PlaceCard, MapPanel, OtherCandidateSection, SearchConditionTags, FeedbackInput）は変更不要でそのまま動作する
  - `pnpm build` が型エラーなく通り、ModeTabs 表示・状態リセット・mode 伝播のコードが配置されている
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 4.1, 4.2, 4.3, 4.4, 4.5, 6.1, 6.3_
  - _Depends: 1.2, 1.3_
  - _Boundary: App.tsx_

- [x] 5. 結合テストと後方互換性検証
  - タブ切り替え: 居酒屋→ラーメンタブ切り替えで検索結果リセットとおまかせボタン消失を確認する
  - ラーメン検索: ラーメンタブで検索すると検索条件タグに「ラーメン」が表示されることを確認する
  - ラーメンフィードバック: ラーメン検索結果に対するフィードバック送信でラーメンモード再推薦を確認する
  - 検索履歴分離: ラーメンタブ検索後に居酒屋タブ切り替えでラーメン履歴が非表示であることを確認する
  - 後方互換: 居酒屋タブでの検索・おまかせ・フィードバックが従来通り動作することを確認する
  - 全テストがパスする
  - _Requirements: 1.2, 1.4, 1.5, 2.1, 2.4, 4.1, 5.1, 5.2, 6.1, 6.3_
