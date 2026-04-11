class OmakaseService
  UnknownArea = Class.new(StandardError)

  SUB_AREAS = {
    "ekimae"    => { prefix: "新潟市中央区", names: %w[万代 弁天 花園 東大通 万代シテイ 天神 明石] },
    "ekinan"    => { prefix: "新潟市中央区", names: %w[けやき通り 米山 笹口 天神尾 南笹口 鐙] },
    "furumachi" => { prefix: "新潟市中央区", names: %w[古町通 西堀 東堀 本町 上古町 古町8番町 古町9番町] },
    "nagaoka"   => { prefix: "長岡市",       names: %w[大手通 殿町 表町 城内町 坂之上町] }
  }.freeze

  NIGHT_GENRE = "居酒屋 バー"

  def initialize(random: Random.new)
    @random = random
  end

  # @param area_id [String] "ekimae" | "ekinan" | "furumachi" | "nagaoka"
  # @return [Hash] { area:, genre:, price_level:, keyword:, sub_area:, area_id: }
  # @raise [OmakaseService::UnknownArea] 未知の area_id の場合
  def call(area_id)
    config = SUB_AREAS[area_id]
    raise UnknownArea, "Unknown area_id: #{area_id}" unless config

    sub_area = config[:names].sample(random: @random)

    {
      area:        "#{config[:prefix]} #{sub_area}",
      genre:       NIGHT_GENRE,
      price_level: nil,
      keyword:     nil,
      sub_area:    sub_area,
      area_id:     area_id
    }
  end
end
