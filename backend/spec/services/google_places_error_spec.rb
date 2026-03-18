require "rails_helper"

RSpec.describe GooglePlacesError do
  it "StandardError を継承していること" do
    expect(GooglePlacesError).to be < StandardError
  end

  it "メッセージを受け取れること" do
    error = GooglePlacesError.new("API error occurred")
    expect(error.message).to eq("API error occurred")
  end

  it "元の例外を cause として保持できること" do
    original = Faraday::TimeoutError.new("timeout")
    begin
      begin
        raise original
      rescue => e
        raise GooglePlacesError, "Google Places API タイムアウト"
      end
    rescue GooglePlacesError => wrapped
      expect(wrapped.message).to eq("Google Places API タイムアウト")
      expect(wrapped.cause).to be_a(Faraday::TimeoutError)
      expect(wrapped.cause.message).to eq("timeout")
    end
  end
end
