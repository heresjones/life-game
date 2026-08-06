// Owns all reactive dot/group state plus the animation loop that drives it.
// Module-level (not created inside the exported function), so every call to
// useDotSimulation() — from app.vue or any sidebar component — shares the
// exact same state; there's only ever one simulation on screen.
import type { Dot, DotGroup, RenderDot } from '~/helpers/dot'
import { DOT_RADIUS, DEFAULT_REPULSION, DEFAULT_FORCE_RANGE, DEFAULT_DRAG_COEFFICIENT } from '~/helpers/dot'
import {
    MAX_SUBSTEPS,
    resolveColor,
    resolveRadius,
    resolveRepulsionSelf,
    resolveRepulsionOthers,
    resolveForceRange,
    resolveDragCoefficient,
    resolveTraits,
    stepPhysics,
    randomPosition,
    nearbyPosition,
} from '~/helpers/physics'

let nextDotId = 1
let nextGroupId = 1
function makeId() {
    return `dot-${nextDotId++}`
}
function makeGroupId() {
    return `group-${nextGroupId++}`
}

const dots = ref<Dot[]>([
    {
        id: makeId(),
        xFrac: 0.5,
        yFrac: 0.5,
        color: '#808080',
        radius: DOT_RADIUS,
        repulsionSelf: DEFAULT_REPULSION,
        repulsionOthers: DEFAULT_REPULSION,
        forceRange: DEFAULT_FORCE_RANGE,
        dragCoefficient: DEFAULT_DRAG_COEFFICIENT,
        groupId: null,
        vx: 0,
        vy: 0,
    },
])
const groups = ref<DotGroup[]>([])
const selectedDotId = ref<string | null>(null)
const selectedGroupListId = ref<string | null>(null)
const draggingDotId = ref<string | null>(null)
const paused = ref(false)
const sidebarOpen = ref(false)
const undoState = ref<{ addedId: string; previousSelectedId: string | null } | null>(null)

const selectedDot = computed(() => dots.value.find((d) => d.id === selectedDotId.value) ?? null)

// O(1) group lookup instead of scanning the groups array with .find() — the
// basis for the once-per-frame trait precompute in physicsTick, so the hot
// physics loops never scan the groups array at all.
const groupsById = computed(() => {
    const map = new Map<string, DotGroup>()
    for (const g of groups.value) map.set(g.id, g)
    return map
})

// The group being edited: either the group of the specifically-selected dot,
// or a group selected directly from the Groups list (no particular dot).
const activeGroup = computed(() => {
    if (selectedGroupListId.value) {
        return groupsById.value.get(selectedGroupListId.value) ?? null
    }
    const groupId = selectedDot.value?.groupId
    if (!groupId) return null
    return groupsById.value.get(groupId) ?? null
})

// What DotCanvas rings: a specific clicked dot takes priority; otherwise,
// browsing a group in the list rings every one of its members.
const highlightedIds = computed<string[]>(() => {
    if (selectedDotId.value) return [selectedDotId.value]
    if (selectedGroupListId.value) {
        return dots.value.filter((d) => d.groupId === selectedGroupListId.value).map((d) => d.id)
    }
    return []
})

const renderDots = computed<RenderDot[]>(() =>
    dots.value.map((d) => ({
        id: d.id,
        xFrac: d.xFrac,
        yFrac: d.yFrac,
        color: resolveColor(d, groupsById.value),
        radius: resolveRadius(d, groupsById.value),
    })),
)

