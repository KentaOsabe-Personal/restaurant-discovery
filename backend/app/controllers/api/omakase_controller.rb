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
      if params[:mode] == "ramen"
        create_ramen
      else
        create_izakaya
      end
    end

    private

    def create_ramen
      travel_time = params[:travel_time].presence

      if travel_time && !RamenOmakaseService::TRAVEL_TIME_RANGES.key?(travel_time)
        render json: { error: "travel_time は within_30min, within_1hour, 1_to_2_hours のいずれかを指定してください" }, status: :unprocessable_content
        return
      end

      conditions = RamenOmakaseService.new.call(travel_time: travel_time)
      Rails.logger.info "OmakaseController ramen: mode=ramen, area_id=#{conditions[:area_id]}, sub_area=#{conditions[:sub_area]}, travel_time=#{travel_time}"

      places = GooglePlacesService.new.call(conditions)

      if places.empty?
        Rails.logger.warn "OmakaseController ramen: places 0 (area_id=#{conditions[:area_id]})"
        render json: build_ramen_response([], [], conditions), status: :ok
        return
      end

      filtered = filter_by_area(places, conditions[:area_names])
      if filtered.empty?
        Rails.logger.warn "OmakaseController ramen: places 0 after address filter (area_id=#{conditions[:area_id]})"
        render json: build_ramen_response([], [], conditions), status: :ok
        return
      end

      distance_calc = DistanceCalculatorService.new
      filtered_with_distance = filtered.map do |place|
        if place[:lat] && place[:lng]
          distance_km = distance_calc.call(HOME_LOCATION[:lat], HOME_LOCATION[:lng], place[:lat], place[:lng])
          place.merge(distance_km: distance_km)
        else
          place.merge(distance_km: nil)
        end
      end

      parsed_conditions = { area: conditions[:sub_area], genre: "ラーメン", price_level: nil, keyword: nil }
      query = "#{conditions[:sub_area]}のラーメンおまかせ"

      recommendations = RecommendationService.new.call(
        filtered_with_distance,
        query,
        parsed_conditions: parsed_conditions,
        mode: "ramen"
      )

      recommended_names = recommendations.map { |r| r[:name] }.to_set
      other_candidates = filtered_with_distance.reject { |p| recommended_names.include?(p[:name]) }

      render json: build_ramen_response(recommendations, other_candidates, conditions), status: :ok
    rescue RamenOmakaseService::NoEligibleArea => e
      Rails.logger.warn "OmakaseController ramen: eligible area 0 (travel_time=#{params[:travel_time]})"
      render json: { error: e.message }, status: :unprocessable_content
    end

    def create_izakaya
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

      filtered = filter_by_area(places, conditions[:area_names])
      if filtered.empty?
        Rails.logger.warn("OmakaseController: area filter reduced results to 0 (area_id=#{conditions[:area_id]}, sub_area=#{conditions[:sub_area]})")
        render json: build_response([], conditions), status: :ok
        return
      end

      sampled = filtered.sample(5)
      query = "#{conditions[:sub_area]}で夜の居酒屋・バーおまかせ"
      parsed_conditions = { area: conditions[:sub_area], genre: "居酒屋・バー", price_level: nil, keyword: nil }
      recommendations = RecommendationService.new.call(sampled, query, min_count: 5, max_count: 5, parsed_conditions: parsed_conditions)

      render json: build_response(recommendations, conditions), status: :ok
    end

    def filter_by_area(places, area_names)
      places.select do |place|
        area_names.any? { |name| place[:address].to_s.include?(name) }
      end
    end

    def build_ramen_response(recommendations, other_candidates, conditions)
      {
        recommendations: recommendations,
        other_candidates: other_candidates,
        parsed_conditions: {
          area: conditions[:sub_area],
          genre: "ラーメン",
          price_level: nil,
          keyword: nil
        },
        omakase: {
          mode: "ramen",
          area_id: conditions[:area_id],
          sub_area: conditions[:sub_area],
          travel_time: conditions[:travel_time]
        }
      }
    end

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
