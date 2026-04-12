class RecommendationService
  MODEL = "gpt-5-nano"
  API_KEY_PATH = "/openai_apikey"

  SYSTEM_PROMPT_TEMPLATE = <<~PROMPT
    あなたはレストラン推薦アシスタントです。
    ユーザーの検索条件（conditions）と候補店リスト（candidates）を受け取り、
    最も適した %<min>d〜%<max>d 件を選んでください。

    ## 選定基準（優先順）
    1. 条件との一致度: conditions の area/genre/price_level との一致を最優先にしてください
    2. 評価（rating）: 4.0以上を優秀、3.5〜4.0を普通、3.5未満は他に代替がなければ避けてください
    3. 価格帯（price_level）: conditions で価格帯が指定されている場合は必ず一致させてください

    ## 除外基準
    - rating が null かつ同等の評価済み候補がある場合は除外
    - conditions の価格帯と明確に合わない場合は除外

    ## 出力規則
    - candidates に含まれる name をそのまま使用してください（変更・省略・翻訳不可）
    - reason: 他の候補と比べてなぜこの店を推薦するか、条件への合致点を含めて日本語で1〜2文で説明
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

  def call(places, query, min_count: 3, max_count: 5, parsed_conditions: nil)
    return [] if places.empty?

    places = prefilter(places, min_count)
    prompt = format(SYSTEM_PROMPT_TEMPLATE, min: min_count, max: max_count)
    client = build_client
    response = client.chat(
      parameters: {
        model: MODEL,
        messages: [
          { role: "system", content: prompt },
          { role: "user", content: build_user_message(places, query, parsed_conditions) }
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

  def prefilter(places, min_count)
    rated = places.select { |p| p[:rating] && p[:rating] >= 3.5 }
    rated.size >= min_count ? rated : places
  end

  def build_user_message(places, query, parsed_conditions = nil)
    candidates = places.map { |p| p.slice(:name, :rating, :price_level, :address) }
    payload = { query: query, candidates: candidates }
    payload[:conditions] = parsed_conditions if parsed_conditions
    payload.to_json
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
