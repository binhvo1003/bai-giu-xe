import { useEffect, useState, type FormEvent } from 'react';
import { createClient } from '@supabase/supabase-js';
import { apiConfigured, getPending, reviewContribution, type Entrance, type PendingContribution } from './api';
import { supabasePublishableKey, supabaseUrl } from './config';

type Props = { onInspect: (point: Entrance) => void; onPublished: () => void };
const authConfigured = Boolean(supabaseUrl && supabasePublishableKey);
const auth = authConfigured && typeof window !== 'undefined' ? createClient(
  supabaseUrl, supabasePublishableKey,
  { auth: { storage: window.sessionStorage, persistSession: true, autoRefreshToken: true } }
) : null;

function wardCode(name: string) {
  return name.toLocaleLowerCase('vi').replace(/đ/g, 'd').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export default function AdminPanel({ onInspect, onPublished }: Props) {
  const [token, setToken] = useState('');
  const [queue, setQueue] = useState<PendingContribution[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  async function load(accessToken: string) {
    setBusy(true); setError('');
    try { setQueue((await getPending(accessToken)).contributions); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Không tải được hàng chờ.'); }
    finally { setBusy(false); }
  }

  useEffect(() => {
    if (!auth || !apiConfigured) return;
    void auth.auth.getSession().then(({ data }) => {
      if (data.session?.access_token) {
        setToken(data.session.access_token);
        void load(data.session.access_token);
      }
    });
  }, [auth]);

  async function signIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!auth) return;
    const form = new FormData(event.currentTarget);
    setBusy(true); setError('');
    const { data, error: signInError } = await auth.auth.signInWithPassword({
      email: String(form.get('email') || ''), password: String(form.get('password') || '')
    });
    setBusy(false);
    if (signInError || !data.session) { setError('Đăng nhập không thành công. Kiểm tra email và mật khẩu.'); return; }
    setToken(data.session.access_token);
    void load(data.session.access_token);
  }

  async function review(contribution: PendingContribution, action: 'approve' | 'reject', wardName = '') {
    if (!auth) return;
    const session = (await auth.auth.getSession()).data.session;
    if (!session) { setError('Phiên đăng nhập đã hết. Hãy đăng nhập lại.'); setToken(''); return; }
    const name = wardName.trim();
    const code = wardCode(name);
    if (action === 'approve' && !code) { setError('Hãy xác nhận phường trước khi duyệt.'); return; }
    setBusy(true); setError(''); setMessage('');
    try {
      await reviewContribution(contribution.id, session.access_token, action, code, name);
      setMessage(action === 'approve' ? `Đã duyệt ${contribution.name}.` : `Đã từ chối ${contribution.name}.`);
      await load(session.access_token);
      if (action === 'approve') onPublished();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Không xử lý được đề xuất.'); }
    finally { setBusy(false); }
  }

  return <section className="admin-panel" aria-label="Kiểm duyệt bãi xe">
    <h1>Kiểm duyệt bãi xe</h1>
    {(!auth || !apiConfigured) ? <p className="notice">Máy chủ hoặc xác thực quản trị chưa được cấu hình.</p> : !token ? <form onSubmit={(event) => void signIn(event)}>
      <label htmlFor="admin-email">Email chủ dự án</label><input id="admin-email" name="email" type="email" autoComplete="username" required />
      <label htmlFor="admin-password">Mật khẩu</label><input id="admin-password" name="password" type="password" autoComplete="current-password" required />
      <button className="primary" disabled={busy}>Đăng nhập</button>
    </form> : <>
      <div className="admin-actions"><button className="secondary" disabled={busy} onClick={() => void auth.auth.getSession().then(({ data }) => { if (data.session) { setToken(data.session.access_token); void load(data.session.access_token); } else { setToken(''); setError('Phiên đăng nhập đã hết. Hãy đăng nhập lại.'); } })}>Tải lại</button><button className="secondary" onClick={() => { void auth.auth.signOut(); setToken(''); setQueue([]); }}>Đăng xuất</button></div>
      <p className="admin-help">Xác nhận cổng vào và phường trước khi duyệt. Bãi mới chỉ xuất hiện công khai sau bước này.</p>
      {busy && <p role="status">Đang xử lý…</p>}
      {!busy && queue.length === 0 && <p className="empty">Không có bãi nào đang chờ duyệt.</p>}
      <div className="admin-queue">{queue.map((item) => <article className="admin-item" key={item.id}>
        <h2>{item.name}</h2>
        <p>{item.address || 'Chưa có địa chỉ bằng chữ'}</p>
        <p>Ghim: {item.entrance_lat.toFixed(6)}, {item.entrance_lon.toFixed(6)}</p>
        {item.price && <p>Giá: {item.price}</p>}{item.hours && <p>Giờ: {item.hours}</p>}
        <button className="secondary" onClick={() => onInspect([item.entrance_lon, item.entrance_lat])}>Xem ghim trên bản đồ</button>
        <form onSubmit={(event) => { event.preventDefault(); void review(item, 'approve', String(new FormData(event.currentTarget).get('wardName') || '')); }}>
          <label htmlFor={`ward-${item.id}`}>Phường của cổng vào</label>
          <input id={`ward-${item.id}`} name="wardName" maxLength={120} required placeholder="Ví dụ: Sài Gòn" />
          <div className="review-actions"><button className="primary" disabled={busy}>Duyệt bãi</button><button type="button" className="secondary" disabled={busy} onClick={() => void review(item, 'reject')}>Từ chối</button></div>
        </form>
      </article>)}</div>
    </>}
    {error && <p role="alert" className="notice">{error}</p>}
    {message && <p role="status" className="success-message">{message}</p>}
  </section>;
}
