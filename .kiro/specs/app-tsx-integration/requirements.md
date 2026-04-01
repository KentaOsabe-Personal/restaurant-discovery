# 要件定義書

## Project Description (Input)
Chunk10の内容を開発します

## Introduction

`App.tsx` 統合は、レストラン発見アプリのフロントエンドにおけるトップレベルコンポーネントの実装である。Chunk 7（APIクライアント）・Chunk 8（SearchInput）・Chunk 9（PlaceCard）で構築されたビルディングブロックを `App.tsx` に組み合わせ、ユーザーが自然文でレストランを検索し、AIによる推薦結果をカード一覧で確認できるエンドツーエンドの検索体験を提供する。

対象ファイルは以下の3点：
- `frontend/src/App.tsx` — トップレベルコンポーネント（SearchInput・RecommendationList の統合、状態管理）
- `frontend/src/components/RecommendationList.tsx` — 推薦結果リストを PlaceCard で表示するコンポーネント
- `frontend/src/App.test.tsx` — App コンポーネントの統合テスト

前提として以下がすでに実装済みであること：
- `frontend/src/api/search.ts` の `searchPlaces(query: string): Promise<SearchResponse>` 関数
- `frontend/src/types/search.ts` の `SearchResponse` / `Recommendation` 型（`photo_url`・`opening_hours` フィールドは削除済み）
- `frontend/src/components/SearchInput.tsx` の `SearchInput` コンポーネント
- `frontend/src/components/PlaceCard.tsx` の `PlaceCard` コンポーネント

---

## Requirements

### Requirement 1: SearchInput コンポーネントの統合

**Objective:** ユーザーとして、アプリを開いたとき検索フォームが表示されてほしい。そうすることで自然文でレストラン検索をすぐに開始できる。

#### Acceptance Criteria

1. The App コンポーネント shall `SearchInput` コンポーネントをレンダリングする。
2. The App コンポーネント shall アプリのタイトル（例: 「Restaurant Discovery」）を見出しとして表示する。
3. When ユーザーが `SearchInput` でクエリを送信した場合, the App コンポーネント shall その検索クエリ文字列を受け取り検索処理を開始する。
4. The App コンポーネント shall `SearchInput` に `onSubmit` コールバックを渡す。

---

### Requirement 2: 検索処理と状態管理

**Objective:** ユーザーとして、検索クエリを送信したらバックエンドに問い合わせが行われてほしい。そうすることで推薦結果が画面に表示されるようになる。

#### Acceptance Criteria

1. When ユーザーが検索クエリを送信した場合, the App コンポーネント shall `searchPlaces(query)` を呼び出す。
2. The App コンポーネント shall ローディング状態（`isLoading`）・推薦結果（`recommendations`）・エラー（`error`）を内部状態として管理する。
3. When `searchPlaces(query)` の呼び出しが開始された場合, the App コンポーネント shall `isLoading` を `true` に設定し、直前のエラー状態をクリアする。
4. When `searchPlaces(query)` が正常に完了した場合, the App コンポーネント shall レスポンスの `recommendations` 配列を状態に保存し、`isLoading` を `false` に設定する。
5. If `searchPlaces(query)` が例外を throw した場合, the App コンポーネント shall エラー状態を設定し、`isLoading` を `false` に設定する。
6. The App コンポーネント shall 同一クエリによる重複送信や前回の検索結果が混在しないよう、新しい検索開始時に前回の推薦結果をクリアする。

---

### Requirement 3: ローディング状態の表示

**Objective:** ユーザーとして、検索処理中に処理が進行中であることを視覚的に確認したい。そうすることで操作に対するフィードバックを受け取りロールアップを防げる。

#### Acceptance Criteria

1. While `isLoading` が `true` の場合, the App コンポーネント shall ローディングインジケーター（テキストまたはアニメーション）を表示する。
2. While `isLoading` が `true` の場合, the App コンポーネント shall `SearchInput` に `isLoading={true}` を渡し、入力・送信を無効化させる。
3. When 検索処理が完了した場合（正常・エラー問わず）, the App コンポーネント shall ローディングインジケーターを非表示にする。

