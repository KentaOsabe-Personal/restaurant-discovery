require "rails_helper"

RSpec.describe "POST /api/omakase", type: :request do
  let(:valid_headers) { { "Content-Type" => "application/json" } }

  let(:sample_places) do
    (1..20).map do |i|
      {
        name: "居酒屋テスト#{i}",
        rating: 4.0,
        price_level: "PRICE_LEVEL_MODERATE",
        address: "新潟市中央区万代#{i}-1",
        google_maps_url: "https://maps.google.com/?cid=#{i}"
      }
    end
  end

  let(:sample_recommendations) do
    sample_places.first(5).map do |place|
      place.merge(reason: "テスト推薦理由")
    end
  end

  describe "正常系 — 4エリア各ID" do
    before do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(sample_places.first(5))
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(sample_recommendations)
    end

    %w[ekimae ekinan furumachi nagaoka].each do |area_id|
      it "#{area_id} で 200 OK を返す" do
        post "/api/omakase", params: { area: area_id }.to_json, headers: valid_headers
        expect(response).to have_http_status(:ok)
      end

      it "#{area_id} でレスポンスに必須キーを含む" do
        post "/api/omakase", params: { area: area_id }.to_json, headers: valid_headers
        json = response.parsed_body
        expect(json).to have_key("recommendations")
        expect(json).to have_key("other_candidates")
        expect(json).to have_key("parsed_conditions")
        expect(json).to have_key("omakase")
      end

      it "#{area_id} で other_candidates が空配列を返す" do
        post "/api/omakase", params: { area: area_id }.to_json, headers: valid_headers
        expect(response.parsed_body["other_candidates"]).to eq([])
      end

      it "#{area_id} で omakase に area_id と sub_area を含む" do
        post "/api/omakase", params: { area: area_id }.to_json, headers: valid_headers
        json = response.parsed_body
        expect(json["omakase"]["area_id"]).to eq(area_id)
        expect(json["omakase"]["sub_area"]).to be_a(String)
        expect(json["omakase"]["sub_area"]).not_to be_empty
      end
    end
  end

  describe "parsed_conditions の内容" do
    before do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(sample_places.first(1))
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(sample_recommendations.first(1))
    end

    it "parsed_conditions.area が prefix + sub_area 形式で返る" do
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      json = response.parsed_body
      area = json["parsed_conditions"]["area"]
      # ekimae prefix は "新潟市中央区"
      expect(area).to start_with("新潟市中央区 ")
      expect(area.split(" ").length).to eq(2)
    end

    it "parsed_conditions に genre / price_level / keyword を含む" do
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      json = response.parsed_body
      expect(json["parsed_conditions"]).to include("genre" => "居酒屋 バー")
      expect(json["parsed_conditions"]).to have_key("price_level")
      expect(json["parsed_conditions"]).to have_key("keyword")
    end
  end

  describe "サンプリング — RecommendationService に渡す件数 ≤ 5" do
    it "Places 20件でも RecommendationService には5件以下が渡される" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(sample_places)

      received_count = nil
      allow_any_instance_of(RecommendationService).to receive(:call) do |_instance, sampled, _query, **_kwargs|
        received_count = sampled.length
        sample_recommendations
      end

      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      expect(received_count).to be <= 5
    end
  end

  describe "QueryParser 非呼び出し" do
    before do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(sample_places.first(1))
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(sample_recommendations.first(1))
    end

    it "QueryParserService を呼ばない" do
      expect_any_instance_of(QueryParserService).not_to receive(:call)
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
    end
  end

  describe "候補 0 件" do
    before do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return([])
    end

    it "200 OK で recommendations が空配列を返す" do
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:ok)
      expect(response.parsed_body["recommendations"]).to eq([])
    end

    it "0件のとき RecommendationService を呼ばない" do
      expect_any_instance_of(RecommendationService).not_to receive(:call)
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
    end

    it "0件のとき omakase キーを含む" do
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      expect(response.parsed_body).to have_key("omakase")
    end
  end

  describe "バリデーション（異常系）" do
    it "area が未知値のとき 422 を返す" do
      post "/api/omakase", params: { area: "unknown" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "area が未知値のときエラー JSON を返す" do
      post "/api/omakase", params: { area: "unknown" }.to_json, headers: valid_headers
      expect(response.parsed_body).to have_key("error")
    end

    it "area が空文字のとき 422 を返す" do
      post "/api/omakase", params: { area: "" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "area が空文字のときエラー JSON を返す" do
      post "/api/omakase", params: { area: "" }.to_json, headers: valid_headers
      expect(response.parsed_body["error"]).to eq("area must be a non-empty string")
    end

    it "area が nil（存在しない）のとき 422 を返す" do
      post "/api/omakase", params: {}.to_json, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "area が非文字列（数値）のとき 422 を返す" do
      post "/api/omakase", params: { area: 123 }.to_json, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "エラーハンドリング" do
    it "GooglePlacesError が発生したとき 502 を返す" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_raise(GooglePlacesError, "places api failed")
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:bad_gateway)
    end

    it "GooglePlacesError が発生したときエラー JSON を返す" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_raise(GooglePlacesError, "places api failed")
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      expect(response.parsed_body["error"]).to eq("外部サービスとの通信に失敗しました")
    end

    it "RecommendationError が発生したとき 502 を返す" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(sample_places.first(1))
      allow_any_instance_of(RecommendationService).to receive(:call).and_raise(RecommendationError, "rec failed")
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:bad_gateway)
    end

    it "RecommendationError が発生したときエラー JSON を返す" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(sample_places.first(1))
      allow_any_instance_of(RecommendationService).to receive(:call).and_raise(RecommendationError, "rec failed")
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      expect(response.parsed_body["error"]).to eq("外部サービスとの通信に失敗しました")
    end

    it "StandardError が発生したとき 500 を返す" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_raise(RuntimeError, "unexpected error")
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      expect(response).to have_http_status(:internal_server_error)
    end

    it "StandardError が発生したとき固定エラー JSON を返す" do
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_raise(RuntimeError, "unexpected error")
      post "/api/omakase", params: { area: "ekimae" }.to_json, headers: valid_headers
      expect(response.parsed_body["error"]).to eq("内部エラーが発生しました")
    end
  end
end