function onCanvasClick({ id, xFrac, yFrac }: { id: string | null; xFrac: number; yFrac: number }) {
    if (id) {
        selectedDotId.value = id
        selectedGroupListId.value = null
        return
    }

    // Missed every dot. If a group is currently being browsed, treat the
    // click as "add a dot of this group here" instead of deselecting it —
    // keeps the group selected so repeated clicks keep adding to it.
    if (selectedGroupListId.value) {
        const group = groupsById.value.get(selectedGroupListId.value)
        if (group) {
            const w = window.innerWidth
            const h = window.innerHeight
            const { xFrac: px, yFrac: py } = nearbyPosition(
                dots.value,
                xFrac,
                yFrac,
                group.radius,
                w,
                h,
                groupsById.value,
                undefined,
                true,
            )
            dots.value.push({
                id: makeId(),
                xFrac: px,
                yFrac: py,
                color: group.color,
                radius: group.radius,
                repulsionSelf: group.repulsionSelf,
                repulsionOthers: group.repulsionOthers,
                forceRange: group.forceRange,
                dragCoefficient: group.dragCoefficient,
                groupId: group.id,
                vx: 0,
                vy: 0,
            })
        }
        return
    }

    selectedDotId.value = null
}

// --- Drag -------------------------------------------------------------

function onDragStart(id: string) {
    draggingDotId.value = id
    const dot = dots.value.find((d) => d.id === id)
    if (dot) {
        dot.vx = 0
        dot.vy = 0
    }
}

function onDragMove({ id, xFrac, yFrac }: { id: string; xFrac: number; yFrac: number }) {
    const dot = dots.value.find((d) => d.id === id)
    if (!dot) return
    const w = window.innerWidth
    const h = window.innerHeight
    const r = resolveRadius(dot, groupsById.value)
    dot.xFrac = Math.min(w - r, Math.max(r, xFrac * w)) / w
    dot.yFrac = Math.min(h - r, Math.max(r, yFrac * h)) / h
}

function onDragEnd({ id, vx, vy }: { id: string; vx: number; vy: number }) {
    draggingDotId.value = null
    const dot = dots.value.find((d) => d.id === id)
    if (dot) {
        // While paused, a release shouldn't reintroduce motion — it stays
        // frozen wherever it's dropped until Play is pressed.
        dot.vx = paused.value ? 0 : vx
        dot.vy = paused.value ? 0 : vy
    }
}

// --- Play/pause: freezes every dot's velocity, remembering it so Play
// resumes with the exact same motion rather than a fresh start. -----------

let pausedVelocities: Map<string, { vx: number; vy: number }> | null = null

function togglePause() {
    if (paused.value) resume()
    else pause()
}

function pause() {
    if (paused.value) return
    const snapshot = new Map<string, { vx: number; vy: number }>()
    for (const dot of dots.value) {
        snapshot.set(dot.id, { vx: dot.vx, vy: dot.vy })
        dot.vx = 0
        dot.vy = 0
    }
    pausedVelocities = snapshot
    paused.value = true
}

function resume() {
    if (!paused.value) return
    if (pausedVelocities) {
        for (const dot of dots.value) {
            const saved = pausedVelocities.get(dot.id)
            if (saved) {
                dot.vx = saved.vx
                dot.vy = saved.vy
            }
        }
    }
    pausedVelocities = null
    paused.value = false
}

// --- Animation loop -----------------------------------------------------
// Dots store position as a fraction of the window so they stay put relative
// to the viewport on resize; physics itself runs in pixel space (window
// width/height match the canvas's backing size 1:1, same convention
// DotCanvas uses for rendering/hit-testing).

let rafId: number | null = null
let lastFrameTime = 0

