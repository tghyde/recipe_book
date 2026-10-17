import { PAGES_BASE, RAW_BASE } from './config'
import { thumbPath } from './util'

const FULL_MAX = 1600
const THUMB_MAX = 480

function loadImage(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as an image.'))
    }
    img.src = url
  })
}

function scaleTo(img: HTMLImageElement, max: number, quality: number): Promise<Blob> {
  const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * ratio)
  const h = Math.round(img.naturalHeight * ratio)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')
  ctx.drawImage(img, 0, 0, w, h)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('Could not encode image'))), 'image/jpeg', quality),
  )
}

/** Shrinks a phone photo to a display size and a thumbnail, both JPEG. */
export async function preparePhoto(file: Blob): Promise<{ full: Blob; thumb: Blob }> {
  const img = await loadImage(file)
  const [full, thumb] = await Promise.all([scaleTo(img, FULL_MAX, 0.82), scaleTo(img, THUMB_MAX, 0.8)])
  return { full, thumb }
}

/** Photos uploaded during this session, so they show instantly before the site rebuilds. */
const localPhotos = new Map<string, string>()

export function rememberLocalPhoto(path: string, blob: Blob) {
  localPhotos.set(path, URL.createObjectURL(blob))
}

export function photoSources(path: string, thumb = false): string[] {
  const p = thumb ? thumbPath(path) : path
  const local = localPhotos.get(p)
  const sources: string[] = []
  if (local) sources.push(local)
  sources.push(PAGES_BASE + p, RAW_BASE + p)
  return sources
}
