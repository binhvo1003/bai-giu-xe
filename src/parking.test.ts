import { describe, expect, it } from 'vitest';
import { inWard, nearby, type Parking } from './parking';

const parking = (id: string, name: string, entrance: [number, number], wardCode: string): Parking => ({ id, name, entrance, wardCode, wardName: wardCode });
const point: [number, number] = [106.7, 10.78];
const data = [parking('far', 'Xa', [106.718, 10.78], 'B'), parking('near', 'Gần', [106.704, 10.78], 'A'), parking('other', 'Kế bên', [106.705, 10.78], 'B')];

describe('lọc bãi xe', () => {
  it('tìm xuyên ranh phường và mở rộng quanh cùng điểm', () => {
    expect(nearby(data, point, 1).map(({ parking }) => parking.id)).toEqual(['near', 'other']);
    expect(nearby(data, point, 2).map(({ parking }) => parking.id)).toEqual(['near', 'other', 'far']);
  });
  it('chọn phường và xếp tên', () => {
    expect(inWard(data, 'B').map((parking) => parking.id)).toEqual(['other', 'far']);
  });
});