function physicsTick(time: number) {
    const dt = lastFrameTime ? Math.min((time - lastFrameTime) / 1000, 0.05) : 0
    lastFrameTime = time

    if (dt > 0) {
        const list = dots.value
        // Group membership/properties don't change mid-frame, so resolve
        // each dot's effective radius/repulsion/range ONCE here (an O(n)
        // pass) instead of re-deriving them inside every pairwise check —
        // that used to mean a groups-array scan per property per pair,
        // which dominates the cost at a few hundred dots.
        const traits = list.map((d) => resolveTraits(d, groupsById.value))

        // A dot moving fast enough to cross more than its own radius in one
        // frame could skip clean past another dot without ever registering
        // as overlapping ("tunneling"). Sub-step so no single step moves
        // further than the smallest dot currently on screen. The same pass
        // also finds the biggest disc/collision reach present, which sizes
        // the spatial grid used to skip far-apart pairs entirely.
        let maxSpeed = 0
        let minRadius = DOT_RADIUS
        let maxReach = 0
        for (let i = 0; i < list.length; i++) {
            maxSpeed = Math.max(maxSpeed, Math.hypot(list[i].vx, list[i].vy))
            minRadius = Math.min(minRadius, traits[i].radius)
            maxReach = Math.max(maxReach, traits[i].radius * traits[i].forceRange, traits[i].radius * 2)
        }
        const cellSize = Math.max(maxReach, 20)

        const w = window.innerWidth
        const h = window.innerHeight
        const subSteps = Math.min(MAX_SUBSTEPS, Math.max(1, Math.ceil((maxSpeed * dt) / minRadius)))
        const subDt = dt / subSteps
        for (let i = 0; i < subSteps; i++) {
            stepPhysics(subDt, list, traits, cellSize, w, h, paused.value, draggingDotId.value)
        }
    }

    // Runs continuously rather than stopping when nothing's moving: the
    // repulsion force can set a resting dot in motion again the instant
    // another dot enters its disc (e.g. right after a spawn), and there's no
    // cheap way to know that in advance without just checking every frame —
    // for the dot counts this game deals with, that check is free anyway.
    rafId = requestAnimationFrame(physicsTick)
}

function startPhysics() {
    if (rafId === null) {
        lastFrameTime = 0
        rafId = requestAnimationFrame(physicsTick)
    }
}

function stopPhysics() {
    if (rafId !== null) {
        cancelAnimationFrame(rafId)
        rafId = null
    }
}

// --- Groups ---------------------------------------------------------------

function selectGroupList(groupId: string) {
    selectedGroupListId.value = selectedGroupListId.value === groupId ? null : groupId
    selectedDotId.value = null
}

function memberCount(groupId: string): number {
    return dots.value.filter((d) => d.groupId === groupId).length
}

// Promoting a still-default dot into its own group happens from the color,
// size, or either repulsion editor — whichever is touched first. The new
// group must capture ALL of the dot's current values, not just the one
// being edited, so the untouched properties don't silently reset.
function promoteToGroup(
    dot: Dot,
    overrides: {
        color?: string
        radius?: number
        repulsionSelf?: number
        repulsionOthers?: number
        forceRange?: number
        dragCoefficient?: number
    },
): DotGroup {
    const newGroup: DotGroup = {
        id: makeGroupId(),
        name: '',
        color: overrides.color ?? resolveColor(dot, groupsById.value),
        radius: overrides.radius ?? resolveRadius(dot, groupsById.value),
        repulsionSelf: overrides.repulsionSelf ?? resolveRepulsionSelf(dot, groupsById.value),
        repulsionOthers: overrides.repulsionOthers ?? resolveRepulsionOthers(dot, groupsById.value),
        forceRange: overrides.forceRange ?? resolveForceRange(dot, groupsById.value),
        dragCoefficient: overrides.dragCoefficient ?? resolveDragCoefficient(dot, groupsById.value),
    }
    groups.value.push(newGroup)
    dot.groupId = newGroup.id
    return newGroup
}

function pruneOrphanGroups() {
    const usedGroupIds = new Set(dots.value.map((d) => d.groupId).filter((id): id is string => id !== null))
    groups.value = groups.value.filter((g) => usedGroupIds.has(g.id))
    if (selectedGroupListId.value && !usedGroupIds.has(selectedGroupListId.value)) {
        selectedGroupListId.value = null
    }
}

// --- Selected-dot/group editable properties -------------------------------
// Each follows the same rule: editing a grouped dot (or a group selected
// directly from the list) updates the whole group; editing a still-default
// dot promotes it into a brand new group of its own.

