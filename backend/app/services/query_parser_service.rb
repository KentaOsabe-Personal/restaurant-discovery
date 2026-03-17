class QueryParserService
  MODEL = "gpt-5-nano"
  API_KEY_PATH = "/openai_apikey"

  SYSTEM_PROMPT = <<~PROMPT
    あなたはレストラン検索の自然文クエリを解析するアシスタントです。
    ユーザーの入力から以下の4つのフィールドを抽出してください:

    - area: エリア・地名（例: 渋谷、新宿、銀座）
    - genre: 料理ジャンル（例: イタリアン、和食、中華）
    - price_level: 価格帯。以下の列挙値のいずれかに変換してください:
      - PRICE_LEVEL_FREE: 無料
      - PRICE_LEVEL_INEXPENSIVE: 安い・リーズナブル・格安
      - PRICE_LEVEL_MODERATE: 普通・中程度
      - PRICE_LEVEL_EXPENSIVE: 高い・高級
      - PRICE_LEVEL_VERY_EXPENSIVE: 非常に高い・超高級
    - keyword: その他の特徴やキーワード（例: うまい、おしゃれ、個室）

    読み取れないフィールドは null としてください。
    空文字列の場合は全フィールドを null としてください。
  PROMPT

  RESPONSE_SCHEMA = {
    type: "json_schema",
    json_schema: {
      name: "parsed_query",
      strict: true,
      schema: {
        type: "object",
        properties: {
          area: { type: %w[string null] },
          genre: { type: %w[string null] },
          price_level: {
            type: %w[string null],
            enum: [
              nil,
              "PRICE_LEVEL_FREE",
              "PRICE_LEVEL_INEXPENSIVE",
              "PRICE_LEVEL_MODERATE",
              "PRICE_LEVEL_EXPENSIVE",
              "PRICE_LEVEL_VERY_EXPENSIVE"
            ]
          },
          keyword: { type: %w[string null] }
        },
        required: %w[area genre price_level keyword],
        additionalProperties: false
      }
    }
  }.freeze

  def call(query)
    client = build_client
    response = client.chat(
      parameters: {
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: query }
        ],
        response_format: RESPONSE_SCHEMA
      }
    )

    parse_response(response)
  rescue Faraday::Error => e
    Rails.logger.error("QueryParserService: #{e.class} - #{e.message}")
    raise QueryParserError, "OpenAI API エラー: #{e.message}"
  rescue JSON::ParserError => e
    Rails.logger.error("QueryParserService: #{e.class} - #{e.message}")
    raise QueryParserError, "OpenAI API レスポンスの JSON パースエラー: #{e.message}"
  rescue Errno::ENOENT => e
    Rails.logger.error("QueryParserService: #{e.class} - #{e.message}")
    raise QueryParserError, "API キーファイルが見つかりません: #{e.message}"
  end

  private

  def build_client
    api_key = File.read(API_KEY_PATH).strip
    OpenAI::Client.new(access_token: api_key)
  end

  def parse_response(response)
    content = response.dig("choices", 0, "message", "content")
    parsed = JSON.parse(content, symbolize_names: true)

    {
      area: parsed[:area],
      genre: parsed[:genre],
      price_level: parsed[:price_level],
      keyword: parsed[:keyword]
    }
  end
end
