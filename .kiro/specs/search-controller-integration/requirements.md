# 要件定義書

## はじめに

本仕様は `POST /api/search` エンドポイントを完全に動作するエンドツーエンドフローへ統合するものです。現状の SearchController はスタブ（固定レスポンス）を返すのみですが、本仕様により QueryParserService・GooglePlacesService・RecommendationService を順に呼び出す実装へ置き換えます。各サービスの例外は適切な HTTP ステータスコードへ変換し、呼び出し元に意味のあるエラーレスポンスを返します。

---

## 要件

### 要件 1: エンドツーエンド検索フロー

**目的:** ユーザーとして、自然文クエリを送信するだけで AI が厳選したレストラン候補を受け取りたい。それにより、店探しの手間をなくせる。

#### 受け入れ基準

1. When `POST /api/search` に有効な `query` が送信された, the SearchController shall QueryParserService を呼び出して自然文を構造化された検索条件に変換する
2. When QueryParserService が構造化条件を返した, the SearchController shall GooglePlacesService を呼び出して候補店リストを取得する
3. When GooglePlacesService が候補店リストを返した, the SearchController shall RecommendationService を呼び出して 3〜5 件に厳選した推薦結果を生成する
4. When 全サービスの処理が正常に完了した, the SearchController shall HTTP 200 と以下の JSON 構造を返す:
   ```json
   {
     "recommendations": [
       {
         "name": "店舗名",
         "rating": 4.2,
         "price_level": "PRICE_LEVEL_MODERATE",
         "address": "住所",
         "google_maps_url": "https://maps.google.com/...",
         "reason": "推薦理由（日本語）"
       }
     ],
     "parsed_conditions": {
       "area": "渋谷",
       "genre": "イタリアン",
       "price_level": "PRICE_LEVEL_INEXPENSIVE"
     }
   }
   ```
5. The SearchController shall サービスの呼び出し順序を QueryParserService → GooglePlacesService → RecommendationService の順に固定する

---

### 要件 2: 検索結果なし時の応答

**目的:** ユーザーとして、候補が見つからない場合にもクリーンなレスポンスを受け取りたい。それにより、フロントエンドが空状態を適切に表示できる。

#### 受け入れ基準

1. When GooglePlacesService が空配列を返した, the SearchController shall RecommendationService を呼び出さずに HTTP 200 と `{"recommendations": [], "parsed_conditions": {...}}` を返す

---

### 要件 3: 入力バリデーション

**目的:** ユーザーとして、不正なリクエストに対して分かりやすいエラーレスポンスを受け取りたい。それにより、クライアント側でエラーを適切に処理できる。

#### 受け入れ基準

1. If `query` パラメータが存在しない, then the SearchController shall HTTP 422 と `{"error": "..."}` を返す
2. If `query` が空文字列（空白のみを含む）, then the SearchController shall HTTP 422 と `{"error": "..."}` を返す
3. If `query` が文字列型以外（数値・配列・オブジェクト等）, then the SearchController shall HTTP 422 と `{"error": "..."}` を返す

---

### 要件 4: 外部 API エラーのハンドリング

**目的:** システム管理者として、外部 API 障害時に適切な HTTP ステータスで障害箇所を特定したい。それにより、問題の切り分けとモニタリングが容易になる。

#### 受け入れ基準

1. If QueryParserService が `QueryParserError` を raise した, then the SearchController shall HTTP 502 と `{"error": "..."}` を返す
2. If GooglePlacesService が `GooglePlacesError` を raise した, then the SearchController shall HTTP 502 と `{"error": "..."}` を返す
3. If RecommendationService が `RecommendationError` を raise した, then the SearchController shall HTTP 502 と `{"error": "..."}` を返す
4. If 上記以外の予期しない例外が発生した, then the SearchController shall HTTP 500 と `{"error": "..."}` を返す
5. The SearchController shall 例外発生時にエラー内容を Rails ログに出力する

---

### 要件 5: レスポンスデータの整合性

**目的:** フロントエンド開発者として、API レスポンスの構造が常に一定であることを信頼したい。それにより、型安全な実装ができる。

#### 受け入れ基準

1. The SearchController shall `recommendations` 配列の各要素に `name`, `rating`, `price_level`, `address`, `google_maps_url`, `reason` キーを必ず含める
2. The SearchController shall `rating` が Google Places から取得できない場合、当該フィールドを `null` として返す
3. The SearchController shall `price_level` が取得できない場合、当該フィールドを `null` として返す
4. The SearchController shall `parsed_conditions` に `area`, `genre`, `price_level` キーを必ず含め、取得できない場合は `null` とする