const selectedColor = computed({
    get: () => {
        if (selectedDot.value) return resolveColor(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.color
        return '#808080'
    },
    set: (newColor: string) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.color = newColor
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.color = newColor
        } else {
            promoteToGroup(dot, { color: newColor })
        }
    },
})

const selectedSize = computed({
    get: () => {
        if (selectedDot.value) return resolveRadius(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.radius
        return DOT_RADIUS
    },
    set: (newRadius: number) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.radius = newRadius
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.radius = newRadius
        } else {
            promoteToGroup(dot, { radius: newRadius })
        }
    },
})

const selectedRepulsionSelf = computed({
    get: () => {
        if (selectedDot.value) return resolveRepulsionSelf(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.repulsionSelf
        return DEFAULT_REPULSION
    },
    set: (newRepulsion: number) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.repulsionSelf = newRepulsion
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.repulsionSelf = newRepulsion
        } else {
            promoteToGroup(dot, { repulsionSelf: newRepulsion })
        }
    },
})

const selectedRepulsionOthers = computed({
    get: () => {
        if (selectedDot.value) return resolveRepulsionOthers(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.repulsionOthers
        return DEFAULT_REPULSION
    },
    set: (newRepulsion: number) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.repulsionOthers = newRepulsion
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.repulsionOthers = newRepulsion
        } else {
            promoteToGroup(dot, { repulsionOthers: newRepulsion })
        }
    },
})

const selectedForceRange = computed({
    get: () => {
        if (selectedDot.value) return resolveForceRange(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.forceRange
        return DEFAULT_FORCE_RANGE
    },
    set: (newRange: number) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.forceRange = newRange
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.forceRange = newRange
        } else {
            promoteToGroup(dot, { forceRange: newRange })
        }
    },
})

const selectedDragCoefficient = computed({
    get: () => {
        if (selectedDot.value) return resolveDragCoefficient(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.dragCoefficient
        return DEFAULT_DRAG_COEFFICIENT
    },
    set: (newDrag: number) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.dragCoefficient = newDrag
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.dragCoefficient = newDrag
        } else {
            promoteToGroup(dot, { dragCoefficient: newDrag })
        }
    },
})

const groupNameProxy = computed({
    get: () => activeGroup.value?.name ?? '',
    set: (name: string) => {
        if (activeGroup.value) activeGroup.value.name = name
    },
})

// --- Add / copy / delete ----------------------------------------------

interface SpawnTraits {
    color: string
    radius: number
    repulsionSelf: number
    repulsionOthers: number
    forceRange: number
    dragCoefficient: number
    groupId: string | null
}

function spawnDot(xFrac: number, yFrac: number, traits: SpawnTraits) {
    const previousSelectedId = selectedDotId.value
    const newDot: Dot = { id: makeId(), xFrac, yFrac, ...traits, vx: 0, vy: 0 }
    dots.value.push(newDot)
    undoState.value = { addedId: newDot.id, previousSelectedId }
    selectedDotId.value = newDot.id
}

function addDot() {
    // A new dot is always its own fresh, default dot — even if copying the
    // selected dot's color/size/repulsion for convenience, it doesn't join
    // its group.
    const source = selectedDot.value
    const w = window.innerWidth
    const h = window.innerHeight
    const radius = source ? resolveRadius(source, groupsById.value) : DOT_RADIUS
    const { xFrac, yFrac } = randomPosition(dots.value, radius, w, h, groupsById.value)
    spawnDot(xFrac, yFrac, {
        color: source ? resolveColor(source, groupsById.value) : '#808080',
        radius,
        repulsionSelf: source ? resolveRepulsionSelf(source, groupsById.value) : DEFAULT_REPULSION,
        repulsionOthers: source ? resolveRepulsionOthers(source, groupsById.value) : DEFAULT_REPULSION,
        forceRange: source ? resolveForceRange(source, groupsById.value) : DEFAULT_FORCE_RANGE,
        dragCoefficient: source ? resolveDragCoefficient(source, groupsById.value) : DEFAULT_DRAG_COEFFICIENT,
        groupId: null,
    })
}

