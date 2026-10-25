// The close-up map under the globe: a real map (MapLibre GL, OpenStreetMap tiles from OpenFreeMap — free, no key) that
// you drag and pinch / wheel to zoom, from countries down to streets: country names far out, cities and regions, then
// districts, roads, rivers and parks, and close in the streets (a few main places' names only — the cats come first).
// Its colours are the app's: warm paper land, the globe's powder-blue water, soft sage parks.
// On it, the cats: each pal at the place they've given (their country, for now — the app keeps no city yet), your cat
// at yours. A way picked: both ends in view (clear of the card below), joined by a red dotted line — when they're in
// different places; the same place is never split into two made-up ones. Cats too close together on screen are one
// bubble (one cat's photo) with how many; zoom in and places apart split up, and one place's cats are listed by the
// caller on a tap (onCluster) — never spread out beside it. Nothing moves the map back while you're moving it. Zoom far
// out and it hands back to the globe.
import { useEffect, useRef, useState } from 'react';
import maplibregl, { type Map as MLMap } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

export type MapCat = { key: string; lon: number; lat: number; photo: string; name: string; place?: string; mine?: boolean; ring?: string; active?: boolean; onTap?: () => void };
type LngLat = { lon: number; lat: number };

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
/** the globe at its closest is about this zoom on a flat map: the close-up starts here, so it carries on from it */
export const GLOBE_ZOOM = 2.7;
/** zoomed out past this, it's the globe again */
const BACK_TO_GLOBE = 1.9;
const PAINT: [string, string, any][] = [
  ['background', 'background-color', '#F6F1E7'],
  ['water', 'fill-color', '#CFE3EE'],
  ['waterway', 'line-color', '#BFD8E6'],
  ['park', 'fill-color', '#DFEAD0'],
  ['landcover_wood', 'fill-color', '#E3ECD6'],
  ['landuse_residential', 'fill-color', '#F1EBDF'],
  ['building', 'fill-color', '#EAE2D3'],
  ['boundary_2', 'line-color', '#C9B9A2'],
  ['boundary_3', 'line-color', '#D9CDBB'],
];
const same = (a: LngLat, b: LngLat) => Math.abs(a.lon - b.lon) < 1e-4 && Math.abs(a.lat - b.lat) < 1e-4;

