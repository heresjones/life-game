<template>
    <div id="game-root">
        <DotCanvas
            ref="canvasRef"
            @canvas-click="onCanvasClick"
            @drag-start="onDragStart"
            @drag-move="onDragMove"
            @drag-end="onDragEnd"
        />
        <PlaybackBar :paused="paused" @toggle="togglePause" />
        <EditSidebar v-model="sidebarOpen">
            <DotInventoryBar />
            <CollapseSection label="Groups">
                <GroupsPanel />
            </CollapseSection>
            <CollapseSection label="Visual" opened>
                <VisualPanel />
            </CollapseSection>
        </EditSidebar>
        <SettingsBar />
        <div class="version-tag">{{ appVersion }}</div>
    </div>
</template>

<script setup lang="ts">
import DotCanvas from '~/components/DotCanvas.vue'
import { appVersion } from '~/constants/index'

const { getRenderDots, highlightedIds, paused, sidebarOpen, onCanvasClick, onDragStart, onDragMove, onDragEnd, togglePause, startPhysics, stopPhysics } =
    useDotSimulation()

const canvasRef = ref<InstanceType<typeof DotCanvas> | null>(null)

// Drives the canvas directly off the physics rAF loop instead of through
// Vue props/reactivity — see the `dots` shallowRef comment in
// useDotSimulation.ts for why that matters at 60fps.
onMounted(() => startPhysics(() => canvasRef.value?.redraw(getRenderDots(), highlightedIds.value)))
onUnmounted(() => stopPhysics())
</script>

<style scoped>
.version-tag {
    position: fixed;
    right: 4px;
    bottom: 2px;
    z-index: 5;
    font-size: 9px;
    line-height: 1;
    color: #4b5563;
    pointer-events: none;
    user-select: none;
}
</style>
