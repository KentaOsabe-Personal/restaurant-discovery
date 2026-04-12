# Research Log: recommendation-tuning

## Discovery Scope
Extension タイプ（既存 RecommendationService の改善）。Light discovery を実施。

## Key Findings

### 既存実装の確認

**RecommendationService#call（現状）**
```ruby
def call(places, query, min_count: 3, max_count: 5)
```
- `build_user_message(places, query)` は `{query:, candidates: [{name, rating, price_level, address}]}` のみ送信
- `parsed_conditions` は渡されておらず、SearchController で生成されているが捨てられている

**SearchController の問題箇所（現状）**
```ruby
parsed_conditions = QueryParserService.new.call(query)  # 生成される
# ...
recommendations = RecommendationService.new.call(places, query)  # parsed_conditions が渡されない
```

**OmakaseController**
```ruby
recommendations = RecommendationService.new.call(sampled, query, min_count: 5, max_count: 5)
# parsed_conditions は存在しない（query は手動生成文字列）
```

**QueryParserService の戻り値構造**
```ruby
{ area: String|nil, genre: String|nil, price_level: String|nil, keyword: String|nil }
# すべてシンボルキー（symbolize_names: true）
```

**テストスタブ方法**
- APIキー: `allow(File).to receive(:read).with("/openai_apikey").and_return("test-key")`
- OpenAI: WebMock + `stub_request(:post, "https://api.openai.com/v1/chat/completions")`
- ヘルパー: `build_place(name:, rating: 4.0, price_level:, address:)`

## Design Decisions

### parsed_conditions の渡し方
- **決定**: `parsed_conditions:` をオプションキーワード引数として追加（`nil` がデフォルト）
- **理由**: 後方互換を維持しつつ、既存のすべての呼び出し箇所（テスト含む）への影響を最小化できる

### OmakaseController の parsed_conditions 生成
- **決定**: `QueryParserService` を呼ばず、手動で `{ area:, genre:, price_level: nil, keyword: nil }` を生成する
- **理由**: おまかせクエリは `"#{sub_area}で夜の居酒屋・バーおまかせ"` という固定フォーマットで、`sub_area` が既に `conditions[:sub_area]` として利用可能。QueryParserService を呼び直すのはトークンの無駄。

### prefilter の設計
- **決定**: `call` 内に private メソッド `prefilter(places, min_count)` として追加
- **理由**: 別クラス化するほどの複雑さがなく、Service Object パターン内で完結する

### Generalization
- A-1（条件引き渡し）と A-2（プロンプト詳細化）は両方「AIへの入力品質向上」という同じ根本問題の解決策。設計では `build_user_message` の拡張 + `SYSTEM_PROMPT_TEMPLATE` 置き換えとして統合。

### Simplification
- 新規クラス・ファイルは不要。変更は `recommendation_service.rb`（主）+ 2コントローラー（呼び出し箇所のみ）+ spec に限定。
