<template>
    <div class="playback-bar">
        <button
            type="button"
            class="playback-btn"
            :title="paused ? 'Play' : 'Pause'"
            :aria-label="paused ? 'Play' : 'Pause'"
            @click="$emit('toggle')"
        >
            <svg v-if="paused" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
        </button>
    </div>
</template>

<script setup lang="ts">
defineProps<{
    paused: boolean
}>()
defineEmits<{
    toggle: []
}>()
</script>

<style scoped>
.playback-bar {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
    display: flex;
    align-items: center;
    padding: 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.1);
    backdrop-filter: blur(24px) saturate(180%);
    -webkit-backdrop-filter: blur(24px) saturate(180%);
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow:
        0 8px 30px rgba(0, 0, 0, 0.35),
        inset 0 1px 0 rgba(255, 255, 255, 0.18);
}

.playback-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.12);
    border: none;
    color: #fff;
    cursor: pointer;
}
.playback-btn:hover {
    background: rgba(255, 255, 255, 0.22);
}
.playback-btn svg {
    width: 20px;
    height: 20px;
}
</style>
