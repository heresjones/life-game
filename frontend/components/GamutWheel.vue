<template>
    <div ref="wrapEl" class="gamut-wheel" @pointerdown="onPointerDown">
        <canvas ref="canvasEl" class="gamut-canvas" />
        <div class="gamut-ring" aria-hidden="true" />
        <div class="gamut-marker" :style="markerStyle" aria-hidden="true" />
        <div class="hue-labels" aria-hidden="true">
            <span class="hl hl-0">0&deg;</span>
            <span class="hl hl-90">90&deg;</span>
            <span class="hl hl-180">180&deg;</span>
            <span class="hl hl-270">270&deg;</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { clamp, oklchToRgb, computeSrgbMaxChromaCurve, maxChromaAt, MAX_CHROMA } from '~/helpers/color'

const props = defineProps<{
    lightness: number
    chroma: number
    hue: number
}>()
const emit = defineEmits<{
    change: [{ c: number; h: number }]
}>()

const SIZE = 200

const wrapEl = ref<HTMLElement>()
const canvasEl = ref<HTMLCanvasElement>()
const curve = ref<Float64Array>(new Float64Array(0))

function redraw() {
    const canvas = canvasEl.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const px = Math.round(SIZE * dpr)
    canvas.width = px
    canvas.height = px
    canvas.style.width = `${SIZE}px`
    canvas.style.height = `${SIZE}px`

    const image = ctx.createImageData(px, px)
    const data = image.data
    const radius = px / 2
    const L = props.lightness

    for (let y = 0; y < px; y++) {
        const dy = y - radius + 0.5
        for (let x = 0; x < px; x++) {
            const dx = x - radius + 0.5
            const r = Math.hypot(dx, dy) / radius
            const i = (y * px + x) * 4

            if (r > 1) continue // leave fully transparent outside the disc

            let hueDeg = (Math.atan2(-dy, dx) * 180) / Math.PI
            if (hueDeg < 0) hueDeg += 360
            const c = r * MAX_CHROMA

            if (c > maxChromaAt(curve.value, hueDeg)) continue // outside this L's sRGB gamut

            const [red, green, blue] = oklchToRgb(L, c, hueDeg)
            data[i] = red
            data[i + 1] = green
            data[i + 2] = blue
            data[i + 3] = 255
        }
    }

    ctx.putImageData(image, 0, 0)
}

function recompute() {
    curve.value = computeSrgbMaxChromaCurve(props.lightness)
    redraw()
}

onMounted(recompute)
watch(() => props.lightness, recompute)

const markerStyle = computed(() => {
    const rFrac = Math.min(props.chroma / MAX_CHROMA, 1)
    const rad = (props.hue * Math.PI) / 180
    const radiusPx = SIZE / 2
    const dx = rFrac * radiusPx * Math.cos(rad)
    const dy = -rFrac * radiusPx * Math.sin(rad)
    return { left: `${SIZE / 2 + dx}px`, top: `${SIZE / 2 + dy}px` }
})

function onPointerDown(e: PointerEvent) {
    const el = wrapEl.value!
    el.setPointerCapture(e.pointerId)
    updateFromPointer(e)
    const move = (ev: PointerEvent) => updateFromPointer(ev)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', move), { once: true })
}

function updateFromPointer(e: PointerEvent) {
    const rect = wrapEl.value!.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    const radius = rect.width / 2

    let hueDeg = (Math.atan2(-dy, dx) * 180) / Math.PI
    if (hueDeg < 0) hueDeg += 360

    const rFrac = clamp(Math.hypot(dx, dy) / radius, 0, 1)
    const boundary = maxChromaAt(curve.value, hueDeg)
    const c = Math.min(rFrac * MAX_CHROMA, boundary)

    emit('change', { c, h: hueDeg })
}
</script>

<style scoped>
.gamut-wheel {
    position: relative;
    width: 200px;
    height: 200px;
    margin: 8px auto 22px;
    cursor: crosshair;
    touch-action: none;
}

.gamut-canvas {
    position: absolute;
    inset: 0;
    border-radius: 50%;
}

.gamut-ring {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    border: 1px dashed rgba(255, 255, 255, 0.25);
    pointer-events: none;
}

.gamut-marker {
    position: absolute;
    width: 16px;
    height: 16px;
    margin: -8px 0 0 -8px;
    border-radius: 50%;
    border: 2px solid #fff;
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.35),
        0 1px 3px rgba(0, 0, 0, 0.5);
    pointer-events: none;
}

.hue-labels {
    position: absolute;
    inset: 0;
    pointer-events: none;
}

.hl {
    position: absolute;
    font-size: calc(11px * var(--ui-font-scale, 1));
    color: rgba(255, 255, 255, 0.4);
}
.hl-0 {
    top: 50%;
    right: -20px;
    transform: translateY(-50%);
}
.hl-90 {
    top: -18px;
    left: 50%;
    transform: translateX(-50%);
}
.hl-180 {
    top: 50%;
    left: -26px;
    transform: translateY(-50%);
}
.hl-270 {
    bottom: -18px;
    left: 50%;
    transform: translateX(-50%);
}
</style>
