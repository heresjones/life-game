<template>
    <canvas ref="canvasEl" class="dot-canvas" @pointerdown="onPointerDown" />
</template>

<script setup lang="ts">
import { clamp } from '~/helpers/color'
import type { RenderDot } from '~/helpers/dot'

const props = defineProps<{
    dots: RenderDot[]
    highlighted: string[]
}>()
const emit = defineEmits<{
    'canvas-click': [{ id: string | null; xFrac: number; yFrac: number }]
    'drag-start': [string]
    'drag-move': [{ id: string; xFrac: number; yFrac: number }]
    'drag-end': [{ id: string; vx: number; vy: number }]
}>()

const OUTLINE_GAP = 4
const OUTLINE_WIDTH = 2
const HIT_PADDING = 6
const VELOCITY_WINDOW_MS = 100

const canvasEl = ref<HTMLCanvasElement>()
let draggingId: string | null = null
let dragHistory: { t: number; x: number; y: number }[] = []

function draw() {
    const canvas = canvasEl.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    const highlightedIds = new Set(props.highlighted)

    for (const dot of props.dots) {
        const cx = dot.xFrac * canvas.width
        const cy = dot.yFrac * canvas.height

        ctx.fillStyle = dot.color
        ctx.beginPath()
        ctx.arc(cx, cy, dot.radius, 0, Math.PI * 2)
        ctx.fill()

        if (highlightedIds.has(dot.id)) {
            ctx.strokeStyle = '#ffffff'
            ctx.lineWidth = OUTLINE_WIDTH
            ctx.beginPath()
            ctx.arc(cx, cy, dot.radius + OUTLINE_GAP, 0, Math.PI * 2)
            ctx.stroke()
        }
    }
}

function hitTest(canvas: HTMLCanvasElement, x: number, y: number): string | null {
    let closestId: string | null = null
    let closestDist = Infinity
    for (const dot of props.dots) {
        const cx = dot.xFrac * canvas.width
        const cy = dot.yFrac * canvas.height
        const dist = Math.hypot(x - cx, y - cy)
        const hitRadius = dot.radius + OUTLINE_GAP + HIT_PADDING
        if (dist <= hitRadius && dist < closestDist) {
            closestId = dot.id
            closestDist = dist
        }
    }
    return closestId
}

function onPointerDown(e: PointerEvent) {
    const canvas = canvasEl.value
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const hitId = hitTest(canvas, x, y)

    emit('canvas-click', { id: hitId, xFrac: clamp(x / rect.width), yFrac: clamp(y / rect.height) })
    if (!hitId) return

    draggingId = hitId
    dragHistory = [{ t: e.timeStamp, x, y }]
    emit('drag-start', hitId)

    canvas.setPointerCapture(e.pointerId)
    canvas.addEventListener('pointermove', onPointerMove)
    canvas.addEventListener('pointerup', onPointerUp, { once: true })
    canvas.addEventListener('pointercancel', onPointerUp, { once: true })
}

function onPointerMove(e: PointerEvent) {
    const canvas = canvasEl.value
    if (!canvas || !draggingId) return
    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    const now = e.timeStamp
    dragHistory.push({ t: now, x, y })
    dragHistory = dragHistory.filter((s) => now - s.t <= VELOCITY_WINDOW_MS)

    emit('drag-move', {
        id: draggingId,
        xFrac: clamp(x / rect.width),
        yFrac: clamp(y / rect.height),
    })
}

function onPointerUp() {
    canvasEl.value?.removeEventListener('pointermove', onPointerMove)

    if (draggingId) {
        // Release velocity from how far/fast the pointer moved over the last
        // ~100ms — smoother than a single instantaneous sample.
        let vx = 0
        let vy = 0
        if (dragHistory.length >= 2) {
            const first = dragHistory[0]
            const last = dragHistory[dragHistory.length - 1]
            const dt = (last.t - first.t) / 1000
            if (dt > 0.01) {
                vx = (last.x - first.x) / dt
                vy = (last.y - first.y) / dt
            }
        }
        emit('drag-end', { id: draggingId, vx, vy })
    }

    draggingId = null
    dragHistory = []
}

onMounted(() => {
    draw()
    window.addEventListener('resize', draw)
})
onUnmounted(() => {
    window.removeEventListener('resize', draw)
})
watch(() => props.dots, draw, { deep: true })
watch(() => props.highlighted, draw)
</script>

<style scoped>
.dot-canvas {
    display: block;
    width: 100vw;
    height: 100vh;
    touch-action: none;
}
</style>
