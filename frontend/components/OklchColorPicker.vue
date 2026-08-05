<template>
    <div class="oklch-picker">
        <div class="channel">
            <div class="channel-label">
                <span>Lightness</span>
                <span class="channel-value">{{ Math.round(l * 100) }}%</span>
            </div>
            <input
                type="range"
                min="0"
                max="1"
                step="0.001"
                :value="l"
                :style="{ background: lGradient }"
                @input="onInput('l', $event)"
            />
        </div>

        <div class="channel">
            <div class="channel-label">
                <span>Chroma</span>
                <span class="channel-value">{{ c.toFixed(3) }}</span>
            </div>
            <input
                type="range"
                min="0"
                max="0.4"
                step="0.001"
                :value="c"
                :style="{ background: cGradient }"
                @input="onInput('c', $event)"
            />
        </div>

        <div class="channel">
            <div class="channel-label">
                <span>Hue</span>
                <span class="channel-value">{{ Math.round(h) }}&deg;</span>
            </div>
            <input
                type="range"
                min="0"
                max="360"
                step="1"
                :value="h"
                :style="{ background: hGradient }"
                @input="onInput('h', $event)"
            />
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
import { hexToRgb, rgbToHex, oklchToRgb, rgbToOklch } from '~/helpers/color'

const props = defineProps<{
    modelValue: string
}>()
const emit = defineEmits<{
    'update:modelValue': [hex: string]
}>()

const GRADIENT_STEPS = 12
const MAX_CHROMA = 0.4

const l = ref(0.6)
const c = ref(0.15)
const h = ref(260)

function syncFromHex(hexValue: string) {
    const rgb = hexToRgb(hexValue)
    if (!rgb) return
    const oklch = rgbToOklch(...rgb)
    l.value = oklch.l
    c.value = oklch.c
    // Near-grey colors have an unstable hue; keep the slider where it was.
    if (oklch.c > 0.001) h.value = oklch.h
}
syncFromHex(props.modelValue)

const hex = computed(() => rgbToHex(...oklchToRgb(l.value, c.value, h.value)))

function buildGradient(channel: 'l' | 'c' | 'h') {
    const stops: string[] = []
    for (let i = 0; i <= GRADIENT_STEPS; i++) {
        const t = i / GRADIENT_STEPS
        const Lv = channel === 'l' ? t : l.value
        const Cv = channel === 'c' ? t * MAX_CHROMA : c.value
        const Hv = channel === 'h' ? t * 360 : h.value
        const [r, g, b] = oklchToRgb(Lv, Cv, Hv)
        stops.push(`rgb(${r} ${g} ${b})`)
    }
    return `linear-gradient(to right, ${stops.join(', ')})`
}
const lGradient = computed(() => buildGradient('l'))
const cGradient = computed(() => buildGradient('c'))
const hGradient = computed(() => buildGradient('h'))

function emitHex() {
    emit('update:modelValue', hex.value)
}

const MIN_VISIBLE_CHROMA = 0.1

function onInput(channel: 'l' | 'c' | 'h', e: Event) {
    const v = Number((e.target as HTMLInputElement).value)
    if (channel === 'l') l.value = v
    else if (channel === 'c') c.value = v
    else {
        h.value = v
        // Hue has no visual effect while achromatic; dragging it implies
        // the user wants to introduce some color.
        if (c.value < MIN_VISIBLE_CHROMA) c.value = MIN_VISIBLE_CHROMA
    }
    emitHex()
}

function onHexInput(e: Event) {
    syncFromHex((e.target as HTMLInputElement).value)
    emitHex()
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
.oklch-picker {
    display: flex;
    flex-direction: column;
    gap: 14px;
    width: 100%;
    padding: 12px;
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.08);
}

.channel {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.channel-label {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.55);
}

.channel-value {
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
    letter-spacing: 0;
    text-transform: none;
}

input[type='range'] {
    appearance: none;
    -webkit-appearance: none;
    width: 100%;
    height: 20px;
    border-radius: 999px;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
    cursor: pointer;
}

input[type='range']::-webkit-slider-runnable-track {
    height: 20px;
    border-radius: 999px;
    background: transparent;
}
input[type='range']::-moz-range-track {
    height: 20px;
    border-radius: 999px;
    background: transparent;
}

input[type='range']::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.35);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    cursor: pointer;
}
input[type='range']::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.35);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    cursor: pointer;
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