---

### Requirement 4: 検索結果リストの表示

**Objective:** ユーザーとして、検索が成功したとき推薦された店舗が一覧で表示されてほしい。そうすることでどのレストランが推薦されたかを一目で確認できる。

#### Acceptance Criteria

1. When 検索が成功し `recommendations` 配列が1件以上存在する場合, the App コンポーネント shall 各 `Recommendation` に対して `PlaceCard` コンポーネントをレンダリングする。
2. The App コンポーネント shall 各 `PlaceCard` に `Recommendation` 型のフィールド（`name`・`rating`・`price_level`・`address`・`google_maps_url`・`reason`）を Props として渡す。
3. The App コンポーネント shall 複数の `PlaceCard` をリスト構造（例: `<ul>` / `<li>` または同等のコンテナ）でレンダリングする。
4. The App コンポーネント shall 各リストアイテムに一意の `key` プロパティを設定する（例: `google_maps_url` または配列インデックス）。

---

### Requirement 5: エラー状態の表示

**Objective:** ユーザーとして、検索に失敗したときエラーメッセージを確認したい。そうすることで何が起きたかを把握し再試行の判断ができる。

#### Acceptance Criteria

1. If `searchPlaces` の呼び出しが失敗した場合, the App コンポーネント shall ユーザーに向けたエラーメッセージを表示する。
2. The App コンポーネント shall エラーメッセージを推薦結果リストと同時に表示しない（エラー時は結果リストを非表示にする）。
3. When 新しい検索が開始された場合, the App コンポーネント shall 直前のエラーメッセージを非表示にする。

---

### Requirement 6: 初期状態・空状態の表示

**Objective:** ユーザーとして、検索前および結果が0件のときに適切な案内を見たい。そうすることで次のアクションを直感的に理解できる。

#### Acceptance Criteria

1. While 検索がまだ一度も実行されていない場合, the App コンポーネント shall 検索結果リストもエラーメッセージもローディングインジケーターも表示しない。
2. When 検索が成功したが `recommendations` 配列が空（0件）の場合, the App コンポーネント shall 条件に合うレストランが見つからなかったことをユーザーに通知するメッセージを表示する。
3. The App コンポーネント shall 空状態メッセージと推薦結果リストを同時に表示しない。

---

### Requirement 7: コンポーネント構成

**Objective:** 開発者として、App.tsx が適切にコンポーネントを組み合わせてほしい。そうすることで各コンポーネントの責務が分離され、保守しやすい構造になる。

#### Acceptance Criteria

1. The App コンポーネント shall `SearchInput`・`PlaceCard`・`searchPlaces` を import して使用する。
2. The App コンポーネント shall 推薦結果リストのレンダリング責務を `RecommendationList` コンポーネントに委譲してもよい（または App.tsx 内に直接記述してもよい）。
3. The App コンポーネント shall TypeScript の `strict` モードでコンパイルエラーが発生しない実装を持つ。
4. The App コンポーネント shall React の関数コンポーネントとして実装される。

---

### Requirement 8: テストカバレッジ

**Objective:** 開発者として、App コンポーネントの主要な動作が自動テストで保証されている状態にしたい。そうすることで将来の変更で回帰バグを早期に検出できる。

#### Acceptance Criteria

1. The テストスイート shall Vitest + Testing Library を使用して `App.test.tsx` に統合テストを記述する。
2. When `searchPlaces` が正常なレスポンスを返すようモックされた場合, the テスト shall 推薦店舗の名前がドキュメントに表示されることを検証する。
3. When `searchPlaces` が例外を throw するようモックされた場合, the テスト shall エラーメッセージがドキュメントに表示されることを検証する。
4. The テスト shall ローディング状態（送信後に SearchInput が disabled になること）を検証する。
5. The テストスイート shall `docker compose exec frontend pnpm test --run` で全テストがパスする。
