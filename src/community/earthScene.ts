// The app's earth, built once for any globe that shows it (the Map's GlobeMap3D, the landing story's PastelGlobe):
// a softly lit sphere wearing textures made from the real land (globeTextures: a powder-blue sea, paler shallows,
// creamy shores, sage-green land, a pencil grain, a little relief), real clouds (cut from a photo) and a faint haze
// drifting over it, a bright edge and a soft halo. The caller owns the renderer, the camera and the turning.
import * as THREE from 'three';
import { cloudVeil, globeMaps } from './globeTextures';

export const rad = Math.PI / 180;
/** the clouds (cut from a photo, edges faded): image, its width on the globe (radius units), height/width */
export const CLOUDS = [{ src: './assets/map/cloud-1.webp', w: 0.34, ratio: 447 / 451 }, { src: './assets/map/cloud-2.webp', w: 0.16, ratio: 88 / 154 }, { src: './assets/map/cloud-3.webp', w: 0.08, ratio: 82 / 66 }];
/** a seeded random (the clouds in the same places every time) */
export const rnd = (seed: number) => () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
/** a place on the unit sphere, matching three's sphere UVs with an equirectangular texture (lon −180 at u = 0) */
export const vec = (lon: number, lat: number, r = 1) => new THREE.Vector3(r * Math.cos(lat * rad) * Math.cos(lon * rad), r * Math.sin(lat * rad), -r * Math.cos(lat * rad) * Math.sin(lon * rad));
/** where the world turns to show (d3's rotate as in the 2D map: rot = [-lon, -lat] of the middle) */
export const aim = (g: THREE.Object3D, rot: [number, number]) => { g.rotation.set(-rot[1] * rad, -(90 - rot[0]) * rad, 0); };
const FRESNEL_VS = `varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const HALO_FS = `varying vec3 vN; varying vec3 vV; void main(){ float i = pow(clamp(0.62 + dot(vN, vV), 0.0, 1.0), 3.0); gl_FragColor = vec4(0.94, 0.97, 1.0, 1.0) * i * 0.7; }`;
const RIM_FS = `varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - clamp(dot(vN, vV), 0.0, 1.0), 2.6); gl_FragColor = vec4(0.93, 0.98, 1.0, f * 0.75); }`;

/** Adds the earth to `scene` (lights, the halo; the earth group with its ground, clouds, haze and edge). `keep`
 *  collects what to dispose. Returns the earth group (turn it with `aim`) and the drifting layers (turn each by its
 *  speed × ms). */
export function buildEarth(renderer: THREE.WebGLRenderer, scene: THREE.Scene, land: any, keep: <T extends { dispose: () => void }>(x: T) => T) {
  // light: soft and even (matte, like paper) — mostly sky, a gentle warm sun up to the left, a little fill
  scene.add(new THREE.HemisphereLight(0xf6faff, 0xb3c9dc, 2.1), new THREE.AmbientLight(0xffffff, 0.45));
  const sun = new THREE.DirectionalLight(0xfff4e2, 1.15); sun.position.set(-2.6, 2.4, 4); scene.add(sun);
  const fill = new THREE.DirectionalLight(0xdcecff, 0.35); fill.position.set(3, -1.5, 2); scene.add(fill);

  // the earth
  const maps = globeMaps(land);
  const tex = (c: HTMLCanvasElement, srgb: boolean) => { const t = keep(new THREE.CanvasTexture(c)); t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  const earth = new THREE.Group(); scene.add(earth);
  const ground = new THREE.Mesh(keep(new THREE.SphereGeometry(1, 192, 96)), keep(new THREE.MeshStandardMaterial({
    map: tex(maps.color, true), roughnessMap: tex(maps.rough, false), bumpMap: tex(maps.height, false), bumpScale: 1.4,
    displacementMap: tex(maps.height, false), displacementScale: 0.01, roughness: 1, metalness: 0,
  })));
  earth.add(ground);

  // clouds: real ones (cut from a photo of a cloudy sky, their edges faded), laid flat over the earth a little up,
  // each turned, flipped and sized its own way; behind them a faint haze; the two drifting at their own pace
  const cloudTex = CLOUDS.map((c) => { const t = keep(new THREE.TextureLoader().load(c.src)); t.colorSpace = THREE.SRGBColorSpace; return t; });
  const cloudMats = cloudTex.map((t) => keep(new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.94 })));
  const cloudGeo = keep(new THREE.PlaneGeometry(1, 1));
  const cloudLayer = new THREE.Group(); cloudLayer.renderOrder = 3; earth.add(cloudLayer);
  const R3 = rnd(37), z = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < 40; i++) {
    const k = i % CLOUDS.length === 0 ? 0 : R3() < 0.55 ? 0 : 1 + Math.floor(R3() * 2), c = CLOUDS[k];     // mostly the big one, some small
    const lon = R3() * 360 - 180, lat = Math.asin(R3() * 1.7 - 0.85) / rad, w = c.w * (0.75 + R3() * 0.6), r = 1.03 + R3() * 0.02;
    const m = new THREE.Mesh(cloudGeo, cloudMats[k]); m.renderOrder = 3;
    const n = vec(lon, lat).normalize();
    m.position.copy(n).multiplyScalar(r);
    m.quaternion.setFromUnitVectors(z, n).multiply(new THREE.Quaternion().setFromAxisAngle(z, R3() * Math.PI * 2));
    m.scale.set(w * (R3() < 0.5 ? -1 : 1), w * c.ratio, 1);
    cloudLayer.add(m);
  }
  const hazeTex = keep(new THREE.CanvasTexture(cloudVeil(29, 22, 12))); hazeTex.colorSpace = THREE.SRGBColorSpace;
  const haze = new THREE.Mesh(keep(new THREE.SphereGeometry(1.022, 96, 48)), keep(new THREE.MeshStandardMaterial({ map: hazeTex, transparent: true, opacity: 0.4, depthWrite: false, roughness: 1, emissive: 0xf2f6fb, emissiveIntensity: 0.35 })));
  haze.renderOrder = 2; earth.add(haze);
  const veils = [{ m: cloudLayer as THREE.Object3D, speed: 0.000012 }, { m: haze as THREE.Object3D, speed: -0.000008 }];

  // the air around it: a soft halo behind, a bright edge in front
  scene.add(new THREE.Mesh(keep(new THREE.SphereGeometry(1.13, 64, 32)), keep(new THREE.ShaderMaterial({ vertexShader: FRESNEL_VS, fragmentShader: HALO_FS, side: THREE.BackSide, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }))));
  earth.add(new THREE.Mesh(keep(new THREE.SphereGeometry(1.016, 96, 48)), keep(new THREE.ShaderMaterial({ vertexShader: FRESNEL_VS, fragmentShader: RIM_FS, transparent: true, depthWrite: false }))));
  return { earth, veils };
}
