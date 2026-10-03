<template>
    <div class="edit-sidebar">
        <button
            type="button"
            class="edit-sidebar-tab"
            :class="{ open: modelValue }"
            :style="{ transform: `translateX(${modelValue ? width : 0}px)` }"
            @click="$emit('update:modelValue', !modelValue)"
        >
            <span class="chevron">&#9656;</span>
            <span class="tab-label">Menu</span>
        </button>

        <Transition name="slide">
            <div v-if="modelValue" class="edit-sidebar-panel" :style="{ width: `${width}px` }">
                <div class="edit-sidebar-content">
                    <slot />
                </div>
            </div>
        </Transition>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    modelValue: boolean
}>()
defineEmits<{
    'update:modelValue': [value: boolean]
}>()

const width = 280
</script>

<style scoped>
.edit-sidebar-tab {
    position: fixed;
    top: 16px;
    left: 0;
    z-index: 11;
    display: flex;
    align-items: center;
    gap: 6px;
    background: #1e1e24;
    color: #f3f4f6;
    border: none;
    border-radius: 0 8px 8px 0;
    padding: 10px 12px 10px 8px;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
    transition: transform 0.25s ease;
}

.edit-sidebar-tab:hover {
    background: #2a2a33;
}

.chevron {
    display: inline-block;
    font-size: calc(12px * var(--ui-font-scale, 1));
    transition: transform 0.2s ease;
}

.edit-sidebar-tab.open .chevron {
    transform: rotate(180deg);
}

.edit-sidebar-panel {
    position: fixed;
    inset: 0 auto 0 0;
    z-index: 10;
    background: #1e1e24;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.45);
}

.edit-sidebar-content {
    height: 100%;
    overflow-y: auto;
    padding: 56px 12px 12px;
}

.slide-enter-active,
.slide-leave-active {
    transition: transform 0.25s ease;
}
.slide-enter-from,
.slide-leave-to {
    transform: translateX(-100%);
}
</style>
