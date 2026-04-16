# Requirements Document

## Introduction
本仕様は「再レコメンド機能（フィードバック付き絞り込み）」を定義する。ユーザーがAIレコメンド結果を受け取った後、自然文フィードバックを入力することで検索条件を更新し、新しい候補店を取得した上でAIが再選別する機能。フィードバックは元の検索条件にマージされ、指定した内容（個室・価格帯・雰囲気など）が次のレコメンドに最優先で反映される。

## Boundary Context
- **In scope**: フィードバック入力UI（テキスト入力＋送信ボタン）、POST /api/refine エンドポイント、フィードバックの構造化条件への変換と元条件とのマージ、マージ済み条件による店舗候補の再取得、フィードバック最優先のAI再選別、再選別結果のフロントエンド表示更新
- **Out of scope**: フィードバック履歴の永続化・表示、ユーザー認証・ログイン、フィードバックの分析・機械学習、おまかせ機能への再レコメンド適用
- **Adjacent expectations**: 既存の自然言語解析・店舗候補取得・AI推薦の各処理が再利用可能な状態であること；SearchConditionTagsが `parsed_conditions` の更新を表示できること

## Requirements

### Requirement 1: フィードバック入力UI

**Objective:** レコメンド結果を受け取ったユーザーとして、自然文でフィードバックを入力し再レコメンドをリクエストできること。より自分の好みに合った店を見つけたい。

#### Acceptance Criteria

1. When レコメンド結果が1件以上表示されており検索処理が完了している, the フロントエンド shall フィードバック入力フォーム（テキストボックスと送信ボタン）を表示する
2. While フィードバックテキストが空文字列または空白のみである, the フロントエンド shall 送信ボタンを無効化する
3. While 再レコメンドのリクエストが処理中である, the フロントエンド shall 送信ボタンを操作不能にし、処理中であることをユーザーに伝える状態を表示する
4. When レコメンド結果が0件または未取得の状態である, the フロントエンド shall フィードバック入力フォームを表示しない

---

### Requirement 2: 再レコメンドAPIエンドポイント

**Objective:** フロントエンドとして、フィードバックと元クエリ情報をサーバーに送信し、絞り込まれた再レコメンド結果を受け取れること。

#### Acceptance Criteria

1. When POST /api/refine に `feedback`（空白を除いた非空文字列）・`original_query`・`parsed_conditions` を送信する, the Refine API shall HTTP 200 で `recommendations`・`other_candidates`・`parsed_conditions` を返す
2. If `feedback` が空文字列・空白のみ・または存在しない, the Refine API shall HTTP 422 Unprocessable Content でエラーメッセージを返す
3. When 外部サービスとの通信がいずれかの処理段階で失敗する, the Refine API shall HTTP 502 Bad Gateway でエラーレスポンスを返す
4. The Refine API shall リクエストボディに候補店一覧（all_candidates）を含めることを要求しない

---

### Requirement 3: フィードバックの条件変換とマージ

**Objective:** システムとして、ユーザーのフィードバック自然文を構造化条件（エリア・ジャンル・価格帯・キーワード）に変換し、元の検索条件と正しく統合すること。

#### Acceptance Criteria

1. When フィードバックを受信する, the Refine API shall フィードバックテキストをエリア・ジャンル・価格帯・キーワードの構造化条件に変換する
2. When フィードバックから取得した構造化条件をマージする, the Refine API shall null でない値のみを元の条件に上書き適用し、null の項目は元の条件を維持する
3. When フィードバックの解析結果がすべてnullになる（例: 「雰囲気が良いお店が良い」など具体条件なし）, the Refine API shall 元の検索条件をそのまま維持して後続処理を継続する

---

### Requirement 4: マージ済み条件による店舗候補の再取得

**Objective:** システムとして、マージ後の条件で新たな店舗候補を取得すること。フィードバックが検索条件に反映された結果、前回とは異なる候補店が含まれる可能性があること。

#### Acceptance Criteria

1. When マージ済みの条件が確定する, the Refine API shall マージ済み条件で店舗候補を取得する
2. If 店舗候補が0件返る, the Refine API shall `recommendations: []`・`other_candidates: []`・`parsed_conditions: マージ済み条件` をHTTP 200で返す

---

### Requirement 5: フィードバック最優先のAI再選別

**Objective:** AIがフィードバックを最も優先度の高い選定基準として反映した上で3〜5件を再選別すること。

#### Acceptance Criteria

1. When 取得した候補店が1件以上存在する, the Refine API shall 候補店の中からAIが3〜5件を再選別し各店の推薦理由を付与して返す
2. The Refine API shall フィードバック内容を他の選定基準より優先してAI再選別に反映させる

---

### Requirement 6: 再レコメンド結果の表示更新

**Objective:** 再レコメンド後、フロントエンドが新しい結果と検索条件タグを正しく表示更新すること。

#### Acceptance Criteria

1. When 再レコメンドAPIが正常レスポンスを返す, the フロントエンド shall 表示中のレコメンド・他の候補・検索条件タグをすべて新しいレスポンス内容で上書き更新する
2. When 再レコメンドAPIが正常レスポンスを返す, the フロントエンド shall 「もっと見る」の展開状態をリセットし他の候補店を非表示にする
3. When 再レコメンドAPIが正常レスポンスを返す, the フロントエンド shall 地図上の選択済みマーカー・情報ウィンドウの表示状態をリセットする

---

### Requirement 7: エラーハンドリング

**Objective:** 再レコメンド失敗時にユーザーが状況を把握し次のアクションを取れること。

#### Acceptance Criteria

1. If 再レコメンドAPIがエラーレスポンスを返す, the フロントエンド shall エラーメッセージをユーザーに表示する
2. If ネットワークエラーその他予期しないエラーが発生する, the フロントエンド shall エラーメッセージをユーザーに表示する
3. When エラーが発生する, the フロントエンド shall 直前のレコメンド結果の表示状態を維持する
