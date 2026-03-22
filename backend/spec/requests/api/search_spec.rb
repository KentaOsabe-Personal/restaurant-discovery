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
        google_maps_url: "https://maps.google.com/?cid=1"
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
      expect(json["parsed_conditions"]).to include("area" => "渋谷", "genre" => "イタリアン", "price_level" => nil)
      expect(json["parsed_conditions"]).not_to have_key("keyword")
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

    it "parsed_conditions を含む JSON を返す" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      json = response.parsed_body
      expect(json["parsed_conditions"]).to include("area" => "渋谷", "genre" => "イタリアン", "price_level" => nil)
    end

    it "RecommendationService を呼ばない" do
      expect_any_instance_of(RecommendationService).not_to receive(:call)
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
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
      expect(response.parsed_body["error"]).to eq("query parser failed")
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
      expect(response.parsed_body["error"]).to eq("places api failed")
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
      expect(response.parsed_body["error"]).to eq("recommendation failed")
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
