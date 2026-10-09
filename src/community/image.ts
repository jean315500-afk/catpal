// Shrinks a picked/captured photo before upload: max 1280px on the long side, JPEG.
export async function toUploadJpeg(src: Blob, maxSide = 1280, quality = 0.85): Promise<Blob> {
  const url = URL.createObjectURL(src);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error('This photo could not be read. Try another one.'));
      i.src = url;
    });
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.naturalWidth * k));
    c.height = Math.max(1, Math.round(img.naturalHeight * k));
    c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
    const out = await new Promise<Blob | null>((resolve) => c.toBlob(resolve, 'image/jpeg', quality));
    if (!out) throw new Error('This photo could not be prepared. Try another one.');
    return out;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** data: URL -> Blob (camera snapshots). */
export function dataUrlToBlob(url: string): Blob {
  const [head, b64] = url.split(',');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: head.slice(5).split(';')[0] });
}
