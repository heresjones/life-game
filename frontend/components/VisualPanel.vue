<template>
    <template v-if="selectedDot || activeGroup">
        <div class="field-row">
            <span>{{ activeGroup && !selectedDot ? 'Group color' : 'Dot color' }}</span>
            <OklchColorPicker v-model="selectedColor" />
        </div>
        <SliderField
            :label="activeGroup && !selectedDot ? 'Group size' : 'Dot size'"
            :min="MIN_DOT_RADIUS"
            :max="MAX_DOT_RADIUS"
            :reset-value="DOT_RADIUS"
            v-model="selectedSize"
        />
        <SliderField
            label="Own group force"
            hint="(+repel / −attract)"
            :min="MIN_REPULSION"
            :max="MAX_REPULSION"
            :reset-value="0"
            v-model="selectedRepulsionSelf"
        />
        <SliderField
            label="Other particles force"
            hint="(+repel / −attract)"
            :min="MIN_REPULSION"
            :max="MAX_REPULSION"
            :reset-value="0"
            v-model="selectedRepulsionOthers"
        />
        <SliderField
            label="Force range"
            :min="MIN_FORCE_RANGE"
            :max="MAX_FORCE_RANGE"
            :step="0.5"
            :reset-value="DEFAULT_FORCE_RANGE"
            v-model="selectedForceRange"
        />
        <SliderField
            label="Drag"
            hint="(higher = stops sooner)"
            :min="MIN_DRAG_COEFFICIENT"
            :max="MAX_DRAG_COEFFICIENT"
            :step="0.01"
            :reset-value="DEFAULT_DRAG_COEFFICIENT"
            v-model="selectedDragCoefficient"
        />
    </template>
    <p v-else class="no-selection">Select a dot or group to edit its color.</p>
</template>

<script setup lang="ts">
import {
    DOT_RADIUS,
    MIN_DOT_RADIUS,
    MAX_DOT_RADIUS,
    MIN_REPULSION,
    MAX_REPULSION,
    MIN_FORCE_RANGE,
    MAX_FORCE_RANGE,
    DEFAULT_FORCE_RANGE,
    MIN_DRAG_COEFFICIENT,
    MAX_DRAG_COEFFICIENT,
    DEFAULT_DRAG_COEFFICIENT,
} from '~/helpers/dot'

const {
    selectedDot,
    activeGroup,
    selectedColor,
    selectedSize,
    selectedRepulsionSelf,
    selectedRepulsionOthers,
    selectedForceRange,
    selectedDragCoefficient,
} = useDotSimulation()
</script>

<style scoped>
.no-selection {
    margin: 0;
    color: rgba(255, 255, 255, 0.45);
    font-size: 13px;
}

.field-row + .field-row {
    margin-top: 14px;
}
</style>
