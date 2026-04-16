module Api
  class RefineController < BaseController
    rescue_from StandardError do |exception|
      Rails.logger.error "#{exception.class}: #{exception.message}"
      render json: { error: "内部エラーが発生しました" }, status: :internal_server_error
    end

    rescue_from QueryParserError, GooglePlacesError, RecommendationError do |exception|
      Rails.logger.error "#{exception.class}: #{exception.message}"
      render json: { error: "外部サービスとの通信に失敗しました" }, status: :bad_gateway
    end

    def create
      feedback = params[:feedback]

      unless feedback.is_a?(String) && feedback.strip.present?
        render json: { error: "feedback must be a non-empty string" }, status: :unprocessable_content
        return
      end

      if feedback.length > 500
        render json: { error: "feedback must be 500 characters or fewer" }, status: :unprocessable_content
        return
      end

      original_query = params[:original_query].to_s
      original_conditions = parse_conditions(params[:parsed_conditions])

      delta_conditions = QueryParserService.new.call(feedback)
      merged_conditions = merge_conditions(original_conditions, delta_conditions)

      places = GooglePlacesService.new.call(merged_conditions)

      if places.empty?
        render json: {
          recommendations: [],
          other_candidates: [],
          parsed_conditions: format_conditions(merged_conditions)
        }, status: :ok
        return
      end

      recommendations = RecommendationService.new.call(
        places, original_query,
        parsed_conditions: merged_conditions,
        feedback: feedback
      )

      recommended_names = recommendations.map { |r| r[:name] }.to_set
      other_candidates = places.reject { |p| recommended_names.include?(p[:name]) }

      render json: {
        recommendations: recommendations,
        other_candidates: other_candidates,
        parsed_conditions: format_conditions(merged_conditions)
      }, status: :ok
    end

    private

    def parse_conditions(raw)
      return { area: nil, genre: nil, price_level: nil, keyword: nil } unless raw.is_a?(ActionController::Parameters)

      raw.permit(:area, :genre, :price_level, :keyword).to_h.symbolize_keys
    end

    def merge_conditions(base, delta)
      base.merge(delta.reject { |_, v| v.nil? })
    end

    def format_conditions(conditions)
      {
        area: conditions[:area],
        genre: conditions[:genre],
        price_level: conditions[:price_level],
        keyword: conditions[:keyword]
      }
    end
  end
end
