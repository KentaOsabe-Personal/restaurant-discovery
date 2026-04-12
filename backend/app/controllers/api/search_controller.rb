module Api
  class SearchController < BaseController
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

      parsed_conditions = QueryParserService.new.call(query)

      places = GooglePlacesService.new.call(parsed_conditions)

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

      recommendations = RecommendationService.new.call(places, query, parsed_conditions: parsed_conditions)

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
