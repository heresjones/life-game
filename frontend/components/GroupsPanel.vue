<template>
    <div>
        <p v-if="groups.length === 0" class="no-selection">No groups yet — edit a dot's color to create one.</p>
        <ul v-else class="group-list">
            <li v-for="group in groups" :key="group.id">
                <button
                    type="button"
                    class="group-list-item"
                    :class="{ active: selectedGroupListId === group.id }"
                    @click="selectGroupList(group.id)"
                >
                    <span class="group-swatch" :style="{ backgroundColor: group.color }" />
                    <span class="group-list-name">{{ group.name || 'Unnamed group' }}</span>
                    <span class="group-count">{{ memberCount(group.id) }}</span>
                </button>
            </li>
        </ul>

        <IconButton
            v-if="selectedGroupListId"
            title="Add dot to group"
            @click="addToGroup(selectedGroupListId)"
        >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M12 5v14M5 12h14" />
            </svg>
        </IconButton>
    </div>
</template>

<script setup lang="ts">
const { groups, selectedGroupListId, selectGroupList, memberCount, addToGroup } = useDotSimulation()
</script>

<style scoped>
.no-selection {
    margin: 0;
    color: rgba(255, 255, 255, 0.45);
    font-size: 13px;
}

.group-list {
    list-style: none;
    margin: 0 0 10px;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
}

.group-list-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    background: none;
    border: 1px solid transparent;
    border-radius: 8px;
    padding: 6px 8px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    cursor: pointer;
}
.group-list-item:hover {
    background: rgba(255, 255, 255, 0.06);
}
.group-list-item.active {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
}

.group-swatch {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.2);
    flex-shrink: 0;
}

.group-list-name {
    flex: 1;
    min-width: 0;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.group-count {
    flex-shrink: 0;
    font-size: 11px;
    color: rgba(255, 255, 255, 0.45);
}
</style>