export default function DetailMap({ cats, route, start, lang = 'en', bottom = 280, onBack, onCluster }: {
  cats: MapCat[];
  /** a way picked: its two ends */
  route?: { a: LngLat; b: LngLat } | null;
  /** where to open when there's no way picked (the globe's middle as you zoomed past it) */
  start?: LngLat | null;
  lang?: string;
  /** room kept free at the bottom (the card, the nav) when fitting the way in */
  bottom?: number;
  /** zoomed out far enough: back to the globe */
  onBack?: () => void;
  /** a bubble of several cats tapped: their keys (the caller lists them) */
  onCluster?: (keys: string[]) => void;
}) {
  const box = useRef<HTMLDivElement>(null), map = useRef<MLMap | null>(null);
  const [pts, setPts] = useState<{ x: number; y: number }[]>([]);
  const back = useRef(onBack); back.current = onBack;
  const catsRef = useRef(cats); catsRef.current = cats;

  useEffect(() => {
    const el = box.current!;
    const mid = route ? { lon: (route.a.lon + route.b.lon) / 2, lat: (route.a.lat + route.b.lat) / 2 } : start || { lon: 127, lat: 37 };
    const m = new maplibregl.Map({ container: el, style: STYLE, center: [mid.lon, mid.lat], zoom: GLOBE_ZOOM, attributionControl: false, dragRotate: false, pitchWithRotate: false, touchPitch: false, renderWorldCopies: true });
    m.touchZoomRotate.disableRotation();
    // the map's credit (required by OpenStreetMap / OpenFreeMap): small, top right, under the language button — clear of the nav and the card
    m.addControl(new maplibregl.AttributionControl({ compact: true }), 'top-right');
    map.current = m;
    const place = () => setPts(catsRef.current.map((c) => { const p = m.project([c.lon, c.lat]); return { x: p.x, y: p.y }; }));
    let raf = 0; const onMove = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(place); };
    m.on('move', onMove);
    m.on('load', () => {
      // the app's colours; names in the app's language (else the local name); only a few main places' names, close in
      for (const [id, prop, val] of PAINT) if (m.getLayer(id)) m.setPaintProperty(id, prop as any, val);
      const name = ['coalesce', ['get', 'name:' + lang], ['get', 'name:latin'], ['get', 'name']];
      for (const l of m.getStyle().layers || []) {
        if (l.type === 'symbol' && /^(label_|water_name|waterway_line_label)/.test(l.id)) m.setLayoutProperty(l.id, 'text-field', name as any);
        if (l.type === 'symbol' && /^label_/.test(l.id)) m.setPaintProperty(l.id, 'text-color', '#5E6A80');
      }
      m.addLayer({ id: 'cp-poi', type: 'symbol', source: 'openmaptiles', 'source-layer': 'poi', minzoom: 15, filter: ['<=', ['get', 'rank'], 4],
        layout: { 'text-field': name as any, 'text-size': 11, 'text-font': ['Noto Sans Regular'], 'text-max-width': 8 }, paint: { 'text-color': '#8E8A84', 'text-halo-color': '#F6F1E7', 'text-halo-width': 1.2 } });
      // the way: a red dotted line between two different places
      if (route && !same(route.a, route.b)) {
        m.addSource('cp-way', { type: 'geojson', data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [[route.a.lon, route.a.lat], [route.b.lon, route.b.lat]] } } });
        m.addLayer({ id: 'cp-way', type: 'line', source: 'cp-way', layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#E5483D', 'line-width': 3, 'line-dasharray': [0.1, 2.2] } });
      }
      place();
      // in: on from the globe's zoom — to the way (both ends clear of the card), else a little closer
      const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches, duration = still ? 0 : 1200;
      const pad = { top: 110, bottom: bottom + 30, left: 56, right: 56 };
      if (route && !same(route.a, route.b)) m.fitBounds([[Math.min(route.a.lon, route.b.lon), Math.min(route.a.lat, route.b.lat)], [Math.max(route.a.lon, route.b.lon), Math.max(route.a.lat, route.b.lat)]], { padding: pad, maxZoom: 12, duration });
      else if (route) m.easeTo({ center: [route.a.lon, route.a.lat], zoom: 5.4, padding: pad, duration });
      else m.easeTo({ zoom: 4.2, duration });
    });
    // zoomed far out by hand: back to the globe (never on its own)
    m.on('zoomend', (e: any) => { if (e.originalEvent && m.getZoom() < BACK_TO_GLOBE) back.current?.(); });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => { m.resize(); place(); }) : null; ro && ro.observe(el);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); m.remove(); map.current = null; };
  }, []);
  useEffect(() => { const m = map.current; if (m) setPts(cats.map((c) => { const p = m.project([c.lon, c.lat]); return { x: p.x, y: p.y }; })); }, [cats]);

  // cats close together on screen: one bubble (its first cat's photo, how many); open, they stand side by side there
  const groups: { key: string; x: number; y: number; members: number[] }[] = [];
  pts.forEach((p, i) => {
    const g = groups.find((q) => Math.hypot(q.x - p.x, q.y - p.y) < 46);
    if (g) g.members.push(i); else groups.push({ key: cats[i]?.key || String(i), x: p.x, y: p.y, members: [i] });
  });
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <div ref={box} style={{ position: 'absolute', inset: 0 }} />
      {groups.map((g) => {
        // one cat: its photo, name and place; several (the same place, or close at this zoom): one photo and how many
        if (g.members.length > 1) {
          const c = cats[g.members.find((i) => cats[i].photo) ?? g.members[0]];   // a photo to show, if any of them has one
          return (
            <div key={'g-' + g.key} onClick={() => onCluster?.(g.members.map((i) => cats[i].key))} role={onCluster ? 'button' : undefined} aria-label={g.members.map((i) => cats[i].name).join(', ')}
              style={{ position: 'absolute', left: g.x - 27, top: g.y - 64, width: 54, cursor: onCluster ? 'pointer' : 'default', zIndex: 3 }}>
              <Face c={{ ...c, active: g.members.some((i) => cats[i].active) }} />
              <span style={{ position: 'absolute', right: -6, top: -6, minWidth: 20, height: 20, padding: '0 5px', boxSizing: 'border-box', borderRadius: 10, background: '#22304A', color: '#fff', border: '2px solid #fff', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 10.5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{g.members.length}</span>
            </div>
          );
        }
        const c = cats[g.members[0]];
        return (
          <div key={c.key} onClick={c.onTap} role={c.onTap ? 'button' : undefined} aria-label={c.name}
            style={{ position: 'absolute', left: g.x - 30, top: g.y - 66, width: 60, display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: c.onTap ? 'pointer' : 'default', zIndex: 3 }}>
            <Face c={c} />
            <span style={{ marginTop: 3, padding: '1px 7px', borderRadius: 8, background: 'rgba(255,255,255,.95)', boxShadow: '0 1px 3px rgba(0,0,0,.12)', fontFamily: 'var(--font-body)', fontWeight: 700, fontSize: 10.5, color: '#22304A', whiteSpace: 'nowrap' }}>{c.name}</span>
            {c.place ? <span style={{ marginTop: 1, padding: '0 6px', borderRadius: 6, background: 'rgba(255,255,255,.85)', fontFamily: 'var(--font-body)', fontWeight: 500, fontSize: 9.5, color: '#5E6A80', whiteSpace: 'nowrap' }}>{c.place}</span> : null}
          </div>
        );
      })}
    </div>
  );
}

function Face({ c }: { c: MapCat }) {
  return (
    <div style={{ position: 'relative', width: 54, height: 54, margin: '0 auto' }}>
      <div style={{ width: 54, height: 54, borderRadius: '50%', overflow: 'hidden', border: '3px solid ' + (c.ring || (c.mine ? '#FF4B3E' : '#fff')), boxSizing: 'border-box', boxShadow: '0 6px 14px rgba(40,30,20,.25)', background: '#EFE7DB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {c.photo ? <img src={c.photo} alt="" draggable={false} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} /> : <span style={{ fontSize: 22 }}>🐱</span>}
      </div>
      {c.active ? <span aria-label="active" className="cp-active-dot" style={{ position: 'absolute', right: 1, top: 1, width: 12, height: 12, borderRadius: 6, background: '#FF4B3E', border: '2px solid #fff', boxSizing: 'border-box' }} /> : null}
    </div>
  );
}
