<template>
    <div class="color-picker">
        <div class="picker-row">
            <div ref="wheelEl" class="wheel" @pointerdown="onWheelDown">
                <div class="wheel-thumb" :style="wheelThumbStyle" />
            </div>

            <div
                ref="brightnessEl"
                class="brightness-track"
                :style="{ background: `linear-gradient(to bottom, ${fullBrightnessHex}, #000)` }"
                @pointerdown="onBrightnessDown"
            >
                <div class="brightness-thumb" :style="brightnessThumbStyle" />
            </div>
        </div>

        <div class="picker-footer">
            <div class="swatch-preview" :style="{ backgroundColor: hex }" />
            <input
                class="hex-input"
                type="text"
                :value="hex"
                maxlength="7"
                @change="onHexInput"
                @keydown.enter="onHexInput"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
import { clamp, hsvToRgb, rgbToHsv, rgbToHex, hexToRgb } from '~/helpers/color'

const props = defineProps<{
    modelValue: string
}>()
const emit = defineEmits<{
    'update:modelValue': [hex: string]
}>()

const WHEEL_SIZE = 150
const WHEEL_RADIUS = WHEEL_SIZE / 2
const TRACK_HEIGHT = WHEEL_SIZE

const hue = ref(0)
const saturation = ref(0)
const value = ref(0.5)

const wheelEl = ref<HTMLElement>()
const brightnessEl = ref<HTMLElement>()

function syncFromHex(hexValue: string) {
    const rgb = hexToRgb(hexValue)
    if (!rgb) return
    const hsv = rgbToHsv(...rgb)
    hue.value = hsv.h
    saturation.value = hsv.s
    value.value = hsv.v
}
syncFromHex(props.modelValue)

const hex = computed(() => {
    const [r, g, b] = hsvToRgb(hue.value, saturation.value, value.value)
    return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255))
})
const fullBrightnessHex = computed(() => {
    const [r, g, b] = hsvToRgb(hue.value, saturation.value, 1)
    return rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255))
})

const wheelThumbStyle = computed(() => {
    const r = saturation.value * WHEEL_RADIUS
    const rad = (hue.value * Math.PI) / 180
    const dx = r * Math.sin(rad)
    const dy = -r * Math.cos(rad)
    return { left: `${WHEEL_RADIUS + dx}px`, top: `${WHEEL_RADIUS + dy}px` }
})
const brightnessThumbStyle = computed(() => ({
    top: `${(1 - value.value) * TRACK_HEIGHT}px`,
}))

function emitHex() {
    emit('update:modelValue', hex.value)
}

function onWheelDown(e: PointerEvent) {
    const el = wheelEl.value!
    el.setPointerCapture(e.pointerId)
    updateWheel(e)
    const move = (ev: PointerEvent) => updateWheel(ev)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', move), { once: true })
}
function updateWheel(e: PointerEvent) {
    const rect = wheelEl.value!.getBoundingClientRect()
    const dx = e.clientX - (rect.left + rect.width / 2)
    const dy = e.clientY - (rect.top + rect.height / 2)
    const dist = Math.sqrt(dx * dx + dy * dy)
    saturation.value = clamp(dist / (rect.width / 2))

    let angle = (Math.atan2(dx, -dy) * 180) / Math.PI
    if (angle < 0) angle += 360
    hue.value = angle
    emitHex()
}

function onBrightnessDown(e: PointerEvent) {
    const el = brightnessEl.value!
    el.setPointerCapture(e.pointerId)
    updateBrightness(e)
    const move = (ev: PointerEvent) => updateBrightness(ev)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', move), { once: true })
}
function updateBrightness(e: PointerEvent) {
    const rect = brightnessEl.value!.getBoundingClientRect()
    value.value = 1 - clamp((e.clientY - rect.top) / rect.height)
    emitHex()
}

function setHex(newHex: string) {
    syncFromHex(newHex)
    emitHex()
}
function onHexInput(e: Event) {
    setHex((e.target as HTMLInputElement).value)
}

watch(
    () => props.modelValue,
    (newHex) => {
        if (newHex.toUpperCase() === hex.value) return
        syncFromHex(newHex)
    },
)
</script>

<style scoped>
.color-picker {
    display: flex;
    flex-direction: column;
    gap: 12px;
    width: 100%;
    padding: 12px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.picker-row {
    display: flex;
    gap: 14px;
    justify-content: center;
}

.wheel {
    position: relative;
    width: 150px;
    height: 150px;
    flex-shrink: 0;
    border-radius: 50%;
    background:
        radial-gradient(circle at center, #fff 0%, rgba(255, 255, 255, 0) 72%),
        conic-gradient(from 0deg, red, magenta, blue, cyan, lime, yellow, red);
    box-shadow:
        inset 0 0 0 1px rgba(0, 0, 0, 0.15),
        0 1px 2px rgba(0, 0, 0, 0.3);
    cursor: crosshair;
    touch-action: none;
}

.wheel-thumb {
    position: absolute;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 2.5px solid #fff;
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.35),
        0 1px 3px rgba(0, 0, 0, 0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
}

.brightness-track {
    position: relative;
    width: 16px;
    height: 150px;
    border-radius: 999px;
    cursor: pointer;
    touch-action: none;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.15);
}

.brightness-thumb {
    position: absolute;
    left: 50%;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 2.5px solid #fff;
    box-shadow:
        0 0 0 1px rgba(0, 0, 0, 0.35),
        0 1px 3px rgba(0, 0, 0, 0.5);
    transform: translate(-50%, -50%);
    pointer-events: none;
}

.picker-footer {
    display: flex;
    align-items: center;
    gap: 10px;
}

.swatch-preview {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.25);
    flex-shrink: 0;
}

.hex-input {
    flex: 1;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    color: #f3f4f6;
    padding: 6px 14px;
    font-size: 13px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    text-align: center;
}
</style>
