require "rails_helper"
require "webmock/rspec"

RSpec.describe GooglePlacesService do
  let(:api_key) { "test-google-api-key" }
  let(:service) { described_class.new }
  let(:places_endpoint) { "https://places.googleapis.com/v1/places:searchText" }

  before do
    allow(File).to receive(:read).and_call_original
    allow(File).to receive(:read).with("/google_places_apikey").and_return("#{api_key}\n")
  end

  describe "#call" do
    context "全フィールドありの正常系" do
      it "整形済み店舗配列を返す" do
        stub_places_success([
          {
            "displayName" => { "text" => "トラットリア XX", "languageCode" => "ja" },
            "rating" => 4.2,
            "priceLevel" => "PRICE_LEVEL_MODERATE",
            "formattedAddress" => "東京都渋谷区道玄坂1-1",
            "googleMapsUri" => "https://maps.google.com/?cid=123"
          }
        ])

        result = service.call(
          area: "渋谷",
          genre: "イタリアン",
          price_level: "PRICE_LEVEL_INEXPENSIVE",
          keyword: "うまい"
        )

        expect(result).to eq([
          {
            name: "トラットリア XX",
            rating: 4.2,
            price_level: "PRICE_LEVEL_MODERATE",
            address: "東京都渋谷区道玄坂1-1",
            google_maps_url: "https://maps.google.com/?cid=123"
          }
        ])
      end

      it "textQuery に area, genre, keyword を結合する" do
        stub_places_success([])

        service.call(area: "渋谷", genre: "イタリアン", price_level: "PRICE_LEVEL_INEXPENSIVE", keyword: "うまい")

        expect(
          a_request(:post, places_endpoint).with { |req|
            JSON.parse(req.body)["textQuery"] == "渋谷 イタリアン うまい"
          }
        ).to have_been_made
      end

      it "priceLevels パラメータを設定する" do
        stub_places_success([])

        service.call(area: "渋谷", genre: "イタリアン", price_level: "PRICE_LEVEL_INEXPENSIVE", keyword: nil)

        expect(
          a_request(:post, places_endpoint).with { |req|
            JSON.parse(req.body)["priceLevels"] == ["PRICE_LEVEL_INEXPENSIVE"]
          }
        ).to have_been_made
      end
    end

    context "nil フィールドがある場合" do
      it "nil フィールドがテキストクエリから除外される" do
        stub_places_success([])

        service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil)

        expect(
          a_request(:post, places_endpoint).with { |req|
            JSON.parse(req.body)["textQuery"] == "渋谷"
          }
        ).to have_been_made
      end

      it "priceLevels パラメータが含まれない" do
        stub_places_success([])

        service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil)

        expect(
          a_request(:post, places_endpoint).with { |req|
            !JSON.parse(req.body).key?("priceLevels")
          }
        ).to have_been_made
      end
    end

    context "price_level が PRICE_LEVEL_FREE の場合" do
      it "priceLevels パラメータが含まれない" do
        stub_places_success([])

        service.call(area: "渋谷", genre: nil, price_level: "PRICE_LEVEL_FREE", keyword: nil)

        expect(
          a_request(:post, places_endpoint).with { |req|
            !JSON.parse(req.body).key?("priceLevels")
          }
        ).to have_been_made
      end
    end

    context "rating/priceLevel が欠落している場合" do
      it "rating と price_level が nil になる" do
        stub_places_success([
          {
            "displayName" => { "text" => "テスト店", "languageCode" => "ja" },
            "formattedAddress" => "東京都新宿区1-1",
            "googleMapsUri" => "https://maps.google.com/?cid=456"
          }
        ])

        result = service.call(area: "新宿", genre: nil, price_level: nil, keyword: nil)

        expect(result.first[:rating]).to be_nil
        expect(result.first[:price_level]).to be_nil
      end
    end

    context "リクエストヘッダーの検証" do
      it "X-Goog-FieldMask ヘッダーを正しく設定する" do
        stub_places_success([])

        service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil)

        expect(
          a_request(:post, places_endpoint).with(
            headers: { "X-Goog-FieldMask" => "places.displayName,places.rating,places.priceLevel,places.formattedAddress,places.googleMapsUri" }
          )
        ).to have_been_made
      end

      it "X-Goog-Api-Key ヘッダーを正しく設定する" do
        stub_places_success([])

        service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil)

        expect(
          a_request(:post, places_endpoint).with(
            headers: { "X-Goog-Api-Key" => api_key }
          )
        ).to have_been_made
      end
    end

    context "languageCode と pageSize の検証" do
      it "languageCode: ja を設定する" do
        stub_places_success([])

        service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil)

        expect(
          a_request(:post, places_endpoint).with { |req|
            JSON.parse(req.body)["languageCode"] == "ja"
          }
        ).to have_been_made
      end

      it "pageSize: 20 を設定する" do
        stub_places_success([])

        service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil)

        expect(
          a_request(:post, places_endpoint).with { |req|
            JSON.parse(req.body)["pageSize"] == 20
          }
        ).to have_been_made
      end
    end

    context "API レスポンスが空オブジェクトの場合" do
      it "空配列を返す" do
        stub_request(:post, places_endpoint)
          .to_return(
            status: 200,
            body: "{}",
            headers: { "Content-Type" => "application/json" }
          )

        result = service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil)

        expect(result).to eq([])
      end
    end

    context "API が 4xx エラーを返した場合" do
      it "GooglePlacesError を raise する" do
        stub_request(:post, places_endpoint)
          .to_return(status: 400, body: '{"error": "Bad Request"}')

        expect { service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil) }
          .to raise_error(GooglePlacesError)
      end
    end

    context "API が 5xx エラーを返した場合" do
      it "GooglePlacesError を raise する" do
        stub_request(:post, places_endpoint)
          .to_return(status: 500, body: '{"error": "Internal Server Error"}')

        expect { service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil) }
          .to raise_error(GooglePlacesError)
      end
    end

    context "タイムアウトの場合" do
      it "GooglePlacesError を raise する" do
        stub_request(:post, places_endpoint).to_timeout

        expect { service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil) }
          .to raise_error(GooglePlacesError)
      end
    end

    context "API キーファイルが存在しない場合" do
      it "GooglePlacesError を raise する" do
        allow(File).to receive(:read).with("/google_places_apikey").and_raise(Errno::ENOENT)

        expect { service.call(area: "渋谷", genre: nil, price_level: nil, keyword: nil) }
          .to raise_error(GooglePlacesError)
      end
    end
  end

  private

  def stub_places_success(places)
    stub_request(:post, places_endpoint)
      .to_return(
        status: 200,
        body: { places: places }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
  end
end
