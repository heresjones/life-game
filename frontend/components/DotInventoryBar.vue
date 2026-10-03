<template>
    <div class="dot-inventory">
        <div class="inventory-top">
            <div v-if="selectedDot" class="selected-preview">
                <div class="preview-swatch" :style="{ backgroundColor: selectedColor }" />
                <span>Selected dot</span>
            </div>
            <div v-else-if="activeGroup" class="selected-preview">
                <div class="preview-swatch" :style="{ backgroundColor: activeGroup.color }" />
                <span>Selected group</span>
            </div>
            <p v-else class="no-selection">No dot selected</p>

            <div class="inventory-actions">
                <IconButton title="Add dot" @click="addDot">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                        <path d="M12 5v14M5 12h14" />
                    </svg>
                </IconButton>
                <IconButton v-if="selectedDot" title="Copy dot" @click="copySelected">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="9" y="9" width="11" height="11" rx="2" />
                        <path d="M5 15V5a2 2 0 0 1 2-2h10" />
                    </svg>
                </IconButton>
                <IconButton v-if="undoState" title="Undo" @click="undoAdd">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 15 3 9l6-6M3 9h12a6 6 0 0 1 0 12h-3" />
                    </svg>
                </IconButton>
                <IconButton v-if="selectedDot && dots.length > 1" title="Delete dot" danger @click="deleteSelected">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M4 7h16M9 7V4h6v3M6 7l1 13a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-13" />
                    </svg>
                </IconButton>
            </div>
        </div>

        <div v-if="activeGroup" class="group-name-row">
            <span class="group-label">Group</span>
            <input type="text" class="group-name-input" placeholder="Unnamed group" v-model="groupNameProxy" />
        </div>

        <p class="dot-count">{{ dots.length }} dot{{ dots.length === 1 ? '' : 's' }} total</p>
    </div>
</template>

<script setup lang="ts">
const { dots, selectedDot, activeGroup, selectedColor, undoState, groupNameProxy, addDot, copySelected, undoAdd, deleteSelected } =
    useDotSimulation()
</script>

<style scoped>
.dot-inventory {
    display: flex;
    flex-direction: column;
    gap: 10px;
    padding: 8px 12px 12px;
    margin-bottom: 4px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.inventory-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
}

.selected-preview {
    display: flex;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.8);
    font-size: calc(13px * var(--ui-font-scale, 1));
    min-width: 0;
}

.preview-swatch {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    box-shadow: inset 0 0 0 2px rgba(0, 0, 0, 0.25);
    flex-shrink: 0;
}

.no-selection {
    margin: 0;
    color: rgba(255, 255, 255, 0.45);
    font-size: calc(13px * var(--ui-font-scale, 1));
}

.inventory-actions {
    display: flex;
    gap: 6px;
    flex-shrink: 0;
}

.group-name-row {
    display: flex;
    align-items: center;
    gap: 8px;
}

.group-label {
    flex-shrink: 0;
    font-size: calc(11px * var(--ui-font-scale, 1));
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.45);
}

.group-name-input {
    flex: 1;
    min-width: 0;
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(255, 255, 255, 0.15);
    border-radius: 999px;
    color: #f3f4f6;
    padding: 4px 12px;
    font-size: calc(12px * var(--ui-font-scale, 1));
}

.dot-count {
    margin: 0;
    font-size: calc(11px * var(--ui-font-scale, 1));
    color: rgba(255, 255, 255, 0.4);
}
</style>