function copySelected() {
    const dot = selectedDot.value
    if (!dot) return
    // Copying a grouped dot joins the same group (linked color/size/repulsion
    // going forward); copying a still-default dot just makes another
    // independent default dot.
    const w = window.innerWidth
    const h = window.innerHeight
    const radius = resolveRadius(dot, groupsById.value)
    const { xFrac, yFrac } = nearbyPosition(dots.value, dot.xFrac, dot.yFrac, radius, w, h, groupsById.value, dot.id)
    spawnDot(xFrac, yFrac, {
        color: resolveColor(dot, groupsById.value),
        radius,
        repulsionSelf: resolveRepulsionSelf(dot, groupsById.value),
        repulsionOthers: resolveRepulsionOthers(dot, groupsById.value),
        forceRange: resolveForceRange(dot, groupsById.value),
        dragCoefficient: resolveDragCoefficient(dot, groupsById.value),
        groupId: dot.groupId,
    })
}

function addToGroup(groupId: string) {
    // Deliberately doesn't touch selection (unlike spawnDot): stays on the
    // group being browsed instead of jumping focus to the new dot, so the
    // list, its highlight, and this button all stay put.
    const group = groupsById.value.get(groupId)
    if (!group) return
    const w = window.innerWidth
    const h = window.innerHeight
    // Spawn next to an existing member (not just anywhere on the canvas) so
    // it lands within the group's own force range — otherwise "own group
    // force" has nothing to act on until the dots happen to be dragged close.
    const anchor = dots.value.find((d) => d.groupId === groupId)
    const { xFrac, yFrac } = anchor
        ? nearbyPosition(dots.value, anchor.xFrac, anchor.yFrac, group.radius, w, h, groupsById.value)
        : randomPosition(dots.value, group.radius, w, h, groupsById.value)
    dots.value.push({
        id: makeId(),
        xFrac,
        yFrac,
        color: group.color,
        radius: group.radius,
        repulsionSelf: group.repulsionSelf,
        repulsionOthers: group.repulsionOthers,
        forceRange: group.forceRange,
        dragCoefficient: group.dragCoefficient,
        groupId,
        vx: 0,
        vy: 0,
    })
}

function undoAdd() {
    const undo = undoState.value
    if (!undo) return
    dots.value = dots.value.filter((d) => d.id !== undo.addedId)
    selectedDotId.value = dots.value.some((d) => d.id === undo.previousSelectedId) ? undo.previousSelectedId : null
    undoState.value = null
    pruneOrphanGroups()
}

function deleteSelected() {
    const dot = selectedDot.value
    if (!dot) return
    dots.value = dots.value.filter((d) => d.id !== dot.id)
    if (undoState.value?.addedId === dot.id) undoState.value = null
    selectedDotId.value = dots.value.length > 0 ? dots.value[Math.floor(Math.random() * dots.value.length)].id : null
    pruneOrphanGroups()
}

export function useDotSimulation() {
    return {
        // State
        dots,
        groups,
        selectedDotId,
        selectedGroupListId,
        paused,
        sidebarOpen,
        undoState,
        // Derived
        selectedDot,
        activeGroup,
        highlightedIds,
        renderDots,
        selectedColor,
        selectedSize,
        selectedRepulsionSelf,
        selectedRepulsionOthers,
        selectedForceRange,
        selectedDragCoefficient,
        groupNameProxy,
        // Canvas input
        onCanvasClick,
        onDragStart,
        onDragMove,
        onDragEnd,
        // Playback
        togglePause,
        startPhysics,
        stopPhysics,
        // Groups
        selectGroupList,
        memberCount,
        // Inventory actions
        addDot,
        copySelected,
        addToGroup,
        undoAdd,
        deleteSelected,
    }
}
