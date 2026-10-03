<template>
    <div class="settings-bar">
        <button type="button" class="settings-toggle" :class="{ open }" @click="open = !open">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33
                       1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33
                       l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2
                       0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83
                       l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0
                       0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33
                       1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
                />
            </svg>
            <span>Settings</span>
        </button>

        <Transition name="sweep">
            <div v-if="open" class="settings-dropdown">
                <div class="field-row">
                    <span>Background color</span>
                    <OklchColorPicker v-model="backgroundColor" />
                </div>
                <SliderField
                    label="Text size"
                    hint="%"
                    :min="MIN_TEXT_SCALE"
                    :max="MAX_TEXT_SCALE"
                    :step="5"
                    :reset-value="DEFAULT_TEXT_SCALE"
                    v-model="textScale"
                />
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
import { useUiSettings, MIN_TEXT_SCALE, MAX_TEXT_SCALE, DEFAULT_TEXT_SCALE } from '~/composables/useUiSettings'

const { backgroundColor, textScale } = useUiSettings()
const open = ref(false)
</script>

<style scoped>
.settings-bar {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 11;
}

.settings-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1e1e24;
    color: #f3f4f6;
    border: none;
    border-radius: 8px;
    padding: 10px 12px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
}
.settings-toggle:hover,
.settings-toggle.open {
    background: #2a2a33;
}
.settings-toggle svg {
    width: 16px;
    height: 16px;
    flex-shrink: 0;
}
.settings-toggle span {
    font-size: calc(12px * var(--ui-font-scale, 1));
}

.settings-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    width: 260px;
    background: #1e1e24;
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
    transform-origin: top right;
}

/* Sweeps down like a shade unrolling: the panel's own box is always full
   height (so layout/width never jumps), and a clip-path reveals it from the
   top edge downward instead of fading or sliding the whole box in. */
.sweep-enter-active,
.sweep-leave-active {
    transition: clip-path 0.28s ease, opacity 0.2s ease;
}
.sweep-enter-from,
.sweep-leave-to {
    clip-path: inset(0 0 100% 0);
    opacity: 0.4;
}
.sweep-enter-to,
.sweep-leave-from {
    clip-path: inset(0 0 0% 0);
    opacity: 1;
}
</style>
