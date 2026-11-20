export type ContributionInput = {
  name: string;
  entrance: [number, number];
  address: string | null;
  price: string | null;
  hours: string | null;
};

export type ParkingRow = {
  id: string;
  name: string;
  entrance_lon: number;
  entrance_lat: number;
  ward_code: string;
  ward_name: string;
  address: string | null;
  price: string | null;
  hours: string | null;
};

function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length <= max ? trimmed || null : undefined;
}

export function parseContribution(value: unknown): ContributionInput | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  const name = optionalText(body.name, 160);
  const address = optionalText(body.address, 300);
  const price = optionalText(body.price, 160);
  const hours = optionalText(body.hours, 160);
  const entrance = body.entrance;
  if (!name || address === undefined || price === undefined || hours === undefined ||
    !Array.isArray(entrance) || entrance.length !== 2 ||
    !entrance.every((n) => typeof n === 'number' && Number.isFinite(n)) ||
    entrance[0] < -180 || entrance[0] > 180 || entrance[1] < -90 || entrance[1] > 90) return null;
  return { name, entrance: [entrance[0], entrance[1]], address, price, hours };
}

export function parseReview(value: unknown): { action: 'approve' | 'reject'; wardCode: string | null; wardName: string | null } | null {
  if (!value || typeof value !== 'object') return null;
  const body = value as Record<string, unknown>;
  if (body.action !== 'approve' && body.action !== 'reject') return null;
  const wardCode = optionalText(body.wardCode, 80);
  const wardName = optionalText(body.wardName, 120);
  if (wardCode === undefined || wardName === undefined) return null;
  if (body.action === 'approve' && (!wardCode || !wardName)) return null;
  return { action: body.action, wardCode, wardName };
}

export function toGeoJSON(rows: ParkingRow[]) {
  return {
    type: 'FeatureCollection' as const,
    features: rows.map((row) => ({
      type: 'Feature' as const,
      id: row.id,
      geometry: { type: 'Point' as const, coordinates: [row.entrance_lon, row.entrance_lat] as [number, number] },
      properties: {
        name: row.name,
        wardCode: row.ward_code,
        wardName: row.ward_name,
        ...(row.address ? { address: row.address } : {}),
        ...(row.price ? { price: row.price } : {}),
        ...(row.hours ? { hours: row.hours } : {})
      }
    }))
  };
}
