import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { type Map as MapLibreMap, type Marker } from 'maplibre-gl';
import { inWard, nearby, parseParking, type Parking } from './parking';

type Search = { kind: 'point'; point: [number, number]; label: string; origin: string } | { kind: 'ward'; code: string; label: string } | { kind: 'none' };
type Place = { display_name: string; lon: string; lat: string };
const center: [number, number] = [106.691, 10.776];

function App() {
  const [parkings, setParkings] = useState<Parking[]>([]);
  const [loadError, setLoadError] = useState('');
  const [search, setSearch] = useState<Search>({ kind: 'none' });
  const [radius, setRadius] = useState(1);
  const [address, setAddress] = useState('');
  const [places, setPlaces] = useState<Place[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [selected, setSelected] = useState<Parking | null>(null);
  const [needsOrigin, setNeedsOrigin] = useState(false);
  const [routeError, setRouteError] = useState('');
  const mapHost = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Marker[]>([]);
  const opener = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  function openParking(parking: Parking) {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setRouteError('');
    setSelected(parking);
  }

  function closeParking() {
    setSelected(null);
    setNeedsOrigin(false);
    setRouteError('');
  }

  useEffect(() => {
    if (!selected) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeParking();
      if (event.key !== 'Tab') return;
      const dialog = closeButton.current?.closest('.detail-sheet');
      const focusable = dialog?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
      opener.current?.focus();
    };
  }, [selected]);

  useEffect(() => {
    fetch('/parking.geojson').then((response) => {
      if (!response.ok) throw new Error('Không tải được dữ liệu bãi xe.');
      return response.json();
    }).then((data) => setParkings(parseParking(data))).catch((error) => setLoadError(String(error.message ?? error)));
  }, []);

  const wards = useMemo(() => Array.from(new Map(parkings.map((p) => [p.wardCode, p.wardName])).entries())
    .sort((a, b) => a[1].localeCompare(b[1], 'vi')), [parkings]);
  const results = useMemo(() => search.kind === 'point'
    ? nearby(parkings, search.point, radius)
    : search.kind === 'ward'
      ? inWard(parkings, search.code).map((parking) => ({ parking, distance: undefined }))
      : parkings.slice().sort((a, b) => a.name.localeCompare(b.name, 'vi')).map((parking) => ({ parking, distance: undefined })), [parkings, search, radius]);

  useEffect(() => {
    markers.current.forEach((marker) => {
      const element = marker.getElement();
      element.setAttribute('aria-current', String(element.dataset.parkingId === selected?.id));
    });
  }, [selected, results]);

  useEffect(() => {
    if (!mapHost.current || map.current) return;
    const instance = new maplibregl.Map({
      container: mapHost.current,
      style: { version: 8, sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } }, layers: [{ id: 'osm', type: 'raster', source: 'osm' }] },
      center, zoom: 12
    });
    instance.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.current = instance;
    return () => { instance.remove(); map.current = null; };
  }, []);

  useEffect(() => {
    markers.current.forEach((marker) => marker.remove());
    markers.current = results.map(({ parking }) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'parking-marker';
      button.textContent = 'P';
      button.dataset.parkingId = parking.id;
      button.setAttribute('aria-current', String(selected?.id === parking.id));
      button.setAttribute('aria-label', `Xem bãi ${parking.name}`);
      button.addEventListener('click', () => openParking(parking));
      return new maplibregl.Marker({ element: button }).setLngLat(parking.entrance).addTo(map.current!);
    });
    if (search.kind === 'point') map.current?.flyTo({ center: search.point, zoom: 14 });
    else if (results.length) {
      const bounds = new maplibregl.LngLatBounds();
      results.forEach(({ parking }) => bounds.extend(parking.entrance));
      map.current?.fitBounds(bounds, { padding: 65, maxZoom: 15 });
    }
  }, [results, search]);

  function choosePoint(point: [number, number], label: string, origin: string) {
    setSearch({ kind: 'point', point, label, origin });
    setRadius(1);
    setPlaces([]);
    setMessage('');
  }

  function locate() {
    setMessage('');
    if (!navigator.geolocation) { setMessage('Thiết bị không hỗ trợ định vị. Hãy nhập địa chỉ hoặc chọn phường.'); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(({ coords }) => {
      choosePoint([coords.longitude, coords.latitude], 'Vị trí của tôi', `${coords.latitude},${coords.longitude}`);
      setBusy(false);
    }, () => {
      setMessage('Không lấy được vị trí. Hãy nhập địa chỉ hoặc chọn phường.');
      setBusy(false);
    }, { enableHighAccuracy: true, timeout: 10000 });
  }

  async function lookup() {
    if (!address.trim()) return;
    setBusy(true); setMessage(''); setPlaces([]);
    try {
      const endpoint = import.meta.env.VITE_GEOCODE_URL || 'https://nominatim.openstreetmap.org/search';
      const url = new URL(endpoint);
      url.searchParams.set('q', address.trim());
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('limit', '5');
      url.searchParams.set('countrycodes', 'vn');
      const response = await fetch(url);
      if (!response.ok) throw new Error();
      const found = await response.json() as Place[];
      if (!found.length) setMessage('Không tìm thấy địa chỉ. Hãy thử nhập rõ hơn.');
      else if (found.length === 1) choosePoint([Number(found[0].lon), Number(found[0].lat)], found[0].display_name, found[0].display_name);
      else setPlaces(found);
    } catch { setMessage('Tra địa chỉ thất bại. Hãy thử lại hoặc chọn phường.'); }
    finally { setBusy(false); }
  }

  function route(parking: Parking, origin: string) {
    const url = new URL('https://www.google.com/maps/dir/');
    url.searchParams.set('api', '1');
    url.searchParams.set('origin', origin);
    url.searchParams.set('destination', `${parking.entrance[1]},${parking.entrance[0]}`);
    url.searchParams.set('travelmode', 'driving');
    window.open(url.toString(), '_blank', 'noopener,noreferrer');
  }

  return <>
    <header><div className="brand">P <span>timbaixe.com</span></div><p>Bản đồ cộng đồng tìm đúng cổng bãi giữ xe máy tại TP.HCM</p></header>
    <main>
      <section className="search-panel" aria-label="Tìm bãi xe">
        <h1>Tìm bãi giữ xe máy</h1>
        <button onClick={locate} disabled={busy}>Dùng vị trí của tôi</button>
        <div className="address-row"><input value={address} onChange={(e) => setAddress(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void lookup(); }} placeholder="Nhập địa chỉ hoặc điểm đến" aria-label="Địa chỉ quán hoặc điểm đến" /><button onClick={() => void lookup()} disabled={busy || !address.trim()}>Tìm</button></div>
        {places.length > 0 && <div className="choices"><strong>Chọn đúng địa điểm</strong>{places.map((place) => <button key={`${place.lat},${place.lon}`} onClick={() => choosePoint([Number(place.lon), Number(place.lat)], place.display_name, place.display_name)}>{place.display_name}</button>)}</div>}
        <label className="ward-label" htmlFor="ward">Chọn phường</label>
        <select id="ward" value={search.kind === 'ward' ? search.code : ''} onChange={(e) => { const code = e.target.value; setSearch(code ? { kind: 'ward', code, label: wards.find(([id]) => id === code)?.[1] ?? '' } : { kind: 'none' }); setMessage(''); }}><option value="">Chọn phường</option>{wards.map(([code, name]) => <option key={code} value={code}>{name}</option>)}</select>
        {message && <p role="status" className="notice">{message}</p>}
        {loadError && <p role="alert" className="notice">{loadError}</p>}
      </section>
      <section className="map-section" aria-label="Bản đồ bãi xe"><div ref={mapHost} className="map" /><div className="map-legend"><b>P</b><span>Cổng xe máy vào</span></div></section>
      <section className="results" aria-label="Danh sách bãi xe">
        <h2>{search.kind === 'point' ? `Bãi trong ${radius} km quanh ${search.label}` : search.kind === 'ward' ? `Bãi tại phường ${search.label}` : 'Bãi xe đã kiểm chứng'}</h2>
        {results.length ? <ul>{results.map(({ parking, distance }) => <li key={parking.id}><button aria-current={selected?.id === parking.id} onClick={() => openParking(parking)}><span className="p-icon">P</span><span><strong>{parking.name}</strong><small>{parking.address || parking.wardName}</small></span>{distance !== undefined && <span className="distance">{distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</span>}</button></li>)}</ul> : search.kind === 'point' ? <div className="empty"><p>Chưa có bãi trong bán kính {radius} km.</p><button onClick={() => setRadius((value) => value + 1)}>Tìm xa hơn</button></div> : <p className="empty">Chưa có bãi xe được duyệt trong dữ liệu công khai.</p>}
      </section>
    </main>
    {selected && <div className="sheet-backdrop" onClick={closeParking}>
      <section className="detail-sheet" role="dialog" aria-modal="true" aria-label={`Thông tin ${selected.name}`} onClick={(e) => e.stopPropagation()}>
        <button ref={closeButton} className="close" onClick={closeParking} aria-label="Đóng">×</button>
        <h2>{selected.name}</h2>
        {selected.photoUrl ? <img src={selected.photoUrl} alt={`Cổng vào ${selected.name}`} /> : <div className="no-photo">Chưa có ảnh</div>}
        <dl><dt>Địa chỉ</dt><dd>{selected.address || 'Chưa có địa chỉ bằng chữ'}</dd><dt>Giá vé</dt><dd>{selected.price || 'Chưa có thông tin'}</dd><dt>Giờ mở cửa</dt><dd>{selected.hours || 'Chưa có thông tin'}</dd></dl>
        {routeError && <p className="notice" role="status">{routeError}</p>}
        {search.kind === 'point' ? <button className="primary" onClick={() => route(selected, search.origin)}>Chỉ đường</button> : needsOrigin ? <div className="origin-options"><button onClick={() => { const parking = selected; if (!navigator.geolocation) { setRouteError('Thiết bị không hỗ trợ định vị. Hãy nhập điểm xuất phát.'); return; } navigator.geolocation.getCurrentPosition(({ coords }) => route(parking, `${coords.latitude},${coords.longitude}`), () => setRouteError('Không lấy được vị trí. Hãy nhập điểm xuất phát.')); }}>Dùng vị trí của tôi</button><form onSubmit={(e) => { e.preventDefault(); const value = new FormData(e.currentTarget).get('origin')?.toString().trim(); if (value) route(selected, value); }}><input name="origin" placeholder="Nhập điểm xuất phát" required aria-label="Điểm xuất phát" /><button type="submit">Chỉ đường</button></form></div> : <button className="primary" onClick={() => setNeedsOrigin(true)}>Chỉ đường</button>}
      </section>
    </div>}
  </>;
}

export default App;
