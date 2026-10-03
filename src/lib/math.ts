/** Small numeric helpers used by the interactive demos. */

export function softmax(xs: number[], temperature = 1): number[] {
  const t = Math.max(temperature, 1e-6)
  const scaled = xs.map((x) => x / t)
  const max = Math.max(...scaled)
  const exps = scaled.map((x) => (Number.isFinite(x) ? Math.exp(x - max) : 0))
  const sum = exps.reduce((a, b) => a + b, 0)
  return exps.map((e) => e / sum)
}

export function dot(a: number[], b: number[]): number {
  return a.reduce((s, x, i) => s + x * b[i], 0)
}

/** Row vector v multiplied by matrix m, where m is shaped [in][out]. */
export function vecMat(v: number[], m: number[][]): number[] {
  const out = new Array(m[0].length).fill(0)
  for (let i = 0; i < v.length; i++) for (let j = 0; j < out.length; j++) out[j] += v[i] * m[i][j]
  return out
}

/** Deterministic pseudo-random generator so "random" vectors look the same on every render. */
export function seeded(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return ((s >>> 0) % 100000) / 100000
  }
}

export function hashString(str: string): number {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

/** A fake but stable embedding vector for a token, values in [-1, 1]. */
export function fakeVector(token: string, dims: number): number[] {
  const rnd = seeded(hashString(token))
  return Array.from({ length: dims }, () => rnd() * 2 - 1)
}

export const fmt = (x: number, d = 2) => x.toFixed(d)

/** Base UI sliders report either a number or an array; we always use single-thumb sliders. */
export function sliderValue(v: number | readonly number[]): number {
  return typeof v === 'number' ? v : v[0]
}
