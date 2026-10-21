// The hand-drawn globe: the coloured-pencil earth (earth-pencil.webp — the twelve drawn globes of
// "회전하는 지구 스케치 프레임.png", each matched to its view and re-projected into one world map) wrapped
// on a sphere with WebGL, so it turns smoothly to any angle; a second canvas on top draws the markers and
// a sketchy dark rim. It uses cobe's projection (cobeProjectXYZ), so the page's labels, pulses and trail
// sit on it exactly; `control` holds the turn (phi / theta) and the markers, read every frame.
import { useEffect, useRef, type MutableRefObject } from 'react';
import { cobeProjectXYZ, toXYZ } from '@/components/ui/globe';
import { ASSETS } from './config';

type Vec = [number, number, number];
type Marker = { location: [number, number]; size: number; color?: [number, number, number] };
export type PencilControl = { phi: number; theta: number; markers?: Marker[] };

/** the sphere's radius in the canvas box (cobe's) */
const R = 0.8;
const RIM = '#2A2622', PEACH = '#F2906C';

const VERT = `attribute vec2 p; varying vec2 v; void main() { v = p; gl_Position = vec4(p, 0.0, 1.0); }`;
// each pixel of the disc → the point of the sphere behind it (the inverse of cobe's turn) → the world map
const FRAG = `precision highp float;
uniform sampler2D tex; uniform float phi, theta; varying vec2 v;
const float PI = 3.14159265;
void main() {
  vec2 q = v / ${R.toFixed(2)};
  float r2 = dot(q, q);
  if (r2 > 1.0) discard;
  float d = sqrt(1.0 - r2), cp = cos(phi), sp = sin(phi), ct = cos(theta), st = sin(theta);
  vec3 t = q.x * vec3(cp, 0.0, sp) + q.y * vec3(sp * st, ct, -cp * st) + d * vec3(-sp * ct, st, cp * ct);
  float lat = asin(clamp(t.y, -1.0, 1.0));
  float lon = mod(atan(t.z, -t.x) + 2.0 * PI, 2.0 * PI) - PI;
  vec3 c = texture2D(tex, vec2((lon + PI) / (2.0 * PI), (0.5 * PI - lat) / PI)).rgb;
  // brighter, airier colours (lifted midtones, a touch of white), and only a light shade toward the rim
  c = mix(pow(c, vec3(0.78)), vec3(1.0), 0.1);
  c *= mix(1.0, 0.93, smoothstep(0.6, 1.0, sqrt(r2)));
  gl_FragColor = vec4(c, 1.0);
}`;

const markerXYZ = new WeakMap<Marker, Vec>();
const rgb = (c: [number, number, number]) => `rgb(${c.map((v) => Math.round(v * 255)).join(',')})`;

export default function PencilGlobe({ control, onFrame }: { control: MutableRefObject<PencilControl>; onFrame?: (size: number) => void }) {
  const glCanvas = useRef<HTMLCanvasElement>(null), overlay = useRef<HTMLCanvasElement>(null);
  const frame = useRef(onFrame); frame.current = onFrame;
  useEffect(() => {
    const ge = glCanvas.current!, oe = overlay.current!, ctx = oe.getContext('2d')!;
    const gl = ge.getContext('webgl', { premultipliedAlpha: true, antialias: true })!;
    // the sphere shader over a full-canvas quad
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uPhi = gl.getUniformLocation(prog, 'phi'), uTheta = gl.getUniformLocation(prog, 'theta');
    let ready = false, size = 0, dpr = 1, raf = 0, last = '';
    const img = new Image();
    img.onload = () => {
      const tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      gl.generateMipmap(gl.TEXTURE_2D);   // the map is 1024 × 512 (powers of two)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      ready = true; last = '';
    };
    img.src = ASSETS.earth;
    const resize = () => {
      size = ge.parentElement!.offsetWidth; dpr = Math.min(2, window.devicePixelRatio || 1);
      for (const c of [ge, oe]) { c.width = Math.round(size * dpr); c.height = Math.round(size * dpr); }
      gl.viewport(0, 0, ge.width, ge.height); last = '';
    };
    const draw = () => {
      const { phi, theta, markers } = control.current;
      const key = `${phi.toFixed(5)}|${theta.toFixed(5)}|${markers?.length ?? 0}|${size}|${ready}`;
      if (key !== last && ready) {
        last = key;
        gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
        gl.uniform1f(uPhi, phi); gl.uniform1f(uTheta, theta); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        // overlay: markers, then the rim
        const S = size, c = S / 2, r = R * c, P = (v: Vec) => cobeProjectXYZ(v, phi, theta);
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, S, S);
        for (const m of markers ?? []) {
          let v = markerXYZ.get(m);
          if (!v) { v = toXYZ(m.location[0], m.location[1]).map((x) => x * (R + 0.01)) as Vec; markerXYZ.set(m, v); }
          const p = P(v); if (p.depth <= 0.02) continue;
          const mr = Math.max(1.6, m.size * r * 0.5);
          ctx.beginPath(); ctx.arc(p.x * S, p.y * S, mr, 0, Math.PI * 2);
          ctx.fillStyle = m.color ? rgb(m.color) : PEACH; ctx.fill();
          if (mr > 6) { ctx.lineWidth = 2; ctx.strokeStyle = '#fff'; ctx.stroke(); }
          else if (m.color && m.color.every((c) => c < 0.2)) { ctx.lineWidth = 1.4; ctx.strokeStyle = 'rgba(255, 255, 255, .85)'; ctx.stroke(); }   // black dots get a light edge
        }
        // a sketchy rim, like the drawings: two wobbly passes of a dark pencil
        ctx.strokeStyle = RIM; ctx.lineWidth = 2.2 * (S / 600); ctx.globalAlpha = 0.9;
        for (const k of [0, 1]) {
          ctx.beginPath();
          for (let i = 0; i <= 160; i++) {
            const a = (i / 160) * Math.PI * 2 + k * 0.4, w = r + Math.sin(a * 7 + k) * 0.8 + Math.sin(a * 3 + k * 2) * 0.6 + k * 0.5;
            const x = c + Math.cos(a) * w, y = c + Math.sin(a) * w;
            if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
          }
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      }
      frame.current?.(size);
      raf = requestAnimationFrame(draw);
    };
    resize(); addEventListener('resize', resize);
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', resize); gl.getExtension('WEBGL_lose_context')?.loseContext(); };
  }, [control]);
  const fill = { position: 'absolute', inset: 0, width: '100%', height: '100%' } as const;
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas ref={glCanvas} style={fill} />
      <canvas ref={overlay} style={fill} />
    </div>
  );
}
