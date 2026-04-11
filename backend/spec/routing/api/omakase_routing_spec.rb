require "rails_helper"

RSpec.describe "routing for Api::OmakaseController", type: :routing do
  describe "POST /api/omakase" do
    it "routes to Api::OmakaseController#create" do
      expect(post: "/api/omakase").to route_to("api/omakase#create")
    end
  end

  describe "non-POST methods" do
    it "does not route GET /api/omakase" do
      expect(get: "/api/omakase").not_to be_routable
    end

    it "does not route DELETE /api/omakase" do
      expect(delete: "/api/omakase").not_to be_routable
    end
  end
end
