<template>
    <div v-if="activeGroup" class="overrides-block">
        <span class="overrides-label">Per-group overrides</span>
        <p class="overrides-hint">A group only exerts force on another group if you add an override for it here.</p>

        <div v-if="activeGroup.targetOverrides.length" class="override-list">
            <div v-for="override in activeGroup.targetOverrides" :key="override.targetGroupId" class="override-card">
                <div class="override-card-header">
                    <span class="group-swatch" :style="{ backgroundColor: targetColor(override.targetGroupId) }" />
                    <span class="override-name">{{ targetName(override.targetGroupId) }}</span>
                    <IconButton title="Remove override" danger @click="removeTargetOverride(override.targetGroupId)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
                        </svg>
                    </IconButton>
                </div>
                <SliderField
                    label="Close"
                    hint="(always repels)"
                    :min="MIN_CLOSE_FORCE"
                    :max="MAX_CLOSE_FORCE"
                    :reset-value="DEFAULT_CLOSE_FORCE"
                    v-model="override.close"
                />
                <SliderField
                    label="Far"
                    hint="(+repel / −attract)"
                    :min="MIN_FAR_FORCE"
                    :max="MAX_FAR_FORCE"
                    :reset-value="DEFAULT_FAR_FORCE"
                    v-model="override.far"
                />
                <SliderField
                    label="Close range"
                    :min="MIN_ZONE_RANGE"
                    :max="MAX_ZONE_RANGE"
                    :step="0.5"
                    :reset-value="DEFAULT_CLOSE_RANGE"
                    v-model="override.closeRange"
                />
                <SliderField
                    label="Far range"
                    :min="MIN_ZONE_RANGE"
                    :max="MAX_ZONE_RANGE"
                    :step="0.5"
                    :reset-value="DEFAULT_FAR_RANGE"
                    v-model="override.farRange"
                />
                <p class="range-readout">
                    Close {{ Math.round(activeGroup.radius * override.closeRange) }}px + Far
                    {{ Math.round(activeGroup.radius * override.farRange) }}px =
                    {{ Math.round(activeGroup.radius * (override.closeRange + override.farRange)) }}px total
                </p>
            </div>
        </div>

        <select v-if="overridableGroups.length" class="override-select" @change="onPick">
            <option value="" selected disabled>+ Add override for a group…</option>
            <option v-for="g in overridableGroups" :key="g.id" :value="g.id">{{ g.name || 'Unnamed group' }}</option>
        </select>
        <p v-else-if="!activeGroup.targetOverrides.length" class="no-selection">
            Create another group to set a per-group override.
        </p>
    </div>
</template>

<script setup lang="ts">
import {
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
} from '~/helpers/dot'

const { activeGroup, groups, overridableGroups, addTargetOverride, removeTargetOverride } = useDotSimulation()

function targetName(groupId: string): string {
    return groups.value.find((g) => g.id === groupId)?.name || 'Unnamed group'
}

function targetColor(groupId: string): string {
    return groups.value.find((g) => g.id === groupId)?.color ?? '#808080'
}

function onPick(e: Event) {
    const select = e.target as HTMLSelectElement
    if (select.value) addTargetOverride(select.value)
    select.value = '' // snap back to the placeholder so it reads as an action, not a persistent selection
}
</script>

<style scoped>
.overrides-block {
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.overrides-label {
    font-size: calc(13px * var(--ui-font-scale, 1));
    color: #f3f4f6;
}

.overrides-hint {
    margin: -4px 0 0;
    font-size: calc(11px * var(--ui-font-scale, 1));
    color: rgba(255, 255, 255, 0.4);
}

.no-selection {
    margin: 0;
    color: rgba(255, 255, 255, 0.45);
    font-size: calc(13px * var(--ui-font-scale, 1));
}

.range-readout {
    margin: -2px 0 0;
    font-size: calc(11px * var(--ui-font-scale, 1));
    color: rgba(255, 255, 255, 0.4);
}

.override-list {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.override-card {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 10px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
}

.override-card-header {
    display: flex;
    align-items: center;
    gap: 8px;
}

.group-swatch {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
}

.override-name {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-size: calc(13px * var(--ui-font-scale, 1));
    color: rgba(255, 255, 255, 0.8);
}

.override-select {
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    color: #f3f4f6;
    padding: 6px 12px;
    font-size: calc(12px * var(--ui-font-scale, 1));
}
</style>
