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
            label="Own close force"
            hint="(always repels)"
            :min="MIN_CLOSE_FORCE"
            :max="MAX_CLOSE_FORCE"
            :reset-value="DEFAULT_CLOSE_FORCE"
            v-model="selectedCloseSelf"
        />
        <SliderField
            label="Own far force"
            hint="(+repel / −attract)"
            :min="MIN_FAR_FORCE"
            :max="MAX_FAR_FORCE"
            :reset-value="DEFAULT_FAR_FORCE"
            v-model="selectedFarSelf"
        />
        <GroupOverridesPanel v-if="activeGroup" />
        <SliderField
            label="Close range"
            :min="MIN_ZONE_RANGE"
            :max="MAX_ZONE_RANGE"
            :step="0.5"
            :reset-value="DEFAULT_CLOSE_RANGE"
            v-model="selectedCloseRange"
        />
        <SliderField
            label="Far range"
            :min="MIN_ZONE_RANGE"
            :max="MAX_ZONE_RANGE"
            :step="0.5"
            :reset-value="DEFAULT_FAR_RANGE"
            v-model="selectedFarRange"
        />
        <p class="range-readout">
            Close {{ Math.round(closeRangePx) }}px + Far {{ Math.round(farRangePx) }}px = {{ Math.round(totalRangePx) }}px total
        </p>
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
    MIN_CLOSE_FORCE,
    MAX_CLOSE_FORCE,
    DEFAULT_CLOSE_FORCE,
    MIN_FAR_FORCE,
    MAX_FAR_FORCE,
    DEFAULT_FAR_FORCE,
    MIN_ZONE_RANGE,
    MAX_ZONE_RANGE,
    DEFAULT_CLOSE_RANGE,
    DEFAULT_FAR_RANGE,
    MIN_DRAG_COEFFICIENT,
    MAX_DRAG_COEFFICIENT,
    DEFAULT_DRAG_COEFFICIENT,
} from '~/helpers/dot'

const {
    selectedDot,
    activeGroup,
    selectedColor,
    selectedSize,
    selectedCloseSelf,
    selectedFarSelf,
    selectedCloseRange,
    selectedFarRange,
    selectedDragCoefficient,
} = useDotSimulation()

// Close range and far range are each an abstract multiplier on the dot's own
// radius, independently sized (see helpers/physics.ts) — this is what they
// actually work out to in pixels, which is different for every dot/group
// since radius and both ranges can all vary.
const closeRangePx = computed(() => selectedSize.value * selectedCloseRange.value)
const farRangePx = computed(() => selectedSize.value * selectedFarRange.value)
const totalRangePx = computed(() => closeRangePx.value + farRangePx.value)
</script>

<style scoped>
.no-selection {
    margin: 0;
    color: rgba(255, 255, 255, 0.45);
    font-size: calc(13px * var(--ui-font-scale, 1));
}

.field-row + .field-row {
    margin-top: 14px;
}

.range-readout {
    margin: -2px 0 0;
    font-size: calc(11px * var(--ui-font-scale, 1));
    color: rgba(255, 255, 255, 0.4);
}
</style>
