require "rails_helper"

RSpec.describe "POST /api/search", type: :request do
  let(:valid_headers) { { "Content-Type" => "application/json" } }

  describe "正常系" do
    it "200 OK を返す" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:ok)
    end

    it "固定のスタブ JSON 構造を返す" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      json = response.parsed_body
      expect(json["recommendations"]).to eq([])
      expect(json["parsed_conditions"]).to eq({ "area" => nil, "genre" => nil, "price_level" => nil })
    end

    it "Content-Type が application/json である" do
      post "/api/search", params: { query: "渋谷でイタリアン" }.to_json, headers: valid_headers
      expect(response.content_type).to match(%r{application/json})
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
