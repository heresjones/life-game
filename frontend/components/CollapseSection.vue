<template>
    <section class="collapse-section">
        <button type="button" class="collapse-header" :class="{ open: isOpen }" @click="isOpen = !isOpen">
            <span>{{ label }}</span>
            <span class="chevron" :class="{ open: isOpen }">&#9662;</span>
        </button>
        <div v-if="isOpen" class="collapse-body">
            <slot />
        </div>
    </section>
</template>

<script setup lang="ts">
const props = defineProps<{
    label: string
    opened?: boolean
}>()

const isOpen = ref(!!props.opened)
</script>

<style scoped>
.collapse-section {
    width: 100%;
}

.collapse-header {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: none;
    border: none;
    color: #f3f4f6;
    font-weight: 600;
    padding: 10px 12px;
    border-radius: 8px;
    cursor: pointer;
}

.collapse-header:hover,
.collapse-header.open {
    background: #2a2a33;
}

.chevron {
    font-size: calc(10px * var(--ui-font-scale, 1));
    transition: transform 0.15s ease;
}

.chevron.open {
    transform: rotate(180deg);
}

.collapse-body {
    padding: 8px 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
</style>
