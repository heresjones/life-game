<template>
    <div class="color-picker">
        <div
            ref="satPanel"
            class="sat-panel"
            :style="{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }"
            @pointerdown="onSatDown"
        >
            <div class="sat-thumb" :style="satThumbStyle" />
        </div>

        <div ref="hueTrack" class="hue-track" @pointerdown="onHueDown">
            <div class="hue-thumb" :style="hueThumbStyle" />
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

        <div class="palette">
            <button
                v-for="swatch in palette"
                :key="swatch"
                type="button"
                class="palette-swatch"
                :style="{ backgroundColor: swatch }"
                @click="setHex(swatch)"
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

const palette = ['#808080', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#06B6D4', '#3B82F6', '#A855F7', '#EC4899', '#FFFFFF']

const hue = ref(0)
const saturation = ref(0)
const value = ref(0.5)

const satPanel = ref<HTMLElement>()
const hueTrack = ref<HTMLElement>()

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
const hueColor = computed(() => `hsl(${hue.value}, 100%, 50%)`)
const satThumbStyle = computed(() => ({
    left: `${saturation.value * 100}%`,
    top: `${(1 - value.value) * 100}%`,
}))
const hueThumbStyle = computed(() => ({ left: `${(hue.value / 360) * 100}%` }))

function emitHex() {
    emit('update:modelValue', hex.value)
}

function onSatDown(e: PointerEvent) {
    const el = satPanel.value!
    el.setPointerCapture(e.pointerId)
    updateSat(e)
    const move = (ev: PointerEvent) => updateSat(ev)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', move), { once: true })
}
function updateSat(e: PointerEvent) {
    const rect = satPanel.value!.getBoundingClientRect()
    saturation.value = clamp((e.clientX - rect.left) / rect.width)
    value.value = 1 - clamp((e.clientY - rect.top) / rect.height)
    emitHex()
}

function onHueDown(e: PointerEvent) {
    const el = hueTrack.value!
    el.setPointerCapture(e.pointerId)
    updateHue(e)
    const move = (ev: PointerEvent) => updateHue(ev)
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerup', () => el.removeEventListener('pointermove', move), { once: true })
}
function updateHue(e: PointerEvent) {
    const rect = hueTrack.value!.getBoundingClientRect()
    hue.value = clamp((e.clientX - rect.left) / rect.width) * 360
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
    gap: 8px;
    width: 100%;
}

.sat-panel {
    position: relative;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 6px;
    cursor: crosshair;
    touch-action: none;
}

.sat-thumb {
    position: absolute;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
    transform: translate(-50%, -50%);
    pointer-events: none;
}

.hue-track {
    position: relative;
    width: 100%;
    height: 12px;
    border-radius: 999px;
    cursor: pointer;
    touch-action: none;
    background: linear-gradient(
        to right,
        red,
        yellow,
        lime,
        cyan,
        blue,
        magenta,
        red
    );
}

.hue-thumb {
    position: absolute;
    top: 50%;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    border: 2px solid white;
    box-shadow: 0 0 2px rgba(0, 0, 0, 0.6);
    transform: translate(-50%, -50%);
    pointer-events: none;
}

.picker-footer {
    display: flex;
    align-items: center;
    gap: 8px;
}

.swatch-preview {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid #4b5563;
    flex-shrink: 0;
}

.hex-input {
    flex: 1;
    background: #111318;
    border: 1px solid #4b5563;
    border-radius: 6px;
    color: #f3f4f6;
    padding: 4px 8px;
    font-family: ui-monospace, monospace;
    font-size: 12px;
    text-transform: uppercase;
}

.palette {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 6px;
}

.palette-swatch {
    aspect-ratio: 1;
    border-radius: 6px;
    border: 1px solid #4b5563;
    cursor: pointer;
}
.palette-swatch:hover {
    border-color: #9ca3af;
}
</style>
