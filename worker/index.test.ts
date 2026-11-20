import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createApp } from './index';

const env = { SUPABASE_URL: 'https://example.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'test',
  ADMIN_USER_ID: 'owner-id', RATE_LIMIT_SALT: 'test-salt', ALLOWED_ORIGINS: 'http://localhost:5173' };

describe('API bãi xe', () => {
  it('từ chối dữ liệu thiếu ghim trước khi ghi', async () => {
    const rpc = vi.fn();
    const app = createApp(() => ({ rpc }) as unknown as SupabaseClient);
    const response = await app.request('http://localhost/api/v1/contributions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: 'Bãi mẫu' })
    }, env);
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it('không cho khách xem hàng chờ', async () => {
    const app = createApp();
    const response = await app.request('http://localhost/api/v1/admin/contributions', {}, env);
    expect(response.status).toBe(401);
  });

  it('không cho tài khoản khác xem hàng chờ', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'someone-else' } }, error: null });
    const from = vi.fn();
    const app = createApp(() => ({ auth: { getUser }, from }) as unknown as SupabaseClient);
    const response = await app.request('http://localhost/api/v1/admin/contributions', {
      headers: { Authorization: 'Bearer valid-token' }
    }, env);
    expect(response.status).toBe(401);
    expect(from).not.toHaveBeenCalled();
  });

  it('chỉ chủ dự án được duyệt bãi và API trả CORS cho website đã cho phép', async () => {
    const getUser = vi.fn().mockResolvedValue({ data: { user: { id: 'someone-else' } }, error: null });
    const rpc = vi.fn().mockResolvedValue({ data: 'reviewed', error: null });
    const app = createApp(() => ({ auth: { getUser }, rpc }) as unknown as SupabaseClient);
    const url = 'http://localhost/api/v1/admin/contributions/00000000-0000-4000-8000-000000000001';
    const init = { method: 'PATCH', headers: { Authorization: 'Bearer valid-token', Origin: 'http://localhost:5173', 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve', wardCode: 'sai-gon', wardName: 'Sài Gòn' }) };
    const denied = await app.request(url, init, env);
    expect(denied.status).toBe(401);
    expect(denied.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(rpc).not.toHaveBeenCalled();
    getUser.mockResolvedValue({ data: { user: { id: 'owner-id' } }, error: null });
    const approved = await app.request(url, init, env);
    expect(approved.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('review_parking_contribution', expect.objectContaining({ p_action: 'approve', p_ward_name: 'Sài Gòn' }));
  });

  it('gửi bãi hợp lệ vào hàng chờ và chỉ xuất bảng đã duyệt', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: 'new-id', error: null });
    const range = vi.fn().mockResolvedValue({ data: [{ id: 'approved', name: 'Bãi đã duyệt',
      entrance_lon: 106.7, entrance_lat: 10.78, ward_code: 'sai-gon', ward_name: 'Sài Gòn',
      address: null, price: null, hours: null }], error: null });
    const from = vi.fn(() => ({ select: () => ({ order: () => ({ range }) }) }));
    const app = createApp(() => ({ rpc, from }) as unknown as SupabaseClient);
    const submitted = await app.request('http://localhost/api/v1/contributions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bãi mới', entrance: [106.71, 10.77] })
    }, env);
    expect(submitted.status).toBe(201);
    expect((await submitted.json() as { status: string }).status).toBe('pending');
    expect(rpc.mock.calls[0][1].p_visitor_hash).toMatch(/^[0-9a-f]{64}$/);
    const publicResponse = await app.request('http://localhost/api/v1/parking.geojson', {}, env);
    expect(publicResponse.status).toBe(200);
    expect(from).toHaveBeenCalledWith('parkings');
    expect((await publicResponse.json() as { features: { id: string }[] }).features.map((feature) => feature.id)).toEqual(['approved']);
  });
});
