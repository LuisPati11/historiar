const EARTH_RADIUS_METERS = 6_371_000;

export function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(lat2 - lat1);
  const dLng = radians(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(radians(lat1)) * Math.cos(radians(lat2)) * Math.sin(dLng / 2) ** 2;
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function walkingMinutes(meters: number): number {
  return Math.max(1, Math.round(meters / 80));
}
