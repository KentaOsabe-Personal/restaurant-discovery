require "rails_helper"

RSpec.describe OmakaseService do
  let(:service) { described_class.new }

  describe "SUB_AREAS 定数" do
    it "4エリアすべてが定義されている" do
      expect(described_class::SUB_AREAS.keys).to contain_exactly("ekimae", "ekinan", "furumachi", "nagaoka")
    end

    it "各エリアのプレフィックスが非空文字列である" do
      described_class::SUB_AREAS.each_value do |config|
        expect(config[:prefix]).to be_a(String).and(satisfy { |s| s.length > 0 })
      end
    end

    it "各エリアのサブエリア名配列が非空である" do
      described_class::SUB_AREAS.each_value do |config|
        expect(config[:names]).to be_an(Array).and(satisfy { |a| a.length > 0 })
      end
    end
  end

  describe "NIGHT_GENRE 定数" do
    it "夜向けジャンル文字列が「居酒屋 バー」である" do
      expect(described_class::NIGHT_GENRE).to eq("居酒屋 バー")
    end
  end

  describe "#call" do
    context "ekimae を渡した場合" do
      it "area / genre / sub_area / area_id / area_names を含む Hash を返す" do
        result = service.call("ekimae")

        expect(result[:genre]).to eq("居酒屋 バー")
        expect(result[:area_id]).to eq("ekimae")
        expect(result[:price_level]).to be_nil
        expect(result[:keyword]).to be_nil
        expect(described_class::SUB_AREAS["ekimae"][:names]).to include(result[:sub_area])
        expect(result[:area]).to eq("新潟市中央区 #{result[:sub_area]}")
        expect(result[:area_names]).to contain_exactly(*described_class::SUB_AREAS["ekimae"][:names])
      end
    end

    context "ekinan を渡した場合" do
      it "area / genre / sub_area / area_id / area_names を含む Hash を返す" do
        result = service.call("ekinan")

        expect(result[:genre]).to eq("居酒屋 バー")
        expect(result[:area_id]).to eq("ekinan")
        expect(result[:price_level]).to be_nil
        expect(result[:keyword]).to be_nil
        expect(described_class::SUB_AREAS["ekinan"][:names]).to include(result[:sub_area])
        expect(result[:area]).to eq("新潟市中央区 #{result[:sub_area]}")
        expect(result[:area_names]).to contain_exactly(*described_class::SUB_AREAS["ekinan"][:names])
      end
    end

    context "furumachi を渡した場合" do
      it "area / genre / sub_area / area_id / area_names を含む Hash を返す" do
        result = service.call("furumachi")

        expect(result[:genre]).to eq("居酒屋 バー")
        expect(result[:area_id]).to eq("furumachi")
        expect(result[:price_level]).to be_nil
        expect(result[:keyword]).to be_nil
        expect(described_class::SUB_AREAS["furumachi"][:names]).to include(result[:sub_area])
        expect(result[:area]).to eq("新潟市中央区 #{result[:sub_area]}")
        expect(result[:area_names]).to contain_exactly(*described_class::SUB_AREAS["furumachi"][:names])
      end
    end

    context "nagaoka を渡した場合" do
      it "area / genre / sub_area / area_id / area_names を含む Hash を返す" do
        result = service.call("nagaoka")

        expect(result[:genre]).to eq("居酒屋 バー")
        expect(result[:area_id]).to eq("nagaoka")
        expect(result[:price_level]).to be_nil
        expect(result[:keyword]).to be_nil
        expect(described_class::SUB_AREAS["nagaoka"][:names]).to include(result[:sub_area])
        expect(result[:area]).to eq("長岡市 #{result[:sub_area]}")
        expect(result[:area_names]).to contain_exactly(*described_class::SUB_AREAS["nagaoka"][:names])
      end
    end

    context "未知の area_id を渡した場合" do
      it "OmakaseService::UnknownArea を raise する" do
        expect { service.call("unknown") }.to raise_error(OmakaseService::UnknownArea)
      end

      it "空文字列でも OmakaseService::UnknownArea を raise する" do
        expect { service.call("") }.to raise_error(OmakaseService::UnknownArea)
      end
    end

    context "Random.new(42) を注入した場合" do
      it "同じ seed で毎回同じサブエリアが選ばれる（再現可能性）" do
        service1 = described_class.new(random: Random.new(42))
        service2 = described_class.new(random: Random.new(42))

        result1 = service1.call("ekimae")
        result2 = service2.call("ekimae")

        expect(result1[:sub_area]).to eq(result2[:sub_area])
      end

      it "seed が異なれば異なるサブエリアが選ばれる場合がある" do
        # 複数の seed を試して差異が生じることを確認（確率的テスト）
        names = described_class::SUB_AREAS["ekimae"][:names]
        sub_areas = (0..20).map do |seed|
          described_class.new(random: Random.new(seed)).call("ekimae")[:sub_area]
        end

        # 7つのサブエリアがあるので、21回試せば必ず複数の値が出る
        expect(sub_areas.uniq.size).to be > 1
      end
    end
  end
end
