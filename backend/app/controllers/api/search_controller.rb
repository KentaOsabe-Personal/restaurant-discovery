module Api
  class SearchController < BaseController
    TRAVEL_TIME_RANGES = {
      "within_30min" => { min_km: 0, max_km: 30 },
      "within_1hour" => { min_km: 0, max_km: 60 },
      "1_to_2_hours" => { min_km: 60, max_km: 120 }
    }.freeze

    rescue_from StandardError do |exception|
      Rails.logger.error "#{exception.class}: #{exception.message}"
      render json: { error: "内部エラーが発生しました" }, status: :internal_server_error
    end

    rescue_from QueryParserError, GooglePlacesError, RecommendationError do |exception|
      Rails.logger.error "#{exception.class}: #{exception.message}"
      render json: { error: "外部サービスとの通信に失敗しました" }, status: :bad_gateway
    end

    def create
      query = params[:query]

      unless query.is_a?(String)
        render json: { error: "query must be a string" }, status: :unprocessable_content
        return
      end

      if query.strip.empty?
        render json: { error: "query can't be blank" }, status: :unprocessable_content
        return
      end

      travel_time = params[:travel_time]
      if travel_time.present? && !TRAVEL_TIME_RANGES.key?(travel_time)
        render json: { error: "travel_time は within_30min, within_1hour, 1_to_2_hours のいずれかを指定してください" }, status: :unprocessable_content
        return
      end

      mode = params[:mode] || "izakaya"
      parsed_conditions = QueryParserService.new.call(query, mode: mode)
      parsed_conditions[:genre] = "ラーメン" if mode == "ramen"

      places = GooglePlacesService.new.call(parsed_conditions)

      if mode == "ramen"
        distance_calc = DistanceCalculatorService.new
        places = places.map do |place|
          if place[:lat] && place[:lng]
            distance_km = distance_calc.call(HOME_LOCATION[:lat], HOME_LOCATION[:lng], place[:lat], place[:lng])
            place.merge(distance_km: distance_km)
          else
            Rails.logger.warn "[DistanceCalculator] #{place[:name]} has nil lat/lng, setting distance_km to nil"
            place.merge(distance_km: nil)
          end
        end

        if travel_time.present?
          range = TRAVEL_TIME_RANGES[travel_time]
          places = places.select do |place|
            place[:distance_km] && range[:min_km] <= place[:distance_km] && place[:distance_km] <= range[:max_km]
          end
        end
      end

      if places.empty?
        render json: {
          recommendations: [],
          other_candidates: [],
          parsed_conditions: {
            area: parsed_conditions[:area],
            genre: parsed_conditions[:genre],
            price_level: parsed_conditions[:price_level],
            keyword: parsed_conditions[:keyword]
          }
        }, status: :ok
        return
      end

      recommendations = RecommendationService.new.call(places, query, parsed_conditions: parsed_conditions, mode: mode)

      recommended_names = recommendations.map { |r| r[:name] }.to_set
      other_candidates = places.reject { |p| recommended_names.include?(p[:name]) }

      render json: {
        recommendations: recommendations,
        other_candidates: other_candidates,
        parsed_conditions: {
          area: parsed_conditions[:area],
          genre: parsed_conditions[:genre],
          price_level: parsed_conditions[:price_level],
          keyword: parsed_conditions[:keyword]
        }
      }, status: :ok
    end
  end
end
