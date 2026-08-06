<template>
    <div id="game-root">
        <DotCanvas
            :dots="renderDots"
            :highlighted="highlightedIds"
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
    </div>
</template>

<script setup lang="ts">
const { renderDots, highlightedIds, paused, sidebarOpen, onCanvasClick, onDragStart, onDragMove, onDragEnd, togglePause, startPhysics, stopPhysics } =
    useDotSimulation()

onMounted(() => startPhysics())
onUnmounted(() => stopPhysics())
</script>
