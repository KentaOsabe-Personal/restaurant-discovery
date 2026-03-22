module Api
  class SearchController < BaseController
    rescue_from QueryParserError, GooglePlacesError, RecommendationError do |exception|
      render json: { error: exception.message }, status: :bad_gateway
    end

    rescue_from StandardError do |exception|
      Rails.logger.error "#{exception.class}: #{exception.message}"
      render json: { error: "内部エラーが発生しました" }, status: :internal_server_error
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

      render json: {
        recommendations: [],
        parsed_conditions: {
          area: nil,
          genre: nil,
          price_level: nil
        }
      }, status: :ok
    end
  end
end
