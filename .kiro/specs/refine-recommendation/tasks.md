# Implementation Plan

- [x] 1. Foundation - バックエンド基盤の準備
- [x] 1.1 RecommendationService にフィードバック対応を追加する
  - `feedback: nil` キーワード引数をシグネチャに追加する（既存の SearchController・OmakaseController からの呼び出しは変更不要）
  - `build_system_prompt` プライベートメソッドを追加し、フィードバックが存在する場合にプロンプト末尾へ「ユーザーフィードバック（最優先で反映）」セクションを追記する
  - OpenAI モデルを `gpt-5.4-nano` に変更する
  - フィードバックなしで呼び出した場合に既存と同一の動作をすること（後方互換性が保たれていること）
  - _Requirements: 5.1, 5.2_

- [x] 1.2 API ルーティングに再レコメンドエンドポイントを追加する
  - `namespace :api` ブロックに `post "refine"` を1行追加する
  - `rails routes` 出力で `/api/refine` (POST) が `api/refine#create` にマッピングされていること
  - _Requirements: 2.1_

- [x] 2. (P) フロントエンドの型定義を拡張する
  - `types/search.ts` に `RefineRequest` 型（`feedback: string`, `original_query: string`, `parsed_conditions: ParsedConditions | null`）を追加する
  - `RefineResponse = SearchResponse` 型エイリアスを追加する
  - `any` 型不使用、TypeScript strict モード準拠
  - `pnpm build` でビルドエラーが発生しないこと
  - _Requirements: 2.1_
  - _Boundary: フロントエンド型定義（types/search.ts）_

- [x] 3. Core - RefineController でバックエンド再レコメンド処理を実装する
  - `app/controllers/api/refine_controller.rb` を新規作成する
  - `feedback` パラメーターの存在・非空チェックを実装し、不正な場合は 422 Unprocessable Content を返す
  - `QueryParserService` でフィードバックを構造化条件（delta）に変換し、null でない項目のみを元の条件に上書きマージする `merge_conditions` プライベートメソッドを実装する
  - フィードバック解析結果が全 null の場合は元の条件をそのまま使用して処理を継続する
  - `GooglePlacesService` にマージ済み条件を渡して候補店を取得し、0件の場合は空配列を即時返却する
  - `RecommendationService` に `feedback:` を渡して 3〜5 件の再選別を実行する
  - `rescue_from` で QueryParserError・GooglePlacesError・RecommendationError を 502、StandardError を 500 に統一する
  - `{ recommendations, other_candidates, parsed_conditions }` を JSON で返す（`parsed_conditions` はマージ済み条件）
  - 有効なリクエストを送信すると HTTP 200 と再レコメンド結果が返ること
  - _Depends: 1.1, 1.2_
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 4.1, 4.2, 5.1_

- [ ] 4. (P) Core - フロントエンドの API クライアントと入力コンポーネントを実装する
- [ ] 4.1 (P) 再レコメンド API クライアント関数を実装する
  - `api/refine.ts` に `refinePlaces(request: RefineRequest): Promise<RefineResponse>` 関数を新規作成する
  - POST /api/refine に JSON ボディを送信し、既存の `searchPlaces` と同一のエラー処理パターン（レスポンス ok でない場合 Error をスロー）を適用する
  - TypeScript strict モード準拠、`any` 型不使用
  - `pnpm build` でビルドエラーが発生しないこと
  - _Depends: 2_
  - _Requirements: 2.1_
  - _Boundary: api/refine.ts_

- [ ] 4.2 (P) フィードバック入力コンポーネントを実装する
  - `FeedbackInput.tsx` を新規作成し、`onSubmit: (feedback: string) => void` と `isLoading: boolean` の Props を定義する
  - Controlled input でフィードバックテキストを管理し、フォーム送信後に入力フィールドをリセットする
  - フィードバックが空または空白のみの場合に送信ボタンを無効化する
  - `isLoading=true` の場合に送信ボタンを無効化し「絞り込み中...」と表示する
  - 既存の `SearchInput.tsx` と同一のスタイルパターンで実装する
  - `pnpm build` でビルドエラーなし、コンポーネントが正常にレンダリングされること
  - _Requirements: 1.1, 1.2, 1.3_
  - _Boundary: FeedbackInput コンポーネント_

- [ ] 5. Integration - App.tsx に再レコメンド機能を統合する
  - `isRefineLoading` state（boolean）を追加する
  - `handleRefine(feedback: string)` 関数を実装する：`refinePlaces` を呼び出し、成功時に `recommendations`・`otherCandidates`・`parsedConditions` を更新し「もっと見る」展開状態・地図選択状態をリセットする；エラー時は `error` state を設定し既存の結果表示は維持する
  - `recommendations` が 1 件以上あり初期検索が完了している状態のみ `FeedbackInput` を表示する
  - 再レコメンド後に `SearchConditionTags` がマージ済み `parsed_conditions`（例: `keyword: 個室`）を表示すること
  - 再レコメンド失敗時に既存のレコメンド結果が画面に残ること（結果 state が変更されないこと）
  - _Depends: 3, 4.1, 4.2_
  - _Requirements: 1.1, 1.4, 6.1, 6.2, 6.3, 7.1, 7.2, 7.3_

- [ ] 6. Validation - テストを実装する
- [ ] 6.1 (P) バックエンドリクエストスペックを実装する
  - `spec/requests/api/refine_spec.rb` を新規作成する
  - 有効なリクエストで 200 と `recommendations`・`other_candidates`・`parsed_conditions` が返ることを検証するテストを追加する
  - 空 feedback で 422 が返ることを検証するテストを追加する
  - 候補が 0 件の場合に 200 + 空配列が返ることを検証するテストを追加する（Req 4.2）
  - 外部サービスエラー時に 502 が返ることを検証するテストを追加する
  - フィードバック解析が全 null になる場合に元条件が維持されることを検証するテストを追加する（Req 3.3）
  - `bundle exec rspec spec/requests/api/refine_spec.rb` が全件グリーンであること
  - _Depends: 3_
  - _Requirements: 2.1, 2.2, 2.3, 3.2, 3.3, 4.2_
  - _Boundary: RefineController_

- [ ] 6.2 (P) RecommendationService の feedback テストケースを追加する
  - `spec/services/recommendation_service_spec.rb` に `feedback:` ありの場合にプロンプトにフィードバックテキストが含まれることを検証するテストを追加する
  - `feedback: nil`（デフォルト）の場合に既存動作が維持されることを検証するテストを追加する
  - `bundle exec rspec spec/services/recommendation_service_spec.rb` が全件グリーンであること
  - _Requirements: 5.2_
  - _Boundary: RecommendationService_

- [ ] 6.3 (P) FeedbackInput コンポーネントテストを実装する
  - `FeedbackInput.test.tsx` を新規作成する
  - 空入力時に送信ボタンが disabled であることを検証するテストを追加する
  - テキスト入力後に送信ボタンが有効になることを検証するテストを追加する
  - `isLoading=true` 時にボタンが disabled かつ「絞り込み中...」と表示されることを検証するテストを追加する
  - 送信時に `onSubmit` コールバックが入力値で呼び出されることを検証するテストを追加する
  - `pnpm test --run` が全件グリーンであること
  - _Requirements: 1.2, 1.3_
  - _Boundary: FeedbackInput コンポーネント_
