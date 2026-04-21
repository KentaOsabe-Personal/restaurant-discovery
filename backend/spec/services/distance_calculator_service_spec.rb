require "rails_helper"

RSpec.describe DistanceCalculatorService do
  subject(:service) { described_class.new }

  describe "#call" do
    context "新潟駅 → 長岡駅（約54km）" do
      it "Haversine公式による直線距離をkmで返す" do
        result = service.call(37.9161, 139.0364, 37.4520, 138.8510)
        expect(result).to be_within(2.0).of(54.0)
      end
    end

    context "同一地点" do
      it "0.0 を返す" do
        result = service.call(37.9161, 139.0364, 37.9161, 139.0364)
        expect(result).to eq(0.0)
      end
    end
  end
end
