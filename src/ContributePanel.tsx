import { useState, type FormEvent } from 'react';
import { apiConfigured, submitContribution, type Entrance } from './api';

type Props = {
  entrance: Entrance | null;
  onLocate: () => void;
  onDone: () => void;
};

export default function ContributePanel({ entrance, onLocate, onDone }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!entrance) { setError('Hãy chạm vào bản đồ để ghim đúng cổng xe máy vào.'); return; }
    const form = event.currentTarget;
    const data = new FormData(form);
    setBusy(true); setError('');
    try {
      await submitContribution({
        name: String(data.get('name') || '').trim(), entrance,
        address: String(data.get('address') || '').trim(),
        price: String(data.get('price') || '').trim(),
        hours: String(data.get('hours') || '').trim()
      });
      setSent(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Chưa gửi được đề xuất.'); }
    finally { setBusy(false); }
  }

  if (sent) return <section className="contribute-panel" aria-label="Đóng góp">
    <h1>Đã gửi bãi xe</h1>
    <p role="status">Cảm ơn bạn. Bãi sẽ xuất hiện trên bản đồ sau khi chủ dự án kiểm chứng và duyệt.</p>
    <button className="primary" onClick={onDone}>Về bản đồ</button>
  </section>;

  return <section className="contribute-panel" aria-label="Thêm bãi xe">
    <h1>Thêm bãi xe</h1>
    <p>Chạm vào bản đồ để ghim đúng cổng xe máy chạy vào. Bạn có thể kéo ghim để chỉnh vị trí.</p>
    <form onSubmit={(event) => void submit(event)}>
      <label htmlFor="parking-name">Tên bãi xe <span aria-hidden="true">*</span></label>
      <input id="parking-name" name="name" maxLength={160} required placeholder="Ví dụ: Bãi xe đường Nguyễn Huệ" />
      <div className="pin-status" role="status">{entrance ? `Đã ghim cổng: ${entrance[1].toFixed(6)}, ${entrance[0].toFixed(6)}` : 'Chưa ghim cổng vào'}</div>
      <button type="button" className="secondary" onClick={onLocate}>Dùng vị trí của tôi để đặt ghim</button>
      <label htmlFor="parking-address">Địa chỉ (nếu có)</label>
      <input id="parking-address" name="address" maxLength={300} placeholder="Số nhà, tên đường" />
      <label htmlFor="parking-price">Giá vé (nếu có)</label>
      <input id="parking-price" name="price" maxLength={160} placeholder="Ví dụ: 5.000đ/lượt" />
      <label htmlFor="parking-hours">Giờ mở cửa (nếu có)</label>
      <input id="parking-hours" name="hours" maxLength={160} placeholder="Ví dụ: 06:00–22:00" />
      {error && <p role="alert" className="notice">{error}</p>}
      {!apiConfigured && <p className="notice">Máy chủ chưa được cấu hình. Bạn vẫn có thể thử ghim trên bản đồ.</p>}
      <button className="primary" type="submit" disabled={busy || !apiConfigured}>{busy ? 'Đang gửi…' : 'Gửi bãi để kiểm chứng'}</button>
    </form>
  </section>;
}
