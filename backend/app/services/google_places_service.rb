class GooglePlacesService
  API_ENDPOINT = "https://places.googleapis.com/v1/places:searchText"
  API_KEY_PATH = "/google_places_apikey"
  FIELD_MASK = "places.displayName,places.rating,places.priceLevel,places.formattedAddress,places.googleMapsUri,places.location"
  PAGE_SIZE = 20
  VALID_PRICE_LEVELS = %w[
    PRICE_LEVEL_INEXPENSIVE
    PRICE_LEVEL_MODERATE
    PRICE_LEVEL_EXPENSIVE
    PRICE_LEVEL_VERY_EXPENSIVE
  ].freeze
  RAMEN_FLAVOR_MODIFIERS = %w[塩 醤油 味噌 豚骨 鶏白湯 鶏清湯 あっさり こってり 辛].freeze
  RAMEN_STANDALONE_TYPES = %w[まぜそば つけ麺 担々麺 油そば].freeze

  def call(conditions)
    connection = build_connection
    body = build_request_body(conditions)
    response = connection.post do |req|
      req.body = body.to_json
    end
    format_places(JSON.parse(response.body))
  rescue Faraday::ClientError, Faraday::ServerError => e
    Rails.logger.error("GooglePlacesService: #{e.class} - #{e.message}")
    raise GooglePlacesError, "Google Places API エラー: #{e.message}"
  rescue Faraday::ConnectionFailed, Faraday::TimeoutError => e
    Rails.logger.error("GooglePlacesService: #{e.class} - #{e.message}")
    raise GooglePlacesError, "Google Places API エラー: #{e.message}"
  rescue JSON::ParserError => e
    Rails.logger.error("GooglePlacesService: #{e.class} - #{e.message}")
    raise GooglePlacesError, "Google Places API レスポンスの JSON パースエラー: #{e.message}"
  rescue Errno::ENOENT => e
    Rails.logger.error("GooglePlacesService: #{e.class} - #{e.message}")
    raise GooglePlacesError, "API キーファイルが見つかりません: #{e.message}"
  end

  private

  def build_connection
    api_key = File.read(API_KEY_PATH).strip
    Faraday.new(url: API_ENDPOINT) do |f|
      f.headers["X-Goog-Api-Key"] = api_key
      f.headers["X-Goog-FieldMask"] = FIELD_MASK
      f.headers["Content-Type"] = "application/json"
      f.response :raise_error
    end
  end

  def build_request_body(conditions)
    body = {
      textQuery: build_text_query(conditions),
      languageCode: "ja",
      pageSize: PAGE_SIZE
    }
    body[:priceLevels] = [ conditions[:price_level] ] if VALID_PRICE_LEVELS.include?(conditions[:price_level])
    body
  end

  def build_text_query(conditions)
    area = conditions[:area]
    genre = conditions[:genre]
    keyword = conditions[:keyword]

    if genre == "ラーメン" && keyword.present?
      if RAMEN_FLAVOR_MODIFIERS.include?(keyword)
        return [ area, "#{keyword}ラーメン" ].compact.join(" ")
      elsif RAMEN_STANDALONE_TYPES.include?(keyword)
        return [ area, keyword ].compact.join(" ")
      end
    end

    [ area, genre, keyword ].compact.join(" ")
  end

  def format_places(response_body)
    places = response_body["places"]
    return [] if places.nil? || places.empty?
    places.map { |place| format_place(place) }
  end

  def format_place(place)
    {
      name: place.dig("displayName", "text"),
      rating: place["rating"],
      price_level: place["priceLevel"],
      address: place["formattedAddress"],
      google_maps_url: place["googleMapsUri"],
      lat: place.dig("location", "latitude"),
      lng: place.dig("location", "longitude")
    }
  end
end
