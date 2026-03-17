# Implementation Plan

- [x] 1. 依存関係と基盤の構築
  - ruby-openai gem を Gemfile に追加し、Docker 環境で bundle install を実行して利用可能にする
  - `app/services/` ディレクトリを新設する
  - OpenAI API エラーをラップするカスタム例外クラスを作成する（StandardError を継承）
  - _Requirements: 3.3, 4.1, 4.2, 4.3, 5.3_

- [x] 2. QueryParserService のコア実装
  - OpenAI クライアントを初期化し、API キーをマウントされたファイルから読み取る
  - Chat Completions API を JSON Schema モード（Structured Outputs）で呼び出す処理を実装する
  - 自然文からエリア・ジャンル・価格帯・キーワードを抽出するシステムプロンプトを日本語で設計する（具体例を含める）
  - price_level フィールドを JSON Schema の enum 制約で Google Places API の列挙値（PRICE_LEVEL_FREE〜VERY_EXPENSIVE）に限定する
  - 各フィールドを nullable として定義し、読み取れない条件は null として返すようにする
  - モデルとして gpt-5-nano を使用する
  - レスポンスの JSON をパースし、area / genre / price_level / keyword の4キーを持つハッシュとして返却する
  - API エラー（4xx/5xx）、タイムアウト、JSON パースエラーをすべてカスタム例外にラップして raise する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 3.1, 3.2, 3.3, 5.1, 5.2_

- [ ] 3. テストの実装
  - WebMock で OpenAI API の Chat Completions エンドポイントをモックするテスト基盤を構築する
  - 全条件（エリア・ジャンル・価格帯・キーワード）を含む自然文で、全フィールドが正しく抽出されることを検証する
  - 一部の条件のみ含む自然文で、欠落フィールドが nil になることを検証する
  - 空文字列で全フィールドが nil になることを検証する
  - price_level が正しい列挙値（PRICE_LEVEL_* のいずれか）として返されることを検証する
  - OpenAI API の HTTP エラー（4xx/5xx）でカスタム例外が raise されることを検証する
  - タイムアウトでカスタム例外が raise されることを検証する
  - 不正な JSON レスポンスでカスタム例外が raise されることを検証する
  - リクエストボディの response_format パラメータが正しい JSON Schema を含むことを検証する
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 2.1, 2.2, 4.1, 4.2, 4.3_
