// Can this device draw the 3D globe (WebGL)? Asked with a throwaway canvas whose context is let go at once — a phone
// allows only a few WebGL contexts at a time, and one kept by a check is one fewer for the globe itself (when they ran
// out, the letter's flight fell back to the flat dotted globe). A "no" isn't kept: asked again next time.
let ok = false;
export function hasWebGL(): boolean {
  if (ok) return true;
  try {
    const c = document.createElement('canvas');
    const gl = (c.getContext('webgl2') || c.getContext('webgl')) as WebGLRenderingContext | null;
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    ok = true;
  } catch { return false; }
  return true;
}
