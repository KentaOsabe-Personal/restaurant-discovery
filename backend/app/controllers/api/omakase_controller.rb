module Api
  class OmakaseController < BaseController
    rescue_from StandardError do |exception|
      Rails.logger.error "#{exception.class}: #{exception.message}"
      render json: { error: "内部エラーが発生しました" }, status: :internal_server_error
    end

    rescue_from GooglePlacesError, RecommendationError do |exception|
      Rails.logger.error "#{exception.class}: #{exception.message}"
      render json: { error: "外部サービスとの通信に失敗しました" }, status: :bad_gateway
    end

    rescue_from OmakaseService::UnknownArea do |exception|
      Rails.logger.error "#{exception.class}: #{exception.message}"
      render json: { error: "area must be one of ekimae/ekinan/furumachi/nagaoka" }, status: :unprocessable_content
    end

    def create
      area = params[:area]

      unless area.is_a?(String) && area.present?
        render json: { error: "area must be a non-empty string" }, status: :unprocessable_content
        return
      end

      conditions = OmakaseService.new.call(area)
      places = GooglePlacesService.new.call(conditions)

      if places.empty?
        render json: build_response([], conditions), status: :ok
        return
      end

      sampled = places.sample(5)
      query = "#{conditions[:sub_area]}で夜の居酒屋・バーおまかせ"
      recommendations = RecommendationService.new.call(sampled, query, min_count: 5, max_count: 5)

      render json: build_response(recommendations, conditions), status: :ok
    end

    private

    def build_response(recommendations, conditions)
      {
        recommendations: recommendations,
        other_candidates: [],
        parsed_conditions: {
          area: conditions[:area],
          genre: conditions[:genre],
          price_level: conditions[:price_level],
          keyword: conditions[:keyword]
        },
        omakase: {
          area_id: conditions[:area_id],
          sub_area: conditions[:sub_area]
        }
      }
    end
  end
end
