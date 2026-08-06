export function clamp(value: number, min = 0, max = 1): number {
    return Math.min(max, Math.max(min, value))
}

export function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0')
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase()
}

export function hexToRgb(hex: string): [number, number, number] | null {
    const match = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!match) return null
    return [parseInt(match[1], 16), parseInt(match[2], 16), parseInt(match[3], 16)]
}

// Oklab conversion, per Björn Ottosson's published formulas
// (https://bottosson.github.io/posts/oklab/).

function srgbToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}
function linearToSrgb(c: number): number {
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055
}

export function oklchToLinearRgb(L: number, C: number, hDeg: number): [number, number, number] {
    const hRad = (hDeg * Math.PI) / 180
    const a = C * Math.cos(hRad)
    const b = C * Math.sin(hRad)

    const l_ = L + 0.3963377774 * a + 0.2158037573 * b
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b

    const l = l_ ** 3
    const m = m_ ** 3
    const s = s_ ** 3

    const rLin = 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s
    const gLin = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s
    const bLin = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s

    return [rLin, gLin, bLin]
}

export function isInSrgbGamut(rLin: number, gLin: number, bLin: number, eps = 1e-4): boolean {
    return rLin >= -eps && rLin <= 1 + eps && gLin >= -eps && gLin <= 1 + eps && bLin >= -eps && bLin <= 1 + eps
}

export function oklchToRgb(L: number, C: number, hDeg: number): [number, number, number] {
    const [rLin, gLin, bLin] = oklchToLinearRgb(L, C, hDeg)

    const r = Math.round(clamp(linearToSrgb(rLin)) * 255)
    const g = Math.round(clamp(linearToSrgb(gLin)) * 255)
    const bOut = Math.round(clamp(linearToSrgb(bLin)) * 255)

    return [r, g, bOut]
}

export const MAX_CHROMA = 0.4

/**
 * For each hue bucket, binary-search the largest chroma that's still inside
 * the sRGB gamut at this lightness. The resulting curve's shape IS the
 * gamut: the boundary of colors a screen can actually display at this L.
 */
export function computeSrgbMaxChromaCurve(L: number, buckets = 180, iterations = 14): Float64Array {
    const curve = new Float64Array(buckets)
    for (let i = 0; i < buckets; i++) {
        const hue = (i / buckets) * 360
        let lo = 0
        let hi = MAX_CHROMA
        for (let iter = 0; iter < iterations; iter++) {
            const mid = (lo + hi) / 2
            const [r, g, b] = oklchToLinearRgb(L, mid, hue)
            if (isInSrgbGamut(r, g, b)) lo = mid
            else hi = mid
        }
        curve[i] = lo
    }
    return curve
}

export function maxChromaAt(curve: Float64Array, hueDeg: number): number {
    const n = curve.length
    const pos = (((hueDeg % 360) + 360) % 360 / 360) * n
    const i0 = Math.floor(pos) % n
    const i1 = (i0 + 1) % n
    const t = pos - Math.floor(pos)
    return curve[i0] * (1 - t) + curve[i1] * t
}

export function rgbToOklch(r: number, g: number, b: number): { l: number; c: number; h: number } {
    const rLin = srgbToLinear(r / 255)
    const gLin = srgbToLinear(g / 255)
    const bLin = srgbToLinear(b / 255)

    const l = 0.4122214708 * rLin + 0.5363325363 * gLin + 0.0514459929 * bLin
    const m = 0.2119034982 * rLin + 0.6806995451 * gLin + 0.1073969566 * bLin
    const s = 0.0883024619 * rLin + 0.2817188376 * gLin + 0.6299787005 * bLin

    const l_ = Math.cbrt(l)
    const m_ = Math.cbrt(m)
    const s_ = Math.cbrt(s)

    const L = 0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_
    const a = 1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_
    const bOk = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_

    const c = Math.sqrt(a * a + bOk * bOk)
    let h = (Math.atan2(bOk, a) * 180) / Math.PI
    if (h < 0) h += 360

    return { l: L, c, h }
}
