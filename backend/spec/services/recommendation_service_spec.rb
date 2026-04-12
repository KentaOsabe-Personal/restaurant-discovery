require "rails_helper"
require "webmock/rspec"

RSpec.describe RecommendationService do
  let(:api_key) { "test-api-key-123" }
  let(:service) { described_class.new }
  let(:openai_endpoint) { "https://api.openai.com/v1/chat/completions" }

  before do
    allow(File).to receive(:read).and_call_original
    allow(File).to receive(:read).with("/openai_apikey").and_return("#{api_key}\n")
  end

  describe "#call" do
    context "候補 10 件 + クエリを渡した場合" do
      it "3〜5 件が返り各要素に reason フィールドが付加される" do
        places = (1..10).map { |i| build_place(name: "レストランA#{i}") }
        stub_openai_success([
          { name: "レストランA1", reason: "評価が高い" },
          { name: "レストランA3", reason: "価格帯が合う" },
          { name: "レストランA5", reason: "クエリに一致" }
        ])

        result = service.call(places, "渋谷で安くてうまいイタリアン")

        expect(result.size).to be_between(1, 5)
        expect(result).to all(include(:reason))
        expect(result.first[:name]).to eq("レストランA1")
        expect(result.first[:reason]).to eq("評価が高い")
      end
    end

    context "AI が 5 件推薦し全名前が一致する場合" do
      it "5 件返却される" do
        places = (1..10).map { |i| build_place(name: "店舗#{i}") }
        stub_openai_success((1..5).map { |i| { name: "店舗#{i}", reason: "理由#{i}" } })

        result = service.call(places, "テストクエリ")

        expect(result.size).to eq(5)
        result.each { |r| expect(r).to include(:reason) }
      end
    end

    context "AI が推薦した名前の一部が places に存在しない場合" do
      it "一致した件数分だけ返される（不一致はスキップ）" do
        places = [
          build_place(name: "存在する店A"),
          build_place(name: "存在する店B"),
          build_place(name: "存在する店C")
        ]
        stub_openai_success([
          { name: "存在する店A", reason: "理由A" },
          { name: "存在しない店X", reason: "理由X" },
          { name: "存在する店B", reason: "理由B" }
        ])

        result = service.call(places, "テスト")

        expect(result.size).to eq(2)
        expect(result.map { |r| r[:name] }).to eq([ "存在する店A", "存在する店B" ])
      end
    end

    context "候補 0 件の場合" do
      it "OpenAI API が呼び出されず空配列が返る" do
        result = service.call([], "テストクエリ")

        expect(result).to eq([])
        expect(a_request(:post, openai_endpoint)).not_to have_been_made
      end
    end

    context "候補 2 件の場合" do
      it "全件返却される" do
        places = [
          build_place(name: "店舗1"),
          build_place(name: "店舗2")
        ]
        stub_openai_success([
          { name: "店舗1", reason: "理由1" },
          { name: "店舗2", reason: "理由2" }
        ])

        result = service.call(places, "テスト")

        expect(result.size).to eq(2)
      end
    end

    context "リクエストパラメータの検証" do
      let(:places) { [ build_place(name: "テスト店舗") ] }
      let(:query) { "渋谷でランチ" }

      before do
        stub_openai_success([ { name: "テスト店舗", reason: "理由" } ])
        service.call(places, query)
      end

      it "gpt-5-nano モデルを使用する" do
        expect(
          a_request(:post, openai_endpoint).with { |req|
            JSON.parse(req.body)["model"] == "gpt-5-nano"
          }
        ).to have_been_made
      end

      it "response_format に name: recommendations、strict: true を含む" do
        expect(
          a_request(:post, openai_endpoint).with { |req|
            body = JSON.parse(req.body)
            rf = body["response_format"]
            rf["type"] == "json_schema" &&
              rf["json_schema"]["name"] == "recommendations" &&
              rf["json_schema"]["strict"] == true
          }
        ).to have_been_made
      end

      it "ユーザーメッセージに query と candidates が含まれる" do
        expect(
          a_request(:post, openai_endpoint).with { |req|
            body = JSON.parse(req.body)
            user_message = body["messages"].find { |m| m["role"] == "user" }
            content = user_message["content"]
            content.include?(query) && content.include?("テスト店舗")
          }
        ).to have_been_made
      end

      it "Authorization ヘッダーに API キーを含む" do
        expect(
          a_request(:post, openai_endpoint).with(
            headers: { "Authorization" => "Bearer #{api_key}" }
          )
        ).to have_been_made
      end

      it "candidates に google_maps_url を含まない" do
        expect(
          a_request(:post, openai_endpoint).with { |req|
            body = JSON.parse(req.body)
            user_message = body["messages"].find { |m| m["role"] == "user" }
            !user_message["content"].include?("google_maps_url")
          }
        ).to have_been_made
      end

      it "元の places の name/address/google_maps_url が変更されない" do
        places_copy = [ build_place(name: "変更確認店舗") ]
        stub_openai_success([ { name: "変更確認店舗", reason: "理由" } ])

        result = service.call(places_copy, "テスト")

        expect(result.first[:name]).to eq("変更確認店舗")
        expect(result.first[:address]).to eq("東京都渋谷区")
        expect(result.first[:google_maps_url]).to include("変更確認店舗")
      end
    end

    context "min_count / max_count を指定した場合" do
      let(:places) { [ build_place(name: "テスト店舗") ] }

      it "min_count: 5, max_count: 5 のとき OpenAI へのシステムプロンプトに「5〜5 件」が含まれる" do
        stub_openai_success([ { name: "テスト店舗", reason: "理由" } ])

        service.call(places, "テスト", min_count: 5, max_count: 5)

        expect(
          a_request(:post, openai_endpoint).with { |req|
            body = JSON.parse(req.body)
            system_message = body["messages"].find { |m| m["role"] == "system" }
            system_message["content"].include?("5〜5 件")
          }
        ).to have_been_made
      end

      it "デフォルト呼び出し（引数なし）で OpenAI へのシステムプロンプトに「3〜5 件」が含まれる" do
        stub_openai_success([ { name: "テスト店舗", reason: "理由" } ])

        service.call(places, "テスト")

        expect(
          a_request(:post, openai_endpoint).with { |req|
            body = JSON.parse(req.body)
            system_message = body["messages"].find { |m| m["role"] == "system" }
            system_message["content"].include?("3〜5 件")
          }
        ).to have_been_made
      end
    end

    context "prefilter のテスト" do
      context "rating 3.5 以上の候補が min_count 以上あるとき" do
        it "rating < 3.5 の候補が AI リクエストに含まれない" do
          places = [
            build_place(name: "高評価店A", rating: 4.5),
            build_place(name: "高評価店B", rating: 4.0),
            build_place(name: "高評価店C", rating: 3.5),
            build_place(name: "低評価店D", rating: 3.4),
            build_place(name: "低評価店E", rating: 2.0)
          ]
          stub_openai_success([ { name: "高評価店A", reason: "理由" } ])

          service.call(places, "テスト")

          expect(
            a_request(:post, openai_endpoint).with { |req|
              body = JSON.parse(req.body)
              user_message = body["messages"].find { |m| m["role"] == "user" }
              content = JSON.parse(user_message["content"])
              candidate_names = content["candidates"].map { |c| c["name"] }
              !candidate_names.include?("低評価店D") && !candidate_names.include?("低評価店E")
            }
          ).to have_been_made
        end
      end

      context "フィルタ後の候補数が min_count 未満のとき" do
        it "全候補が AI に送信される（フォールバック）" do
          places = [
            build_place(name: "高評価店A", rating: 4.5),
            build_place(name: "低評価店B", rating: 3.0),
            build_place(name: "低評価店C", rating: 2.0)
          ]
          stub_openai_success([ { name: "高評価店A", reason: "理由" } ])

          # min_count デフォルト 3 に対してフィルタ後は 1 件 → 全件フォールバック
          service.call(places, "テスト")

          expect(
            a_request(:post, openai_endpoint).with { |req|
              body = JSON.parse(req.body)
              user_message = body["messages"].find { |m| m["role"] == "user" }
              content = JSON.parse(user_message["content"])
              candidate_names = content["candidates"].map { |c| c["name"] }
              candidate_names.include?("低評価店B") && candidate_names.include?("低評価店C")
            }
          ).to have_been_made
        end
      end

      context "rating が正確に 3.5 の候補" do
        it "除外されない（境界値確認）" do
          places = [
            build_place(name: "境界値店A", rating: 3.5),
            build_place(name: "境界値店B", rating: 3.5),
            build_place(name: "境界値店C", rating: 3.5)
          ]
          stub_openai_success([ { name: "境界値店A", reason: "理由" } ])

          service.call(places, "テスト")

          expect(
            a_request(:post, openai_endpoint).with { |req|
              body = JSON.parse(req.body)
              user_message = body["messages"].find { |m| m["role"] == "user" }
              content = JSON.parse(user_message["content"])
              candidate_names = content["candidates"].map { |c| c["name"] }
              candidate_names.include?("境界値店A") &&
                candidate_names.include?("境界値店B") &&
                candidate_names.include?("境界値店C")
            }
          ).to have_been_made
        end
      end
    end

    context "parsed_conditions の検証" do
      context "parsed_conditions を渡したとき" do
        it "OpenAI リクエストボディのユーザーメッセージに conditions キーが含まれる" do
          # rating 3.5 以上を min_count(3) 以上用意してprefilter通常パスを経由させる
          places = [
            build_place(name: "テスト店舗A", rating: 4.0),
            build_place(name: "テスト店舗B", rating: 3.8),
            build_place(name: "テスト店舗C", rating: 3.5)
          ]
          parsed_conditions = { area: "渋谷", genre: "イタリアン", price_level: nil, keyword: nil }
          stub_openai_success([ { name: "テスト店舗A", reason: "理由" } ])

          service.call(places, "テスト", parsed_conditions: parsed_conditions)

          expect(
            a_request(:post, openai_endpoint).with { |req|
              body = JSON.parse(req.body)
              user_message = body["messages"].find { |m| m["role"] == "user" }
              content = JSON.parse(user_message["content"])
              content.key?("conditions") && content["candidates"].size == 3
            }
          ).to have_been_made
        end
      end

      context "parsed_conditions を渡さないとき（nil のとき）" do
        it "OpenAI リクエストボディのユーザーメッセージに conditions キーが含まれない（後方互換）" do
          places = [ build_place(name: "テスト店舗") ]
          stub_openai_success([ { name: "テスト店舗", reason: "理由" } ])

          service.call(places, "テスト")

          expect(
            a_request(:post, openai_endpoint).with { |req|
              body = JSON.parse(req.body)
              user_message = body["messages"].find { |m| m["role"] == "user" }
              content = JSON.parse(user_message["content"])
              !content.key?("conditions")
            }
          ).to have_been_made
        end
      end
    end

    context "エラーハンドリング" do
      let(:places) { [ build_place(name: "テスト店舗") ] }

      it "4xx エラーで RecommendationError を raise する" do
        stub_request(:post, openai_endpoint)
          .to_return(status: 400, body: '{"error": "Bad Request"}')

        expect { service.call(places, "テスト") }.to raise_error(RecommendationError)
      end

      it "5xx エラーで RecommendationError を raise する" do
        stub_request(:post, openai_endpoint)
          .to_return(status: 500, body: '{"error": "Internal Server Error"}')

        expect { service.call(places, "テスト") }.to raise_error(RecommendationError)
      end

      it "タイムアウトで RecommendationError を raise する" do
        stub_request(:post, openai_endpoint).to_timeout

        expect { service.call(places, "テスト") }.to raise_error(RecommendationError)
      end

      it "不正な JSON レスポンスで RecommendationError を raise する" do
        stub_request(:post, openai_endpoint)
          .to_return(
            status: 200,
            body: {
              choices: [ { message: { content: "not valid json{{{" } } ]
            }.to_json,
            headers: { "Content-Type" => "application/json" }
          )

        expect { service.call(places, "テスト") }.to raise_error(RecommendationError)
      end

      it "API キーファイル不在で RecommendationError を raise する" do
        allow(File).to receive(:read).with("/openai_apikey").and_raise(Errno::ENOENT)

        expect { service.call(places, "テスト") }.to raise_error(RecommendationError)
      end
    end
  end

  private

  def build_place(name:, rating: 4.0, price_level: "PRICE_LEVEL_MODERATE", address: "東京都渋谷区")
    {
      name: name,
      rating: rating,
      price_level: price_level,
      address: address,
      google_maps_url: "https://maps.google.com/?q=#{name}"
    }
  end

  def stub_openai_success(recommendations)
    response_content = { recommendations: recommendations }.to_json

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
