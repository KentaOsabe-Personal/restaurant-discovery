require "rails_helper"

RSpec.describe "POST /api/search", type: :request do
  let(:valid_headers) { { "Content-Type" => "application/json" } }
  let(:parsed_conditions) { { area: "渋谷", genre: "イタリアン", price_level: nil, keyword: nil } }
  let(:places) do
    [
      {
        name: "レストランA",
        rating: 4.5,
        price_level: nil,
        address: "東京都渋谷区",
        google_maps_url: "https://maps.google.com/?cid=1",
        lat: 35.659,
        lng: 139.700
      }
    ]
  end
  let(:recommendations) do
    [
      {
        name: "レストランA",
        rating: 4.5,
        price_level: nil,
        address: "東京都渋谷区",
        google_maps_url: "https://maps.google.com/?cid=1",
        lat: 35.659,
        lng: 139.700,
        reason: "渋谷のおすすめイタリアンです"
      }
    ]
  end

  describe "正常系" do
    before do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(parsed_conditions)
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(recommendations)
    end

    it "200 OK を返す" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:ok)
    end

    it "recommendations と parsed_conditions を含む JSON を返す" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      json = response.parsed_body
      expect(json["recommendations"]).to be_an(Array)
      expect(json["recommendations"].first).to include("name", "rating", "address", "google_maps_url", "reason")
      expect(json["parsed_conditions"]).to include("area" => "渋谷", "genre" => "イタリアン", "price_level" => nil, "keyword" => nil)
      expect(json["parsed_conditions"]).to have_key("keyword")
    end

    it "recommendations の各候補に lat/lng フィールドを含む" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      json = response.parsed_body
      expect(json["recommendations"].first).to include("lat" => 35.659, "lng" => 139.700)
    end

    it "keyword が非 null の場合も parsed_conditions に含む" do
      allow_any_instance_of(QueryParserService).to receive(:call)
        .and_return({ area: "新宿", genre: nil, price_level: nil, keyword: "テラス席" })
      post "/api/search", params: { query: "新宿でテラス席" }.to_json, headers: valid_headers
      json = response.parsed_body
      expect(json["parsed_conditions"]).to include("keyword" => "テラス席")
    end

    it "Content-Type が application/json である" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response.content_type).to match(%r{application/json})
    end
  end

  describe "候補 0 件" do
    before do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(parsed_conditions)
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return([])
    end

    it "200 OK を返し recommendations が空配列である" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["recommendations"]).to eq([])
    end

    it "other_candidates が空配列を返す" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response.parsed_body["other_candidates"]).to eq([])
    end

    it "parsed_conditions を含む JSON を返す（空結果パスでも keyword を含む）" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      json = response.parsed_body
      expect(json["parsed_conditions"]).to include("area" => "渋谷", "genre" => "イタリアン", "price_level" => nil, "keyword" => nil)
      expect(json["parsed_conditions"]).to have_key("keyword")
    end

    it "RecommendationService を呼ばない" do
      expect_any_instance_of(RecommendationService).not_to receive(:call)
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
    end
  end

  describe "other_candidates の差分計算" do
    let(:multi_places) do
      [
        { name: "レストランA", rating: 4.5, price_level: nil, address: "東京都渋谷区", google_maps_url: "https://maps.google.com/?cid=1", lat: 35.659, lng: 139.700 },
        { name: "レストランB", rating: 4.0, price_level: "¥¥", address: "東京都渋谷区2", google_maps_url: "https://maps.google.com/?cid=2", lat: 35.660, lng: 139.701 },
        { name: "レストランC", rating: 3.8, price_level: "¥", address: "東京都渋谷区3", google_maps_url: "https://maps.google.com/?cid=3", lat: nil, lng: nil }
      ]
    end
    let(:partial_recommendations) do
      [
        { name: "レストランA", rating: 4.5, price_level: nil, address: "東京都渋谷区", google_maps_url: "https://maps.google.com/?cid=1", lat: 35.659, lng: 139.700, reason: "おすすめです" }
      ]
    end

    before do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(parsed_conditions)
    end

    it "recommendations に含まれない places のみが other_candidates に返される" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(multi_places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(partial_recommendations)

      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      json = response.parsed_body

      other_names = json["other_candidates"].map { |c| c["name"] }
      expect(other_names).to contain_exactly("レストランB", "レストランC")
      expect(other_names).not_to include("レストランA")
    end

    it "全 places が recommendations に含まれる場合 other_candidates は空配列を返す" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(recommendations)

      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      json = response.parsed_body

      expect(json["other_candidates"]).to eq([])
    end

    it "other_candidates の順序が Google Places API の返却順を維持する" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(multi_places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(partial_recommendations)

      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      json = response.parsed_body

      other_names = json["other_candidates"].map { |c| c["name"] }
      expect(other_names).to eq([ "レストランB", "レストランC" ])
    end

    it "other_candidates に reason フィールドが含まれない" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(multi_places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(partial_recommendations)

      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      json = response.parsed_body

      json["other_candidates"].each do |candidate|
        expect(candidate).not_to have_key("reason")
        expect(candidate).to include("name", "rating", "address", "google_maps_url")
      end
    end
  end

  describe "エラーハンドリング" do
    it "QueryParserError が発生したとき 502 を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_raise(QueryParserError, "query parser failed")
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:bad_gateway)
    end

    it "QueryParserError が発生したときエラー JSON を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_raise(QueryParserError, "query parser failed")
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response.parsed_body["error"]).to eq("外部サービスとの通信に失敗しました")
    end

    it "GooglePlacesError が発生したとき 502 を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(parsed_conditions)
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_raise(GooglePlacesError, "places api failed")
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:bad_gateway)
    end

    it "GooglePlacesError が発生したときエラー JSON を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(parsed_conditions)
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_raise(GooglePlacesError, "places api failed")
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response.parsed_body["error"]).to eq("外部サービスとの通信に失敗しました")
    end

    it "RecommendationError が発生したとき 502 を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(parsed_conditions)
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_raise(RecommendationError, "recommendation failed")
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:bad_gateway)
    end

    it "RecommendationError が発生したときエラー JSON を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(parsed_conditions)
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_raise(RecommendationError, "recommendation failed")
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response.parsed_body["error"]).to eq("外部サービスとの通信に失敗しました")
    end

    it "予期しない StandardError が発生したとき 500 を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_raise(RuntimeError, "unexpected error")
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:internal_server_error)
    end

    it "予期しない StandardError が発生したとき固定エラー JSON を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_raise(RuntimeError, "unexpected error")
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response.parsed_body["error"]).to eq("内部エラーが発生しました")
    end
  end

  describe "ラーメンモード（mode=ramen）" do
    let(:ramen_parsed) { { area: "新潟", genre: nil, price_level: nil, keyword: "太麺" } }
    let(:ramen_recommendations) do
      [
        {
          name: "ラーメン屋A",
          rating: 4.5,
          price_level: nil,
          address: "新潟市中央区",
          google_maps_url: "https://maps.google.com/?cid=10",
          lat: 37.916,
          lng: 139.036,
          reason: "濃厚豚骨スープと太麺が特徴"
        }
      ]
    end

    before do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(ramen_parsed)
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(ramen_recommendations)
    end

    it "parsed_conditions.genre が「ラーメン」になる" do
      post "/api/search", params: { query: "太麺ラーメン", mode: "ramen" }.to_json, headers: valid_headers
      expect(response.parsed_body["parsed_conditions"]["genre"]).to eq("ラーメン")
    end

    it "QueryParserService に mode: ramen が渡される" do
      expect_any_instance_of(QueryParserService).to receive(:call)
        .with("太麺ラーメン", mode: "ramen").and_return(ramen_parsed)
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return([])
      post "/api/search", params: { query: "太麺ラーメン", mode: "ramen" }.to_json, headers: valid_headers
    end

    it "RecommendationService に mode: ramen が渡される" do
      expect_any_instance_of(RecommendationService).to receive(:call)
        .with(anything, anything, hash_including(mode: "ramen"))
        .and_return(ramen_recommendations)
      post "/api/search", params: { query: "太麺ラーメン", mode: "ramen" }.to_json, headers: valid_headers
    end

    it "200 OK を返す" do
      post "/api/search", params: { query: "太麺ラーメン", mode: "ramen" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:ok)
    end
  end

  describe "mode 未指定時（後方互換性）" do
    before do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(parsed_conditions)
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(recommendations)
    end

    it "mode 未指定時は QueryParserService に mode: izakaya が渡される" do
      expect_any_instance_of(QueryParserService).to receive(:call)
        .with("渋谷でイタリアン", mode: "izakaya").and_return(parsed_conditions)
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
    end

    it "mode 未指定時は genre がラーメンで上書きされない" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response.parsed_body["parsed_conditions"]["genre"]).to eq("イタリアン")
    end
  end

  describe "バリデーション（異常系）" do
    it "query が空文字のとき 422 を返す" do
      post "/api/search", params: { query: "" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "query が空文字のときエラー JSON を返す" do
      post "/api/search", params: { query: "" }.to_json, headers: valid_headers
      expect(response.parsed_body).to have_key("error")
    end

    it "query が存在しないとき 422 を返す" do
      post "/api/search", params: {}.to_json, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "query が存在しないときエラー JSON を返す" do
      post "/api/search", params: {}.to_json, headers: valid_headers
      expect(response.parsed_body).to have_key("error")
    end

    it "query が文字列以外（数値）のとき 422 を返す" do
      post "/api/search", params: { query: 123 }.to_json, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "query が文字列以外（数値）のときエラー JSON を返す" do
      post "/api/search", params: { query: 123 }.to_json, headers: valid_headers
      expect(response.parsed_body).to have_key("error")
    end
  end
end
