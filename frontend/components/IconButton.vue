<template>
    <button type="button" class="icon-btn" :class="{ danger }" :title="title" :aria-label="title" @click="$emit('click')">
        <slot />
    </button>
</template>

<script setup lang="ts">
defineProps<{
    title: string
    danger?: boolean
}>()
defineEmits<{
    click: []
}>()
</script>

<style scoped>
.icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    padding: 0;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 8px;
    color: #f3f4f6;
    cursor: pointer;
    flex-shrink: 0;
}
.icon-btn:hover {
    background: rgba(255, 255, 255, 0.14);
}
.icon-btn :slotted(svg) {
    width: 16px;
    height: 16px;
}

.icon-btn.danger {
    color: #fca5a5;
    border-color: rgba(252, 165, 165, 0.35);
}
.icon-btn.danger:hover {
    background: rgba(252, 165, 165, 0.12);
}
</style>
