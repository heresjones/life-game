// Owns all reactive dot/group state plus the animation loop that drives it.
// Module-level (not created inside the exported function), so every call to
// useDotSimulation() — from app.vue or any sidebar component — shares the
// exact same state; there's only ever one simulation on screen.
import type { Dot, DotGroup, RenderDot } from '~/helpers/dot'
import {
    DOT_RADIUS,
    DEFAULT_CLOSE_FORCE,
    DEFAULT_FAR_FORCE,
    DEFAULT_CLOSE_RANGE,
    DEFAULT_FAR_RANGE,
    DEFAULT_DRAG_COEFFICIENT,
    DEFAULT_DOT_COLOR,
    GROUP_COLOR_PALETTE,
} from '~/helpers/dot'
import {
    MAX_SUBSTEPS,
    resolveColor,
    resolveRadius,
    resolveCloseSelf,
    resolveFarSelf,
    resolveCloseRange,
    resolveFarRange,
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

// shallowRef, not ref: the physics loop mutates xFrac/yFrac/vx/vy on every
// dot, every sub-step, every frame. A deep-reactive ref would wrap every dot
// in a Proxy and pay tracking/trigger overhead on each of those writes —
// multiplied by dot count and up to MAX_SUBSTEPS, 60 times a second. With
// shallowRef, dot objects are plain (no Proxy), so the hot physics path is
// just ordinary property writes; nothing here is reactive to Vue by
// default. Anything that needs the rest of the app to notice a change
// (adding/removing a dot, a dot's groupId changing) calls triggerRef(dots)
// explicitly — see spawnDot/addToGroup/promoteToGroup/onCanvasClick below.
// Reassigning dots.value itself (undoAdd, deleteSelected) still triggers
// automatically, same as any ref.
const dots = shallowRef<Dot[]>([
    {
        id: makeId(),
        xFrac: 0.5,
        yFrac: 0.5,
        color: DEFAULT_DOT_COLOR,
        radius: DOT_RADIUS,
        closeSelf: DEFAULT_CLOSE_FORCE,
        farSelf: DEFAULT_FAR_FORCE,
        closeRange: DEFAULT_CLOSE_RANGE,
        farRange: DEFAULT_FAR_RANGE,
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

// Deliberately a plain function, not a computed: with dots as a shallowRef,
// nothing marks this "dirty" as positions change every physics frame (that's
// the point — see the comment on `dots` above). The animation loop below
// calls this directly, every frame, to get a fresh snapshot for drawing.
function getRenderDots(): RenderDot[] {
    return dots.value.map((d) => ({
        id: d.id,
        xFrac: d.xFrac,
        yFrac: d.yFrac,
        color: resolveColor(d, groupsById.value),
        radius: resolveRadius(d, groupsById.value),
    }))
}

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
                closeSelf: group.closeSelf,
                farSelf: group.farSelf,
                closeRange: group.closeRange,
                farRange: group.farRange,
                dragCoefficient: group.dragCoefficient,
                groupId: group.id,
                vx: 0,
                vy: 0,
            })
            triggerRef(dots) // structural change (new dot) — dots is a shallowRef, see above
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
// Set by startPhysics. Called at the end of every tick, paused or not, so
// drag/highlight/selection changes show up on the very next frame without
// needing a Vue watcher on top of this loop — see DotCanvas.redraw().
let onFrame: (() => void) | null = null

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
        // frame could skip clean past another dot's force field without ever
        // registering as being inside it ("tunneling"). Sub-step so no single
        // step moves further than the smallest dot currently on screen. The
        // same pass also finds the biggest force reach present, which sizes
        // the spatial grid used to skip far-apart pairs entirely.
        let maxSpeed = 0
        let minRadius = DOT_RADIUS
        let maxReach = 0
        for (let i = 0; i < list.length; i++) {
            maxSpeed = Math.max(maxSpeed, Math.hypot(list[i].vx, list[i].vy))
            minRadius = Math.min(minRadius, traits[i].radius)
            // A per-group override can have its own closeRange/farRange, possibly
            // bigger than the group's own — the grid has to be sized to the
            // largest reach actually in play, override or not.
            let ownZoneSpan = traits[i].closeRange + traits[i].farRange
            for (const override of traits[i].targetOverrides) {
                ownZoneSpan = Math.max(ownZoneSpan, override.closeRange + override.farRange)
            }
            maxReach = Math.max(maxReach, traits[i].radius * ownZoneSpan, traits[i].radius * 2)
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
    onFrame?.()
    rafId = requestAnimationFrame(physicsTick)
}

// onFrameCallback fires once per tick, after the physics step — app.vue
// passes in a callback that pulls a fresh getRenderDots() snapshot and hands
// it straight to DotCanvas's imperative redraw(), bypassing Vue's reactivity
// for the render path entirely (see the `dots` shallowRef comment above).
function startPhysics(onFrameCallback?: () => void) {
    onFrame = onFrameCallback ?? null
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
    onFrame = null
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
        closeSelf?: number
        farSelf?: number
        closeRange?: number
        farRange?: number
        dragCoefficient?: number
    },
): DotGroup {
    // Promoting via the color editor carries that exact color over. Promoting
    // via anything else (a force slider, etc.) picks a fresh palette color
    // instead of whatever the dot's own .color happens to currently hold —
    // that's never a deliberate choice for THIS new group, since the only way
    // to deliberately set a still-ungrouped dot's color is the color editor,
    // which always supplies overrides.color itself. Any other value there is
    // just inherited from Add Dot's "copy the selected dot" convenience, and
    // reusing it would make every group created that way collapse onto the
    // same handful of colors — indistinguishable from each other, most
    // confusingly in the per-group override list below.
    const newGroup: DotGroup = {
        id: makeGroupId(),
        name: '',
        color: overrides.color ?? GROUP_COLOR_PALETTE[groups.value.length % GROUP_COLOR_PALETTE.length],
        radius: overrides.radius ?? resolveRadius(dot, groupsById.value),
        closeSelf: overrides.closeSelf ?? resolveCloseSelf(dot, groupsById.value),
        farSelf: overrides.farSelf ?? resolveFarSelf(dot, groupsById.value),
        targetOverrides: [],
        closeRange: overrides.closeRange ?? resolveCloseRange(dot, groupsById.value),
        farRange: overrides.farRange ?? resolveFarRange(dot, groupsById.value),
        dragCoefficient: overrides.dragCoefficient ?? resolveDragCoefficient(dot, groupsById.value),
    }
    groups.value.push(newGroup)
    dot.groupId = newGroup.id
    triggerRef(dots) // groupId changed on an existing dot object — dots is a shallowRef, see above
    return newGroup
}

function pruneOrphanGroups() {
    const usedGroupIds = new Set(dots.value.map((d) => d.groupId).filter((id): id is string => id !== null))
    groups.value = groups.value.filter((g) => usedGroupIds.has(g.id))
    // A group that just got pruned might still be some OTHER group's override
    // target — drop those too, or they'd silently point at nothing.
    for (const g of groups.value) {
        g.targetOverrides = g.targetOverrides.filter((o) => usedGroupIds.has(o.targetGroupId))
    }
    if (selectedGroupListId.value && !usedGroupIds.has(selectedGroupListId.value)) {
        selectedGroupListId.value = null
    }
}

// --- Per-target-group overrides --------------------------------------------
// A group's only way to exert force on another specific group — without an
// override for it, the two groups don't interact via soft force at all
// (e.g. add an override to attract group B specifically, while everything
// else stays completely neutral by default).

const overridableGroups = computed<DotGroup[]>(() => {
    if (!activeGroup.value) return []
    const overriddenIds = new Set(activeGroup.value.targetOverrides.map((o) => o.targetGroupId))
    return groups.value.filter((g) => g.id !== activeGroup.value!.id && !overriddenIds.has(g.id))
})

function addTargetOverride(targetGroupId: string) {
    const group = activeGroup.value
    if (!group || group.id === targetGroupId) return
    if (group.targetOverrides.some((o) => o.targetGroupId === targetGroupId)) return
    group.targetOverrides.push({
        targetGroupId,
        close: DEFAULT_CLOSE_FORCE,
        far: DEFAULT_FAR_FORCE,
        closeRange: DEFAULT_CLOSE_RANGE,
        farRange: DEFAULT_FAR_RANGE,
    })
}

function removeTargetOverride(targetGroupId: string) {
    const group = activeGroup.value
    if (!group) return
    group.targetOverrides = group.targetOverrides.filter((o) => o.targetGroupId !== targetGroupId)
}

// --- Selected-dot/group editable properties -------------------------------
// Each follows the same rule: editing a grouped dot (or a group selected
// directly from the list) updates the whole group; editing a still-default
// dot promotes it into a brand new group of its own.

const selectedColor = computed({
    get: () => {
        if (selectedDot.value) return resolveColor(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.color
        return DEFAULT_DOT_COLOR
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

const selectedCloseSelf = computed({
    get: () => {
        if (selectedDot.value) return resolveCloseSelf(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.closeSelf
        return DEFAULT_CLOSE_FORCE
    },
    set: (newValue: number) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.closeSelf = newValue
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.closeSelf = newValue
        } else {
            promoteToGroup(dot, { closeSelf: newValue })
        }
    },
})

const selectedFarSelf = computed({
    get: () => {
        if (selectedDot.value) return resolveFarSelf(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.farSelf
        return DEFAULT_FAR_FORCE
    },
    set: (newValue: number) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.farSelf = newValue
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.farSelf = newValue
        } else {
            promoteToGroup(dot, { farSelf: newValue })
        }
    },
})

const selectedCloseRange = computed({
    get: () => {
        if (selectedDot.value) return resolveCloseRange(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.closeRange
        return DEFAULT_CLOSE_RANGE
    },
    set: (newRange: number) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.closeRange = newRange
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.closeRange = newRange
        } else {
            promoteToGroup(dot, { closeRange: newRange })
        }
    },
})

const selectedFarRange = computed({
    get: () => {
        if (selectedDot.value) return resolveFarRange(selectedDot.value, groupsById.value)
        if (activeGroup.value) return activeGroup.value.farRange
        return DEFAULT_FAR_RANGE
    },
    set: (newRange: number) => {
        if (!selectedDot.value && activeGroup.value) {
            activeGroup.value.farRange = newRange
            return
        }
        const dot = selectedDot.value
        if (!dot) return
        if (dot.groupId) {
            const group = groupsById.value.get(dot.groupId)
            if (group) group.farRange = newRange
        } else {
            promoteToGroup(dot, { farRange: newRange })
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
    closeSelf: number
    farSelf: number
    closeRange: number
    farRange: number
    dragCoefficient: number
    groupId: string | null
}

function spawnDot(xFrac: number, yFrac: number, traits: SpawnTraits) {
    const previousSelectedId = selectedDotId.value
    const newDot: Dot = { id: makeId(), xFrac, yFrac, ...traits, vx: 0, vy: 0 }
    dots.value.push(newDot)
    triggerRef(dots) // structural change (new dot) — dots is a shallowRef, see above
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
        color: source ? resolveColor(source, groupsById.value) : DEFAULT_DOT_COLOR,
        radius,
        closeSelf: source ? resolveCloseSelf(source, groupsById.value) : DEFAULT_CLOSE_FORCE,
        farSelf: source ? resolveFarSelf(source, groupsById.value) : DEFAULT_FAR_FORCE,
        closeRange: source ? resolveCloseRange(source, groupsById.value) : DEFAULT_CLOSE_RANGE,
        farRange: source ? resolveFarRange(source, groupsById.value) : DEFAULT_FAR_RANGE,
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
        closeSelf: resolveCloseSelf(dot, groupsById.value),
        farSelf: resolveFarSelf(dot, groupsById.value),
        closeRange: resolveCloseRange(dot, groupsById.value),
        farRange: resolveFarRange(dot, groupsById.value),
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
    // it lands within the group's own close/far range — otherwise "own
    // close/far force" has nothing to act on until the dots are dragged close.
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
        closeSelf: group.closeSelf,
        farSelf: group.farSelf,
        closeRange: group.closeRange,
        farRange: group.farRange,
        dragCoefficient: group.dragCoefficient,
        groupId,
        vx: 0,
        vy: 0,
    })
    triggerRef(dots) // structural change (new dot) — dots is a shallowRef, see above
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
        getRenderDots,
        selectedColor,
        selectedSize,
        selectedCloseSelf,
        selectedFarSelf,
        selectedCloseRange,
        selectedFarRange,
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
        overridableGroups,
        addTargetOverride,
        removeTargetOverride,
        // Inventory actions
        addDot,
        copySelected,
        addToGroup,
        undoAdd,
        deleteSelected,
    }
}
