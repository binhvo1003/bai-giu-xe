import { parseParking, type Parking } from './parking';
import { apiBaseUrl } from './config';

export type Entrance = [number, number];
export type ContributionDraft = { name: string; entrance: Entrance; address?: string; price?: string; hours?: string };
export type PendingContribution = {
  id: string;
  name: string;
  entrance_lon: number;
  entrance_lat: number;
  address: string | null;
  price: string | null;
  hours: string | null;
  created_at: string;
};

export const apiConfigured = Boolean(apiBaseUrl);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try { response = await fetch(`${apiBaseUrl}${path}`, init); }
  catch { throw new Error('Không kết nối được máy chủ. Hãy thử lại.'); }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new Error(body?.message || 'Không kết nối được máy chủ. Hãy thử lại.');
  return body as T;
}

export async function fetchParkings(): Promise<Parking[]> {
  const path = apiConfigured ? '/api/v1/parking.geojson' : '/parking.geojson';
  return parseParking(await request<unknown>(path));
}

export function submitContribution(draft: ContributionDraft) {
  if (!apiConfigured) throw new Error('Chưa kết nối máy chủ lưu bãi xe.');
  return request<{ id: string; status: 'pending' }>('/api/v1/contributions', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft)
  });
}

export function getPending(token: string) {
  return request<{ contributions: PendingContribution[] }>('/api/v1/admin/contributions', {
    headers: { Authorization: `Bearer ${token}` }
  });
}

export function reviewContribution(id: string, token: string, action: 'approve' | 'reject', wardCode?: string, wardName?: string) {
  return request<{ id: string; status: string }>(`/api/v1/admin/contributions/${id}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, wardCode, wardName })
  });
}
