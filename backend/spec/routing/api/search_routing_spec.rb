require "rails_helper"

RSpec.describe "routing for Api::SearchController", type: :routing do
  describe "POST /api/search" do
    it "routes to Api::SearchController#create" do
      expect(post: "/api/search").to route_to("api/search#create")
    end
  end

  describe "non-POST methods" do
    it "does not route GET /api/search" do
      expect(get: "/api/search").not_to be_routable
    end

    it "does not route PUT /api/search" do
      expect(put: "/api/search").not_to be_routable
    end

    it "does not route DELETE /api/search" do
      expect(delete: "/api/search").not_to be_routable
    end
  end
end
