# 実装タスク

## 概要

「もっと見る」機能の実装タスクです。バックエンドの差分計算拡張とフロントエンドの型更新・新規コンポーネント・App.tsx 統合の4フェーズで構成されます。タスク 1（バックエンド）とタスク 2（フロントエンド型定義・PlaceCard）は並行実施可能です。

---

- [x] 1. バックエンド: other_candidates 差分計算とレスポンス拡張

- [x] 1.1 (P) SearchController に other_candidates の差分計算を追加する
  - recommendations の名前集合（Set）を構築し、places から非推薦候補を抽出する
  - places が空の場合の early return パスにも `other_candidates: []` を含める
  - 全 places が AI 推薦に含まれる場合も `other_candidates: []` を返す
  - places 配列の元の順序を維持したまま other_candidates を構築する
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x]* 1.2 SearchController の other_candidates 動作を RSpec でテストする
  - recommendations に含まれない places のみが other_candidates に返されることを検証する
  - places が空の場合に `other_candidates: []` が返されることを検証する
  - 全 places が推薦済みの場合に `other_candidates: []` が返されることを検証する
  - Google Places API の返却順が other_candidates に維持されることを検証する
  - _Requirements: 3.1, 3.3, 3.4, 3.5_

---

- [x] 2. フロントエンド: 型定義と PlaceCard の更新

- [x] 2.1 (P) 検索 API レスポンスの型定義を other_candidates 対応に更新する
  - reason を持たない `Candidate` 基底型を定義する
  - `Recommendation` を `Candidate` の拡張型（reason あり）として再定義する
  - `OtherCandidate` 型エイリアスを `Candidate` として定義する
  - `SearchResponse` に `other_candidates: OtherCandidate[]` フィールドを追加する
  - _Requirements: 3.1, 3.2, 2.2_

- [x] 2.2 PlaceCard の reason を optional にして追加候補にも対応できるようにする
  - `PlaceCardProps` の `reason` を省略可能（`reason?: string`）に変更する
  - `reason` が undefined の場合は推薦理由の表示要素を非表示にする
  - 既存テストが引き続き通ることを確認し、reason なしのレンダリングケースをテストに追加する
  - _Requirements: 2.2, 2.4_

---

- [x] 3. OtherCandidateSection コンポーネントの作成

- [x] 3.1 OtherCandidateSection コンポーネントを実装する
  - candidates が空、または isSearchLoading=true の場合は何も表示しない（null return）
  - isExpanded=false かつ候補が1件以上ある場合に「もっと見る」ボタンを表示する
  - isExpanded=true の場合はボタンを非表示にし、「その他の候補」セクションヘッダーと候補リストを表示する
  - 各候補の表示には PlaceCard を再利用し、reason は渡さない（undefined のため非表示になる）
  - ボタンクリック時に onExpand コールバックを呼び出す（isExpanded=true でボタンが消えるため連打防止は構造的に解決）
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5, 4.4_

- [x]* 3.2 OtherCandidateSection の受け入れ基準を Vitest でテストする
  - candidates が空のときボタンが表示されないことを検証する
  - isSearchLoading=true のときボタンが表示されないことを検証する
  - ボタンクリックで onExpand が呼ばれることを検証する
  - isExpanded=true で候補リストが表示されボタンが非表示になることを検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 4.4_

---

- [x] 4. App.tsx への統合と状態管理追加

- [x] 4.1 App.tsx に otherCandidates と showOtherCandidates の状態を追加する
  - `otherCandidates`（初期値 null）と `showOtherCandidates`（初期値 false）の状態を追加する
  - 検索開始時に両状態をリセット（null / false）する
  - 検索成功時に `response.other_candidates` を `setOtherCandidates` にセットする
  - _Requirements: 1.3, 4.1, 4.2, 4.3_

- [x] 4.2 OtherCandidateSection を App.tsx に組み込み、エッジケースを処理する
  - `otherCandidates !== null` を条件として OtherCandidateSection を RecommendationList の下に配置する
  - 「見つかりませんでした」表示条件を `recommendations.length === 0 && otherCandidates === null` に変更する
  - `recommendations.length === 0 && otherCandidates !== null && otherCandidates.length > 0` の場合に「AIのおすすめは見つかりませんでしたが、その他の候補があります」を表示する
  - _Requirements: 1.5, 2.5, 4.2, 4.3_

- [x]* 4.3 App.tsx の統合動作を Vitest でテストする
  - 検索成功後に other_candidates がある場合「もっと見る」ボタンが表示されることを検証する
  - 新規検索開始時にボタンおよび候補リストがリセットされることを検証する
  - 検索エラー時に OtherCandidateSection が表示されないことを検証する
  - _Requirements: 1.1, 1.3, 4.2_
