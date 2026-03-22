class RecommendationService
  MODEL = "gpt-5-nano"
  API_KEY_PATH = "/openai_apikey"

  SYSTEM_PROMPT = <<~PROMPT
    あなたはレストラン推薦アシスタントです。
    ユーザーのクエリと候補店リスト（candidates）を受け取り、最も適した 3〜5 件を選んでください。

    選定基準: クエリとの関連性、評価（rating）、価格帯（price_level）
    出力: candidates に含まれる name をそのまま使用してください（変更しないこと）
    reason: 各店舗を推薦する理由を日本語で簡潔に説明してください
  PROMPT

  RESPONSE_SCHEMA = {
    type: "json_schema",
    json_schema: {
      name: "recommendations",
      strict: true,
      schema: {
        type: "object",
        properties: {
          recommendations: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name:   { type: "string" },
                reason: { type: "string" }
              },
              required: %w[name reason],
              additionalProperties: false
            }
          }
        },
        required: %w[recommendations],
        additionalProperties: false
      }
    }
  }.freeze

  def call(places, query)
    return [] if places.empty?

    client = build_client
    response = client.chat(
      parameters: {
        model: MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: build_user_message(places, query) }
        ],
        response_format: RESPONSE_SCHEMA
      }
    )

    merge_recommendations(places, response)
  rescue Faraday::ClientError => e
    Rails.logger.error("RecommendationService: #{e.class} - #{e.message}")
    raise RecommendationError, "OpenAI API クライアントエラー: #{e.message}"
  rescue Faraday::ServerError => e
    Rails.logger.error("RecommendationService: #{e.class} - #{e.message}")
    raise RecommendationError, "OpenAI API サーバーエラー: #{e.message}"
  rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
    Rails.logger.error("RecommendationService: #{e.class} - #{e.message}")
    raise RecommendationError, "OpenAI API 接続エラー: #{e.message}"
  rescue JSON::ParserError => e
    Rails.logger.error("RecommendationService: #{e.class} - #{e.message}")
    raise RecommendationError, "OpenAI API レスポンスの JSON パースエラー: #{e.message}"
  rescue Errno::ENOENT => e
    Rails.logger.error("RecommendationService: #{e.class} - #{e.message}")
    raise RecommendationError, "API キーファイルが見つかりません: #{e.message}"
  end

  private

  def build_client
    api_key = File.read(API_KEY_PATH).strip
    OpenAI::Client.new(access_token: api_key)
  end

  def build_user_message(places, query)
    candidates = places.map { |p| p.slice(:name, :rating, :price_level, :address) }
    { query: query, candidates: candidates }.to_json
  end

  def merge_recommendations(places, response)
    content = response.dig("choices", 0, "message", "content")
    parsed = JSON.parse(content, symbolize_names: true)

    places_by_name = places.index_by { |p| p[:name] }

    parsed[:recommendations].filter_map do |rec|
      place = places_by_name[rec[:name]]
      next unless place

      place.merge(reason: rec[:reason])
    end
  end
end
