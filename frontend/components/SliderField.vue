<template>
    <div class="field-row slider-field">
        <div class="slider-label-row">
            <span>
                {{ label }}
                <span v-if="hint" class="slider-hint">{{ hint }}</span>
            </span>
            <button type="button" class="reset-btn" title="Reset" aria-label="Reset" @click="reset">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M3 12a9 9 0 1 0 3-6.7" />
                    <path d="M3 4v5h5" />
                </svg>
            </button>
        </div>
        <div class="slider-control">
            <input
                type="range"
                class="slider-range"
                :min="min"
                :max="max"
                :step="step"
                :value="modelValue"
                @input="onRangeInput"
            />
            <input
                type="number"
                class="slider-number"
                :min="min"
                :max="max"
                :step="step"
                :value="displayValue"
                @change="onNumberInput"
            />
        </div>
    </div>
</template>

<script setup lang="ts">
const props = withDefaults(
    defineProps<{
        label: string
        min: number
        max: number
        step?: number
        modelValue: number
        resetValue?: number
        hint?: string
    }>(),
    { step: 1, resetValue: 0, hint: '' },
)
const emit = defineEmits<{
    'update:modelValue': [number]
}>()

// Fractional steps (e.g. 0.5) still want one decimal shown; whole-number
// steps show a clean integer instead of float noise.
const displayValue = computed(() => {
    const decimals = props.step < 1 ? 1 : 0
    return Number(props.modelValue.toFixed(decimals))
})

function clampValue(v: number): number {
    if (Number.isNaN(v)) return props.modelValue
    return Math.min(props.max, Math.max(props.min, v))
}

function onRangeInput(e: Event) {
    emit('update:modelValue', clampValue(Number((e.target as HTMLInputElement).value)))
}

function onNumberInput(e: Event) {
    emit('update:modelValue', clampValue(Number((e.target as HTMLInputElement).value)))
}

function reset() {
    emit('update:modelValue', props.resetValue)
}
</script>

<style scoped>
.slider-field {
    gap: 6px;
}

.slider-label-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
}

.slider-hint {
    color: rgba(255, 255, 255, 0.4);
    font-size: 11px;
}

.reset-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    width: 22px;
    height: 22px;
    padding: 0;
    background: none;
    border: none;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
}
.reset-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #f3f4f6;
}
.reset-btn svg {
    width: 14px;
    height: 14px;
}

.slider-control {
    display: flex;
    align-items: center;
    gap: 10px;
}

.slider-range {
    flex: 1;
    min-width: 0;
    appearance: none;
    -webkit-appearance: none;
    height: 20px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2);
    cursor: pointer;
}
.slider-range::-webkit-slider-runnable-track {
    height: 20px;
    border-radius: 999px;
    background: transparent;
}
.slider-range::-moz-range-track {
    height: 20px;
    border-radius: 999px;
    background: transparent;
}
.slider-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.35);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    cursor: pointer;
}
.slider-range::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: #fff;
    border: 2px solid rgba(0, 0, 0, 0.35);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    cursor: pointer;
}

.slider-number {
    flex-shrink: 0;
    width: 4.2em;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    color: #f3f4f6;
    padding: 3px 8px;
    font-size: 12px;
    text-align: center;
}
/* Hide native spinners so the box stays a clean pill. */
.slider-number::-webkit-outer-spin-button,
.slider-number::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
}
.slider-number {
    appearance: textfield;
    -moz-appearance: textfield;
}
</style>
