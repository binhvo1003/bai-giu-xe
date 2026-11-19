export type Parking = {
  id: string;
  name: string;
  entrance: [number, number];
  wardCode: string;
  wardName: string;
  address?: string;
  price?: string;
  hours?: string;
  photoUrl?: string;
};

type Feature = {
  type: 'Feature';
  id?: string | number;
  geometry: { type: 'Point'; coordinates: number[] };
  properties: Record<string, unknown>;
};

export function parseParking(data: unknown): Parking[] {
  if (!data || typeof data !== 'object' || !('type' in data) || data.type !== 'FeatureCollection' || !('features' in data) || !Array.isArray(data.features)) {
    throw new Error('Dữ liệu bãi xe không đúng định dạng GeoJSON.');
  }
  return (data.features as Feature[]).map((feature) => {
    const p = feature.properties;
    const coords = feature.geometry?.coordinates;
    const id = String(feature.id ?? p.id ?? '');
    if (feature.type !== 'Feature' || feature.geometry?.type !== 'Point' || !Array.isArray(coords) || coords.length !== 2 || !coords.every(Number.isFinite) || !id || typeof p.name !== 'string' || !p.name.trim() || typeof p.wardCode !== 'string' || typeof p.wardName !== 'string') {
      throw new Error('Một bãi xe thiếu ID, tên, tọa độ cổng hoặc phường.');
    }
    const optional = (key: string) => typeof p[key] === 'string' && p[key] ? p[key] as string : undefined;
    return { id, name: p.name, entrance: [coords[0], coords[1]], wardCode: p.wardCode, wardName: p.wardName, address: optional('address'), price: optional('price'), hours: optional('hours'), photoUrl: optional('photoUrl') };
  });
}

export function distanceKm(a: [number, number], b: [number, number]): number {
  const rad = Math.PI / 180;
  const dLat = (b[1] - a[1]) * rad;
  const dLon = (b[0] - a[0]) * rad;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a[1] * rad) * Math.cos(b[1] * rad) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function nearby(parkings: Parking[], point: [number, number], radiusKm: number) {
  return parkings.map((parking) => ({ parking, distance: distanceKm(point, parking.entrance) }))
    .filter((entry) => entry.distance <= radiusKm)
    .sort((a, b) => a.distance - b.distance || a.parking.name.localeCompare(b.parking.name, 'vi'));
}

export function inWard(parkings: Parking[], wardCode: string) {
  return parkings.filter((parking) => parking.wardCode === wardCode)
    .sort((a, b) => a.name.localeCompare(b.name, 'vi'));
}
