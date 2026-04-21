require "rails_helper"

RSpec.describe RamenOmakaseService do
  let(:fixed_random) { Random.new(42) }

  subject(:service) { described_class.new(random: fixed_random) }

  describe "BATTLE_AREAS" do
    it "area_id, label, query_area, filter_terms, center_lat, center_lng を持つ" do
      described_class::BATTLE_AREAS.each do |area|
        expect(area).to include(:area_id, :label, :query_area, :filter_terms, :center_lat, :center_lng)
      end
    end

    it "area_id が一意である" do
      ids = described_class::BATTLE_AREAS.map { |a| a[:area_id] }
      expect(ids.uniq.size).to eq(ids.size)
    end
  end

  describe "#call" do
    shared_examples "正常なレスポンス構造" do |travel_time_val|
      it "必須キーを含むハッシュを返す" do
        result = service.call(travel_time: travel_time_val)
        expect(result).to include(:area, :genre, :sub_area, :area_id, :area_names, :travel_time)
      end

      it "genre が ラーメン を返す" do
        expect(service.call(travel_time: travel_time_val)[:genre]).to eq("ラーメン")
      end

      it "travel_time を echo して返す" do
        expect(service.call(travel_time: travel_time_val)[:travel_time]).to eq(travel_time_val)
      end

      it "area_names が配列を返す" do
        expect(service.call(travel_time: travel_time_val)[:area_names]).to be_an(Array)
      end
    end

    context "travel_time が nil のとき（全エリア対象）" do
      it "domain error を送出しない" do
        expect { service.call(travel_time: nil) }.not_to raise_error
      end

      include_examples "正常なレスポンス構造", nil
    end

    context "travel_time が within_30min のとき" do
      before { allow_any_instance_of(DistanceCalculatorService).to receive(:call).and_return(10.0) }

      it "domain error を送出しない" do
        expect { service.call(travel_time: "within_30min") }.not_to raise_error
      end

      include_examples "正常なレスポンス構造", "within_30min"
    end

    context "travel_time が within_1hour のとき" do
      before { allow_any_instance_of(DistanceCalculatorService).to receive(:call).and_return(40.0) }

      it "domain error を送出しない" do
        expect { service.call(travel_time: "within_1hour") }.not_to raise_error
      end

      include_examples "正常なレスポンス構造", "within_1hour"
    end

    context "travel_time が 1_to_2_hours のとき" do
      before { allow_any_instance_of(DistanceCalculatorService).to receive(:call).and_return(80.0) }

      it "domain error を送出しない" do
        expect { service.call(travel_time: "1_to_2_hours") }.not_to raise_error
      end

      include_examples "正常なレスポンス構造", "1_to_2_hours"
    end

    context "eligible area が 0 件のとき" do
      it "within_30min で全エリアが 30km 超のとき NoEligibleArea を送出する" do
        allow_any_instance_of(DistanceCalculatorService).to receive(:call).and_return(999.0)
        expect { service.call(travel_time: "within_30min") }
          .to raise_error(RamenOmakaseService::NoEligibleArea)
      end

      it "1_to_2_hours で全エリアが 60km 未満のとき NoEligibleArea を送出する" do
        allow_any_instance_of(DistanceCalculatorService).to receive(:call).and_return(10.0)
        expect { service.call(travel_time: "1_to_2_hours") }
          .to raise_error(RamenOmakaseService::NoEligibleArea)
      end
    end

    context "実際の座標による距離区分テスト" do
      it "within_30min で nagaoka と joetsu が eligible にならない" do
        results = 20.times.map { |i|
          described_class.new(random: Random.new(i)).call(travel_time: "within_30min")[:area_id]
        }
        expect(results).not_to include("nagaoka")
        expect(results).not_to include("joetsu")
      end

      it "within_1hour で joetsu が eligible にならない" do
        results = 20.times.map { |i|
          described_class.new(random: Random.new(i)).call(travel_time: "within_1hour")[:area_id]
        }
        expect(results).not_to include("joetsu")
      end

      it "1_to_2_hours で eligible なのは joetsu のみ" do
        results = 20.times.map { |i|
          described_class.new(random: Random.new(i)).call(travel_time: "1_to_2_hours")[:area_id]
        }
        expect(results.uniq).to contain_exactly("joetsu")
      end
    end

    context "Random 注入による決定的な選定" do
      it "同一シードでは常に同じ area_id を返す" do
        r1 = described_class.new(random: Random.new(0)).call(travel_time: nil)
        r2 = described_class.new(random: Random.new(0)).call(travel_time: nil)
        expect(r1[:area_id]).to eq(r2[:area_id])
      end

      it "異なるシードでは異なる area_id を返すことがある" do
        ids = 10.times.map { |i|
          described_class.new(random: Random.new(i)).call(travel_time: nil)[:area_id]
        }
        expect(ids.uniq.size).to be > 1
      end
    end
  end
end
