<template>
    <div id="game-root">
        <DotCanvas :color="dotColor" />
        <EditSidebar v-model="sidebarOpen">
            <CollapseSection label="Visual" opened>
                <div class="field-row">
                    <span>Dot color</span>
                    <ColorWheelPicker v-model="dotColor" />
                </div>
            </CollapseSection>
        </EditSidebar>
    </div>
</template>

<script setup lang="ts">
const dotColor = ref('#808080')
const sidebarOpen = ref(false)
</script>
