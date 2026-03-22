require "rails_helper"

RSpec.describe RecommendationError do
  it "StandardError を継承していること" do
    expect(RecommendationError).to be < StandardError
  end

  it "メッセージを受け取れること" do
    error = RecommendationError.new("API error occurred")
    expect(error.message).to eq("API error occurred")
  end

  it "元の例外を cause として保持できること" do
    original = Faraday::TimeoutError.new("timeout")
    begin
      begin
        raise original
      rescue => e
        raise RecommendationError, "OpenAI API タイムアウト"
      end
    rescue RecommendationError => wrapped
      expect(wrapped.message).to eq("OpenAI API タイムアウト")
      expect(wrapped.cause).to be_a(Faraday::TimeoutError)
      expect(wrapped.cause.message).to eq("timeout")
    end
  end
end
