import { describe, expect, it } from 'vitest';
import { parseContribution, parseReview, toGeoJSON } from './contract';

describe('hợp đồng đề xuất bãi xe', () => {
  it('chỉ yêu cầu tên và ghim, giữ trường bổ sung là tùy chọn', () => {
    expect(parseContribution({ name: '  Bãi Nguyễn Huệ  ', entrance: [106.7, 10.78] }))
      .toEqual({ name: 'Bãi Nguyễn Huệ', entrance: [106.7, 10.78], address: null, price: null, hours: null });
    expect(parseContribution({ name: 'Bãi', entrance: [106.7, 99] })).toBeNull();
    expect(parseContribution({ name: ' ', entrance: [106.7, 10.78] })).toBeNull();
  });

  it('duyệt phải có phường, từ chối thì không', () => {
    expect(parseReview({ action: 'approve' })).toBeNull();
    expect(parseReview({ action: 'approve', wardCode: 'sai-gon', wardName: 'Sài Gòn' }))
      .toEqual({ action: 'approve', wardCode: 'sai-gon', wardName: 'Sài Gòn' });
    expect(parseReview({ action: 'reject' })?.action).toBe('reject');
  });

  it('xuất đúng tọa độ cổng và phường từ bãi đã duyệt', () => {
    const data = toGeoJSON([{ id: 'approved', name: 'Bãi mẫu', entrance_lon: 106.7, entrance_lat: 10.78,
      ward_code: 'sai-gon', ward_name: 'Sài Gòn', address: null, price: null, hours: null }]);
    expect(data.features[0].geometry.coordinates).toEqual([106.7, 10.78]);
    expect(data.features[0].properties.wardName).toBe('Sài Gòn');
    expect(data.features[0].properties).not.toHaveProperty('price');
  });
});
