<template>
    <canvas ref="canvasEl" class="dot-canvas" />
</template>

<script setup lang="ts">
const props = defineProps<{
    color: string
}>()

const RADIUS = 10

const canvasEl = ref<HTMLCanvasElement>()

function draw() {
    const canvas = canvasEl.value
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = props.color
    ctx.beginPath()
    ctx.arc(canvas.width / 2, canvas.height / 2, RADIUS, 0, Math.PI * 2)
    ctx.fill()
}

onMounted(() => {
    draw()
    window.addEventListener('resize', draw)
})
onUnmounted(() => {
    window.removeEventListener('resize', draw)
})
watch(() => props.color, draw)
</script>

<style scoped>
.dot-canvas {
    display: block;
    width: 100vw;
    height: 100vh;
}
</style>
