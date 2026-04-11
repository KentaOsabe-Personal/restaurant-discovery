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
        google_maps_url: "https://maps.google.com/?cid=#{i}",
        lat: 37.916 + (i * 0.001),
        lng: 139.036 + (i * 0.001)
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

      it "#{area_id} で recommendations の各候補に lat/lng フィールドを含む" do
        post "/api/omakase", params: { area: area_id }.to_json, headers: valid_headers
        json = response.parsed_body
        next if json["recommendations"].empty?

        json["recommendations"].each do |rec|
          expect(rec).to have_key("lat")
          expect(rec).to have_key("lng")
        end
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

  describe "エリアフィルタリング" do
    context "ekinan 指定時に ekimae 住所の店が混在している場合" do
      let(:ekinan_places) do
        %w[天神 笹口 米山].map.with_index(1) do |town, i|
          {
            name: "ekinan店#{i}",
            rating: 4.0,
            price_level: "PRICE_LEVEL_MODERATE",
            address: "新潟市中央区#{town}#{i}-1",
            google_maps_url: "https://maps.google.com/?cid=ekinan#{i}",
            lat: 37.910 + (i * 0.001),
            lng: 139.030 + (i * 0.001)
          }
        end
      end

      let(:ekimae_places) do
        %w[万代 弁天].map.with_index(1) do |town, i|
          {
            name: "ekimae店#{i}",
            rating: 4.0,
            price_level: "PRICE_LEVEL_MODERATE",
            address: "新潟市中央区#{town}#{i}-1",
            google_maps_url: "https://maps.google.com/?cid=ekimae#{i}",
            lat: 37.920 + (i * 0.001),
            lng: 139.040 + (i * 0.001)
          }
        end
      end

      before do
        allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(ekinan_places + ekimae_places)
        allow_any_instance_of(RecommendationService).to receive(:call) { |_inst, sampled, _q, **_kw| sampled.map { |p| p.merge(reason: "テスト") } }
      end

      it "ekimae 住所の店がレコメンドに含まれない" do
        post "/api/omakase", params: { area: "ekinan" }.to_json, headers: valid_headers
        recommendations = response.parsed_body["recommendations"]
        ekimae_keywords = OmakaseService::SUB_AREAS["ekimae"][:names]
        recommendations.each do |rec|
          ekimae_keywords.each do |keyword|
            expect(rec["address"]).not_to include(keyword)
          end
        end
      end

      it "ekinan 住所の店のみレコメンドに含まれる" do
        post "/api/omakase", params: { area: "ekinan" }.to_json, headers: valid_headers
        recommendations = response.parsed_body["recommendations"]
        expect(recommendations).not_to be_empty
        ekinan_keywords = OmakaseService::SUB_AREAS["ekinan"][:names]
        recommendations.each do |rec|
          expect(ekinan_keywords.any? { |kw| rec["address"].include?(kw) }).to be true
        end
      end
    end

    context "フィルタ後に候補が0件になった場合" do
      before do
        ekimae_only = %w[万代 弁天].map.with_index(1) do |town, i|
          {
            name: "ekimae店#{i}",
            rating: 4.0,
            price_level: "PRICE_LEVEL_MODERATE",
            address: "新潟市中央区#{town}#{i}-1",
            google_maps_url: "https://maps.google.com/?cid=ekimae#{i}",
            lat: 37.920 + (i * 0.001),
            lng: 139.040 + (i * 0.001)
          }
        end
        allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(ekimae_only)
      end

      it "200 OK で recommendations が空配列を返す" do
        post "/api/omakase", params: { area: "ekinan" }.to_json, headers: valid_headers
        expect(response).to have_http_status(:ok)
        expect(response.parsed_body["recommendations"]).to eq([])
      end

      it "RecommendationService を呼ばない" do
        expect_any_instance_of(RecommendationService).not_to receive(:call)
        post "/api/omakase", params: { area: "ekinan" }.to_json, headers: valid_headers
      end
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
