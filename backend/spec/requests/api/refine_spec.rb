require "rails_helper"

RSpec.describe "POST /api/refine", type: :request do
  let(:valid_headers) { { "Content-Type" => "application/json" } }
  let(:original_conditions) { { area: "古町", genre: "居酒屋", price_level: nil, keyword: nil } }
  let(:places) do
    [
      {
        name: "居酒屋A",
        rating: 4.2,
        price_level: nil,
        address: "新潟市中央区古町",
        google_maps_url: "https://maps.google.com/?cid=1",
        lat: 37.916,
        lng: 139.036
      }
    ]
  end
  let(:recommendations) do
    [
      {
        name: "居酒屋A",
        rating: 4.2,
        price_level: nil,
        address: "新潟市中央区古町",
        google_maps_url: "https://maps.google.com/?cid=1",
        lat: 37.916,
        lng: 139.036,
        reason: "個室あり、コスパ良し"
      }
    ]
  end
  let(:valid_params) do
    {
      feedback: "個室があると良い",
      original_query: "古町の居酒屋",
      parsed_conditions: { area: "古町", genre: "居酒屋", price_level: nil, keyword: nil }
    }.to_json
  end

  describe "正常系" do
    before do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(
        { area: nil, genre: nil, price_level: nil, keyword: "個室" }
      )
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(recommendations)
    end

    it "200 OK を返す" do
      post "/api/refine", params: valid_params, headers: valid_headers
      expect(response).to have_http_status(:ok)
    end

    it "recommendations・other_candidates・parsed_conditions を含む JSON を返す" do
      post "/api/refine", params: valid_params, headers: valid_headers
      json = response.parsed_body
      expect(json).to have_key("recommendations")
      expect(json).to have_key("other_candidates")
      expect(json).to have_key("parsed_conditions")
    end

    it "マージ済み条件が parsed_conditions に反映される（feedbackの keyword が上書きされる）" do
      post "/api/refine", params: valid_params, headers: valid_headers
      json = response.parsed_body
      expect(json["parsed_conditions"]).to include("keyword" => "個室", "area" => "古町", "genre" => "居酒屋")
    end

    it "RecommendationService に feedback キーワード引数が渡される" do
      expect_any_instance_of(RecommendationService).to receive(:call).with(
        anything, anything, hash_including(feedback: "個室があると良い")
      ).and_return(recommendations)
      post "/api/refine", params: valid_params, headers: valid_headers
    end
  end

  describe "候補 0 件" do
    before do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(
        { area: nil, genre: nil, price_level: nil, keyword: "個室" }
      )
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return([])
    end

    it "200 OK を返す" do
      post "/api/refine", params: valid_params, headers: valid_headers
      expect(response).to have_http_status(:ok)
    end

    it "recommendations と other_candidates が空配列である" do
      post "/api/refine", params: valid_params, headers: valid_headers
      json = response.parsed_body
      expect(json["recommendations"]).to eq([])
      expect(json["other_candidates"]).to eq([])
    end

    it "parsed_conditions はマージ済み条件を返す" do
      post "/api/refine", params: valid_params, headers: valid_headers
      json = response.parsed_body
      expect(json["parsed_conditions"]).to include("keyword" => "個室")
    end

    it "RecommendationService を呼ばない" do
      expect_any_instance_of(RecommendationService).not_to receive(:call)
      post "/api/refine", params: valid_params, headers: valid_headers
    end
  end

  describe "フィードバック全 null のマージ（Req 3.3）" do
    it "元の条件がそのまま使われる" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(
        { area: nil, genre: nil, price_level: nil, keyword: nil }
      )
      allow_any_instance_of(GooglePlacesService).to receive(:call) do |_, conditions|
        expect(conditions).to eq({ area: "古町", genre: "居酒屋", price_level: nil, keyword: nil })
        places
      end
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(recommendations)

      post "/api/refine", params: valid_params, headers: valid_headers
      expect(response).to have_http_status(:ok)
    end
  end

  describe "ラーメンモード（mode=ramen）" do
    let(:ramen_original_conditions) { { area: "新潟", genre: "居酒屋", price_level: nil, keyword: nil } }
    let(:ramen_params) do
      {
        feedback: "こってり系が良い",
        original_query: "新潟のラーメン",
        parsed_conditions: { area: "新潟", genre: "居酒屋", price_level: nil, keyword: nil },
        mode: "ramen"
      }.to_json
    end

    before do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(
        { area: nil, genre: nil, price_level: nil, keyword: "こってり" }
      )
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(recommendations)
    end

    it "マージ後の parsed_conditions.genre が「ラーメン」になる" do
      post "/api/refine", params: ramen_params, headers: valid_headers
      expect(response.parsed_body["parsed_conditions"]["genre"]).to eq("ラーメン")
    end

    it "QueryParserService に mode: ramen が渡される" do
      expect_any_instance_of(QueryParserService).to receive(:call)
        .with("こってり系が良い", mode: "ramen")
        .and_return({ area: nil, genre: nil, price_level: nil, keyword: "こってり" })
      post "/api/refine", params: ramen_params, headers: valid_headers
    end

    it "RecommendationService に mode: ramen が渡される" do
      expect_any_instance_of(RecommendationService).to receive(:call)
        .with(anything, anything, hash_including(mode: "ramen"))
        .and_return(recommendations)
      post "/api/refine", params: ramen_params, headers: valid_headers
    end

    it "200 OK を返す" do
      post "/api/refine", params: ramen_params, headers: valid_headers
      expect(response).to have_http_status(:ok)
    end
  end

  describe "mode 未指定時（後方互換性）" do
    before do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(
        { area: nil, genre: nil, price_level: nil, keyword: "個室" }
      )
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_return(recommendations)
    end

    it "mode 未指定時は QueryParserService に mode: izakaya が渡される" do
      expect_any_instance_of(QueryParserService).to receive(:call)
        .with("個室があると良い", mode: "izakaya")
        .and_return({ area: nil, genre: nil, price_level: nil, keyword: "個室" })
      post "/api/refine", params: valid_params, headers: valid_headers
    end

    it "mode 未指定時は genre がラーメンで上書きされない" do
      post "/api/refine", params: valid_params, headers: valid_headers
      expect(response.parsed_body["parsed_conditions"]["genre"]).to eq("居酒屋")
    end
  end

  describe "バリデーション（異常系）" do
    it "feedback が空文字のとき 422 を返す" do
      params = { feedback: "", original_query: "古町の居酒屋", parsed_conditions: {} }.to_json
      post "/api/refine", params: params, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
      expect(response.parsed_body).to have_key("error")
    end

    it "feedback が空白のみのとき 422 を返す" do
      params = { feedback: "   ", original_query: "古町の居酒屋", parsed_conditions: {} }.to_json
      post "/api/refine", params: params, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
    end

    it "feedback が存在しないとき 422 を返す" do
      params = { original_query: "古町の居酒屋", parsed_conditions: {} }.to_json
      post "/api/refine", params: params, headers: valid_headers
      expect(response).to have_http_status(:unprocessable_content)
    end
  end

  describe "エラーハンドリング" do
    it "QueryParserError が発生したとき 502 を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_raise(QueryParserError, "failed")
      post "/api/refine", params: valid_params, headers: valid_headers
      expect(response).to have_http_status(:bad_gateway)
      expect(response.parsed_body["error"]).to eq("外部サービスとの通信に失敗しました")
    end

    it "GooglePlacesError が発生したとき 502 を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(
        { area: nil, genre: nil, price_level: nil, keyword: "個室" }
      )
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_raise(GooglePlacesError, "failed")
      post "/api/refine", params: valid_params, headers: valid_headers
      expect(response).to have_http_status(:bad_gateway)
      expect(response.parsed_body["error"]).to eq("外部サービスとの通信に失敗しました")
    end

    it "RecommendationError が発生したとき 502 を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_return(
        { area: nil, genre: nil, price_level: nil, keyword: "個室" }
      )
      allow_any_instance_of(GooglePlacesService).to receive(:call).and_return(places)
      allow_any_instance_of(RecommendationService).to receive(:call).and_raise(RecommendationError, "failed")
      post "/api/refine", params: valid_params, headers: valid_headers
      expect(response).to have_http_status(:bad_gateway)
      expect(response.parsed_body["error"]).to eq("外部サービスとの通信に失敗しました")
    end

    it "予期しない StandardError が発生したとき 500 を返す" do
      allow_any_instance_of(QueryParserService).to receive(:call).and_raise(RuntimeError, "unexpected")
      post "/api/refine", params: valid_params, headers: valid_headers
      expect(response).to have_http_status(:internal_server_error)
      expect(response.parsed_body["error"]).to eq("内部エラーが発生しました")
    end
  end
end
