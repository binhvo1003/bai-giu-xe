import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Hono } from 'hono';
import { parseContribution, parseReview, toGeoJSON, type ParkingRow } from './contract';

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_USER_ID: string;
  RATE_LIMIT_SALT: string;
  ALLOWED_ORIGINS: string;
};

type AppEnv = { Bindings: Bindings };
type ClientFactory = (env: Bindings) => SupabaseClient;

const makeClient: ClientFactory = (env) => createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false }
});

const errorMessage = (status: number, message: string) => ({ status, message });

export function createApp(clientFactory: ClientFactory = makeClient) {
  const app = new Hono<AppEnv>();

  app.use('/api/*', async (c, next) => {
    const origin = c.req.header('Origin');
    const allowed = (c.env.ALLOWED_ORIGINS || '').split(',').map((item) => item.trim());
    if (origin && !allowed.includes(origin)) return c.json(errorMessage(403, 'Nguồn truy cập không được phép.'), 403);
    if (c.req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'Access-Control-Allow-Origin': origin || '',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
        'Access-Control-Max-Age': '86400'
      } });
    }
    await next();
    if (origin) c.header('Access-Control-Allow-Origin', origin);
    c.header('Vary', 'Origin');
  });

  app.use('/api/*', async (c, next) => {
    if (!c.env.SUPABASE_URL || !c.env.SUPABASE_SERVICE_ROLE_KEY || !c.env.ADMIN_USER_ID || !c.env.RATE_LIMIT_SALT) {
      return c.json(errorMessage(503, 'Máy chủ chưa được cấu hình.'), 503);
    }
    await next();
  });

  async function requireOwner(c: { req: { header: (name: string) => string | undefined }; env: Bindings }) {
    const token = c.req.header('Authorization')?.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return false;
    const { data, error } = await clientFactory(c.env).auth.getUser(token);
    return !error && data.user?.id === c.env.ADMIN_USER_ID;
  }

  app.post('/api/v1/contributions', async (c) => {
    const raw = await c.req.json().catch(() => null);
    const input = parseContribution(raw);
    if (!input) return c.json(errorMessage(400, 'Cần tên bãi và ghim cổng vào hợp lệ.'), 400);
    const ip = c.req.header('CF-Connecting-IP') || 'local';
    const date = new Date().toISOString().slice(0, 10);
    const bytes = new TextEncoder().encode(`${c.env.RATE_LIMIT_SALT}:${date}:${ip}`);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
    const { data, error } = await clientFactory(c.env).rpc('submit_parking_contribution', {
      p_name: input.name,
      p_entrance_lon: input.entrance[0],
      p_entrance_lat: input.entrance[1],
      p_address: input.address,
      p_price: input.price,
      p_hours: input.hours,
      p_visitor_hash: hash
    });
    if (error) {
      if (error.message.includes('giới hạn')) return c.json(errorMessage(429, 'Bạn đã gửi quá nhiều bãi hôm nay. Hãy thử lại ngày mai.'), 429);
      return c.json(errorMessage(503, 'Chưa lưu được đề xuất. Hãy thử lại.'), 503);
    }
    return c.json({ id: data, status: 'pending' }, 201);
  });

  app.get('/api/v1/parking.geojson', async (c) => {
    const client = clientFactory(c.env);
    const rows: ParkingRow[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await client.from('parkings')
        .select('id,name,entrance_lon,entrance_lat,ward_code,ward_name,address,price,hours')
        .order('name').range(offset, offset + 999);
      if (error) {
        console.error('Supabase parkings query failed', { code: error.code, message: error.message });
        return c.json(errorMessage(503, 'Chưa tải được dữ liệu bãi xe.'), 503);
      }
      rows.push(...(data as ParkingRow[]));
      if (!data || data.length < 1000) break;
    }
    c.header('Cache-Control', 'no-store');
    return c.json(toGeoJSON(rows));
  });

  app.get('/api/v1/admin/contributions', async (c) => {
    if (!await requireOwner(c)) return c.json(errorMessage(401, 'Cần đăng nhập quản trị.'), 401);
    const { data, error } = await clientFactory(c.env).from('parking_contributions')
      .select('id,name,entrance_lon,entrance_lat,address,price,hours,created_at')
      .eq('status', 'pending').order('created_at', { ascending: true }).limit(100);
    if (error) return c.json(errorMessage(503, 'Chưa tải được hàng chờ.'), 503);
    return c.json({ contributions: data });
  });

  app.patch('/api/v1/admin/contributions/:id', async (c) => {
    if (!await requireOwner(c)) return c.json(errorMessage(401, 'Cần đăng nhập quản trị.'), 401);
    const id = c.req.param('id');
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return c.json(errorMessage(400, 'ID đề xuất không hợp lệ.'), 400);
    }
    const review = parseReview(await c.req.json().catch(() => null));
    if (!review) return c.json(errorMessage(400, 'Cần quyết định và phường hợp lệ.'), 400);
    const { error } = await clientFactory(c.env).rpc('review_parking_contribution', {
      p_id: id,
      p_action: review.action,
      p_ward_code: review.wardCode,
      p_ward_name: review.wardName
    });
    if (error) return c.json(errorMessage(409, 'Không xử lý được đề xuất. Hãy tải lại hàng chờ.'), 409);
    return c.json({ id, status: review.action === 'approve' ? 'approved' : 'rejected' });
  });

  return app;
}

export default createApp();
