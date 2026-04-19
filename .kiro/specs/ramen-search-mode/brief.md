# Brief: ramen-search-mode

## 課題

現在のアプリは居酒屋・バー検索に特化しており、ラーメン屋を探したいときに使えない。
ユーザー（個人利用）は新潟県内のラーメン屋を自然文で検索し、AI推薦を受けたい。

## 現状

- 居酒屋・バー向けの検索パイプライン（QueryParser → GooglePlaces → Recommendation）が稼働中
- フロントエンドは単一の検索モードのみ（タブ切り替えなし）
- おまかせ機能は居酒屋・バー固定（4エリア: 駅前・駅南・古町・長岡）
- フィードバック再レコメンド・食べログリンク・検索履歴は実装済み

## 望む結果

- 画面上部のタブで「居酒屋・バー」と「ラーメン」を切り替えられる
- ラーメンタブで自然文検索すると、ジャンル「ラーメン」が自動付与されて検索される
- AIがラーメンの特徴（味の系統・麺の太さ等）を考慮して推薦理由を提示する
- 既存機能（フィードバック再レコメンド・食べログリンク・検索履歴・地図表示）がラーメンタブでもそのまま動作する

## アプローチ

既存の `/api/search` エンドポイントに `mode` パラメータを追加し、ラーメンモード時はQueryParserService/RecommendationServiceのプロンプトをラーメン向けに切り替える。フロントエンドはタブUIを追加し、アクティブタブに応じて `mode` を送信する。refine API も同様に `mode` を受け取る。

## スコープ

- **含む**:
  - App.tsx にタブUI（居酒屋・バー / ラーメン）を追加
  - タブ切り替え時に検索結果・状態をリセット
  - 居酒屋タブ: 既存機能そのまま（おまかせボタン含む）
  - ラーメンタブ: 自然文検索 + 地図表示 + AI推薦 + フィードバック再レコメンド + 食べログリンク
  - ラーメンタブではおまかせボタンは非表示（Phase 3で対応）
  - 検索履歴のタブ別管理
  - バックエンド: `/api/search` に `mode` パラメータ追加
  - QueryParserServiceのプロンプト拡張（ラーメン検索時はジャンルに「ラーメン」を自動付与）
  - RecommendationServiceのプロンプト調整（味の特徴・麺の太さ等を推薦理由に含める）
  - Google Places APIの検索をラーメンモードで適切に動作させる
- **含まない**:
  - 距離フィルター（Phase 2 distance-filter で対応）
  - ラーメンおまかせ機能（Phase 3 ramen-omakase で対応）
  - 自宅位置の設定（Phase 2 で対応）

## バウンダリ候補

- フロントエンド: タブ状態管理 + API呼び出し時のmode付与
- バックエンド: サービス層のモード別プロンプト切り替え
- API契約: mode パラメータの追加（search / refine 共通）

## スコープ外（明示的非目標）

- 新規エンドポイントの作成（既存 `/api/search` を拡張）
- ラーメンのサブジャンル別フィルター
- 距離ベースの検索範囲制限

## 上流 / 下流

- **上流**: 既存の search-controller-integration, query-parser-service, recommendation-service, google-places-service の実装
- **下流**: distance-filter（このSpecのタブUI・mode基盤に依存）、ramen-omakase（ラーメンタブ上にボタン追加）

## 既存Specとの接点

- **拡張対象**: search-controller-integration（mode パラメータ追加）
- **隣接**: query-parser-service, recommendation-service, google-places-service（プロンプト・パラメータ拡張）

## 制約

- 既存の居酒屋・バー検索機能を壊さないこと（mode未指定時は従来動作）
- タブ状態は App.tsx の useState で管理（シンプルに保つ）
- 既存の検索パイプラインを再利用し、コード重複を避ける
