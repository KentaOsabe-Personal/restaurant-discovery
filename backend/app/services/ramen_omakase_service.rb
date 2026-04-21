class RamenOmakaseService
  NoEligibleArea = Class.new(StandardError)

  TRAVEL_TIME_RANGES = {
    "within_30min" => { min_km: 0,  max_km: 30  },
    "within_1hour" => { min_km: 0,  max_km: 60  },
    "1_to_2_hours" => { min_km: 60, max_km: 120 }
  }.freeze

  BATTLE_AREAS = [
    { area_id: "niigata_chuo",    label: "新潟中央区", query_area: "新潟市中央区",  filter_terms: %w[中央区 古町 万代 本町],   center_lat: 37.9161, center_lng: 139.0364 },
    { area_id: "niigata_higashi", label: "新潟東区",   query_area: "新潟市東区",    filter_terms: %w[東区 紫竹山 太平 東中通], center_lat: 37.9250, center_lng: 139.0890 },
    { area_id: "niigata_nishi",   label: "新潟西区",   query_area: "新潟市西区",    filter_terms: %w[西区 坂井輪 寺尾 黒埼],  center_lat: 37.9058, center_lng: 138.9755 },
    { area_id: "toyosaka",        label: "豊栄",       query_area: "新潟市北区豊栄", filter_terms: %w[北区 豊栄 葛塚],         center_lat: 37.9800, center_lng: 139.1100 },
    { area_id: "shibata",         label: "新発田",     query_area: "新発田市",       filter_terms: %w[新発田市 新発田],         center_lat: 37.9550, center_lng: 139.3256 },
    { area_id: "tsubame_sanjo",   label: "燕三条",     query_area: "燕三条",         filter_terms: %w[燕市 三条市 燕三条],      center_lat: 37.6758, center_lng: 138.9124 },
    { area_id: "nagaoka",         label: "長岡",       query_area: "長岡市",         filter_terms: %w[長岡市 長岡],             center_lat: 37.4472, center_lng: 138.8450 },
    { area_id: "joetsu",          label: "上越",       query_area: "上越市",         filter_terms: %w[上越市 直江津 高田],      center_lat: 37.1000, center_lng: 138.2400 }
  ].freeze

  def initialize(random: Random.new)
    @random = random
  end

  # @param travel_time [String, nil] "within_30min" | "within_1hour" | "1_to_2_hours" | nil
  # @return [Hash] { area:, genre:, price_level:, keyword:, sub_area:, area_id:, area_names:, travel_time: }
  # @raise [RamenOmakaseService::NoEligibleArea] 条件に合うエリアが存在しない場合
  def call(travel_time:)
    eligible = eligible_areas(travel_time)
    raise NoEligibleArea, "条件に合うラーメン激戦区が見つかりませんでした" if eligible.empty?

    selected = eligible.sample(random: @random)

    {
      area:        selected[:query_area],
      genre:       "ラーメン",
      price_level: nil,
      keyword:     nil,
      sub_area:    selected[:label],
      area_id:     selected[:area_id],
      area_names:  selected[:filter_terms],
      travel_time: travel_time
    }
  end

  private

  def eligible_areas(travel_time)
    return BATTLE_AREAS.dup unless travel_time.present?

    range = TRAVEL_TIME_RANGES[travel_time]
    return [] unless range

    distance_calc = DistanceCalculatorService.new

    BATTLE_AREAS.select do |area|
      km = distance_calc.call(HOME_LOCATION[:lat], HOME_LOCATION[:lng], area[:center_lat], area[:center_lng])
      range[:min_km] <= km && km <= range[:max_km]
    end
  end
end
