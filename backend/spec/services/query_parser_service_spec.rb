require "rails_helper"
require "webmock/rspec"

RSpec.describe QueryParserService do
  let(:api_key) { "test-api-key-123" }
  let(:service) { described_class.new }
  let(:openai_endpoint) { "https://api.openai.com/v1/chat/completions" }

  before do
    allow(File).to receive(:read).and_call_original
    allow(File).to receive(:read).with("/openai_apikey").and_return("#{api_key}\n")
  end

  describe "#call" do
    context "全条件を含む自然文の場合" do
      it "area, genre, price_level, keyword を正しく抽出する" do
        stub_openai_success(
          area: "渋谷",
          genre: "イタリアン",
          price_level: "PRICE_LEVEL_INEXPENSIVE",
          keyword: "うまい"
        )

        result = service.call("渋谷で安くてうまいイタリアン")

        expect(result).to eq(
          area: "渋谷",
          genre: "イタリアン",
          price_level: "PRICE_LEVEL_INEXPENSIVE",
          keyword: "うまい"
        )
      end
    end

    context "一部の条件のみ含む自然文の場合" do
      it "欠落フィールドを nil として返す" do
        stub_openai_success(
          area: "新宿",
          genre: nil,
          price_level: nil,
          keyword: nil
        )

        result = service.call("新宿のお店")

        expect(result[:area]).to eq("新宿")
        expect(result[:genre]).to be_nil
        expect(result[:price_level]).to be_nil
        expect(result[:keyword]).to be_nil
      end
    end

    context "空文字列の場合" do
      it "全フィールドが nil の構造化データを返す" do
        stub_openai_success(
          area: nil,
          genre: nil,
          price_level: nil,
          keyword: nil
        )

        result = service.call("")

        expect(result).to eq(
          area: nil,
          genre: nil,
          price_level: nil,
          keyword: nil
        )
      end
    end

    context "price_level の列挙値" do
      %w[
        PRICE_LEVEL_FREE
        PRICE_LEVEL_INEXPENSIVE
        PRICE_LEVEL_MODERATE
        PRICE_LEVEL_EXPENSIVE
        PRICE_LEVEL_VERY_EXPENSIVE
      ].each do |level|
        it "#{level} を正しく返す" do
          stub_openai_success(
            area: "東京",
            genre: "和食",
            price_level: level,
            keyword: nil
          )

          result = service.call("東京の和食")
          expect(result[:price_level]).to eq(level)
        end
      end
    end

    context "リクエストパラメータの検証" do
      it "gpt-5-nano モデルを使用する" do
        stub = stub_openai_success(
          area: nil, genre: nil, price_level: nil, keyword: nil
        )

        service.call("テスト")

        expect(stub).to have_been_requested
        expect(
          a_request(:post, openai_endpoint).with { |req|
            body = JSON.parse(req.body)
            body["model"] == "gpt-5-nano"
          }
        ).to have_been_made
      end

      it "JSON Schema モードの response_format を送信する" do
        stub_openai_success(
          area: nil, genre: nil, price_level: nil, keyword: nil
        )

        service.call("テスト")

        expect(
          a_request(:post, openai_endpoint).with { |req|
            body = JSON.parse(req.body)
            rf = body["response_format"]
            rf["type"] == "json_schema" &&
              rf["json_schema"]["name"] == "parsed_query" &&
              rf["json_schema"]["strict"] == true
          }
        ).to have_been_made
      end

      it "Authorization ヘッダーに API キーを含む" do
        stub_openai_success(
          area: nil, genre: nil, price_level: nil, keyword: nil
        )

        service.call("テスト")

        expect(
          a_request(:post, openai_endpoint).with(
            headers: { "Authorization" => "Bearer #{api_key}" }
          )
        ).to have_been_made
      end
    end

    context "OpenAI API が HTTP エラーを返した場合" do
      it "4xx エラーで QueryParserError を raise する" do
        stub_request(:post, openai_endpoint)
          .to_return(status: 400, body: '{"error": "Bad Request"}')

        expect { service.call("テスト") }.to raise_error(QueryParserError)
      end

      it "5xx エラーで QueryParserError を raise する" do
        stub_request(:post, openai_endpoint)
          .to_return(status: 500, body: '{"error": "Internal Server Error"}')

        expect { service.call("テスト") }.to raise_error(QueryParserError)
      end
    end

    context "タイムアウトの場合" do
      it "QueryParserError を raise する" do
        stub_request(:post, openai_endpoint).to_timeout

        expect { service.call("テスト") }.to raise_error(QueryParserError)
      end
    end

    context "不正な JSON レスポンスの場合" do
      it "QueryParserError を raise する" do
        stub_request(:post, openai_endpoint)
          .to_return(
            status: 200,
            body: {
              choices: [ {
                message: { content: "not valid json{{{" }
              } ]
            }.to_json,
            headers: { "Content-Type" => "application/json" }
          )

        expect { service.call("テスト") }.to raise_error(QueryParserError)
      end
    end

    context "API キーファイルが存在しない場合" do
      it "QueryParserError を raise する" do
        allow(File).to receive(:read).with("/openai_apikey").and_raise(Errno::ENOENT)

        expect { service.call("テスト") }.to raise_error(QueryParserError)
      end
    end
  end

  private

  def stub_openai_success(area:, genre:, price_level:, keyword:)
    response_content = { area: area, genre: genre, price_level: price_level, keyword: keyword }.to_json

    stub_request(:post, openai_endpoint)
      .to_return(
        status: 200,
        body: {
          choices: [ {
            message: {
              role: "assistant",
              content: response_content
            }
          } ]
        }.to_json,
        headers: { "Content-Type" => "application/json" }
      )
  end
end
