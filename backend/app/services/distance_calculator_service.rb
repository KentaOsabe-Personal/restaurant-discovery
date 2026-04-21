class DistanceCalculatorService
  EARTH_RADIUS_KM = 6371.0

  def call(home_lat, home_lng, place_lat, place_lng)
    lat1 = to_rad(home_lat)
    lat2 = to_rad(place_lat)
    dlat = to_rad(place_lat - home_lat)
    dlng = to_rad(place_lng - home_lng)

    a = Math.sin(dlat / 2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dlng / 2)**2
    c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    EARTH_RADIUS_KM * c
  end

  private

  def to_rad(degrees)
    degrees * Math::PI / 180.0
  end
end
