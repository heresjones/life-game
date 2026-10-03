// Framework-agnostic simulation core: wall/friction integration and the
// repulsion/attraction force field. Dots have no hard physical body — there
// is no dot-dot collision here, only the soft close/far force curve (see
// repulsionForceAt below). Nothing in this file touches Vue — it's plain
// functions over plain data (Dot[], DotGroup[]), so it can be reasoned
// about, tuned, and (eventually) unit-tested in isolation from the
// reactive/UI layer. See composables/useDotSimulation.ts for the
// Vue-specific wiring that calls into this each frame.
import type { Dot, DotGroup, TargetOverride } from './dot'

export interface ResolvedTraits {
    radius: number
    closeSelf: number
    farSelf: number
    targetOverrides: TargetOverride[]
    closeRange: number
    farRange: number
    dragCoefficient: number
}

// Shared instance for the common case (ungrouped dot, or a group with no
// overrides set) so resolving traits doesn't allocate a fresh empty array
// for every dot on every frame.
const NO_OVERRIDES: TargetOverride[] = []

// --- Group resolution --------------------------------------------------
// A dot with no group uses its own color/size/repulsion/range; a grouped
// dot shares all of them with every other member. groupsById is a Map (not
// a plain array + .find()) specifically so the hot per-frame paths below
// never do a linear scan over the groups list.

export function resolveColor(dot: Dot, groupsById: Map<string, DotGroup>): string {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.color
    }
    return dot.color
}

export function resolveRadius(dot: Dot, groupsById: Map<string, DotGroup>): number {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.radius
    }
    return dot.radius
}

export function resolveCloseSelf(dot: Dot, groupsById: Map<string, DotGroup>): number {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.closeSelf
    }
    return dot.closeSelf
}

export function resolveFarSelf(dot: Dot, groupsById: Map<string, DotGroup>): number {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.farSelf
    }
    return dot.farSelf
}

// Only a grouped dot can have per-target overrides — an ungrouped dot has no
// group identity yet for another group to be overridden against.
export function resolveTargetOverrides(dot: Dot, groupsById: Map<string, DotGroup>): TargetOverride[] {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.targetOverrides
    }
    return NO_OVERRIDES
}

export function resolveCloseRange(dot: Dot, groupsById: Map<string, DotGroup>): number {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.closeRange
    }
    return dot.closeRange
}

export function resolveFarRange(dot: Dot, groupsById: Map<string, DotGroup>): number {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.farRange
    }
    return dot.farRange
}

export function resolveDragCoefficient(dot: Dot, groupsById: Map<string, DotGroup>): number {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.dragCoefficient
    }
    return dot.dragCoefficient
}

export function resolveTraits(dot: Dot, groupsById: Map<string, DotGroup>): ResolvedTraits {
    const group = dot.groupId ? groupsById.get(dot.groupId) : undefined
    if (group) {
        return {
            radius: group.radius,
            closeSelf: group.closeSelf,
            farSelf: group.farSelf,
            targetOverrides: group.targetOverrides,
            closeRange: group.closeRange,
            farRange: group.farRange,
            dragCoefficient: group.dragCoefficient,
        }
    }
    return {
        radius: dot.radius,
        closeSelf: dot.closeSelf,
        farSelf: dot.farSelf,
        targetOverrides: NO_OVERRIDES,
        closeRange: dot.closeRange,
        farRange: dot.farRange,
        dragCoefficient: dot.dragCoefficient,
    }
}

// --- Tuning constants ----------------------------------------------------

export const STOP_SPEED = 15 // px/s below which a dot is considered at rest
export const WALL_RESTITUTION = 0.35 // fraction of speed kept after bouncing off a wall — a soft bounce, not a superball
export const MAX_SUBSTEPS = 8
// Dots have no hard physical body — nothing stops them from fully
// overlapping or passing through each other. Spacing between dots comes
// entirely from the close/far force curve below (or from nothing at all, if
// there's no force between them). MIN_SPAWN_GAP is unrelated to that — it
// only keeps a freshly spawned/copied dot from landing exactly on top of an
// existing one, which would make them indistinguishable at the moment of
// creation regardless of what happens to them physically afterward.
export const MIN_SPAWN_GAP = 0.65 // fraction of combined radii
export const SPAWN_PADDING = 0.1 // fraction of screen kept clear along each edge when placing a new dot

export function clampToWalls(px: number, maxPx: number, radius: number): number {
    return Math.min(maxPx - radius, Math.max(radius, px))
}

export function spawnMinDist(radiusA: number, radiusB: number): number {
    return (radiusA + radiusB) * MIN_SPAWN_GAP
}

// --- Repulsion / attraction force field -----------------------------------
// A soft force field around each dot — the ONLY thing governing spacing
// between dots, since there's no hard collision body. CLOSE is an inner
// disc; FAR is a ring just beyond it. Each has its OWN reach (closeRange/
// farRange, a multiple of the dot's own visual size — separate knobs from
// strength), so one can be much bigger than the other:
//
//        ┌───────────── farRange ─────────────┐
//        ┌── closeRange ──┐
//   ─────┼────────────────┼──────────────────┼─────  distance from center
//        0            (close edge)      (far edge)
//        │←── CLOSE zone ─→│←──── FAR zone ────→│
//      force                                  force
//    -> ∞ near both        peak at            = 0
//    ends (see below)   boundary, = 2     (outer edge)
//      (contact)    (zone boundary)
//
// Far can push or pull; within its zone the force follows one ripple of a
// cosine wave shifted up by one — starting at its peak of 2 right at the
// close/far boundary and easing back to zero at its own outer edge. That
// shape is what makes it bounded (no divide-by-zero blowup) while still
// landing at zero at the outer edge.
//
// Close is always repulsive, and — per Evan's design — uses a DIFFERENT,
// unbounded falloff: 1 / (t * sqrt(1 - t^2)), t ∈ (0, 1) being how far
// through the close zone (0 = contact, 1 = the close/far boundary). Unlike
// the far zone's cosine ripple, this spikes toward infinity at BOTH ends —
// at contact and again right at the close/far boundary — rather than
// settling to zero. t is clamped a hair inside (0, 1) purely so a dot at
// (near-)exact contact or (near-)exact zone-boundary distance can't produce
// an actual Infinity/NaN force, which would permanently corrupt its
// vx/vy (nothing ever resets a NaN position) — the clamp caps the peak
// magnitude, it doesn't change the curve's shape.
const CLOSE_ENVELOPE_EPSILON = 0.001

// t ∈ [0, 1]: how far through THIS zone (not the whole disc).
function closeEnvelopeAt(t: number): number {
    const x = Math.min(1 - CLOSE_ENVELOPE_EPSILON, Math.max(CLOSE_ENVELOPE_EPSILON, t))
    return 1 / (x * Math.sqrt(1 - x * x))
}

function farEnvelopeAt(t: number): number {
    return 1 + Math.cos(Math.PI * t)
}

export function repulsionForceAt(
    closeStrength: number,
    farStrength: number,
    dist: number,
    closeRangePx: number,
    farRangePx: number,
): number {
    if (dist <= 0) return 0
    if (dist < closeRangePx) {
        if (closeStrength === 0) return 0
        return closeStrength * closeEnvelopeAt(dist / closeRangePx)
    }
    const farEdge = closeRangePx + farRangePx
    if (dist < farEdge) {
        if (farStrength === 0) return 0
        return farStrength * farEnvelopeAt((dist - closeRangePx) / farRangePx)
    }
    return 0
}

// --- Spatial grid broad-phase ---------------------------------------------
// Rebuilt each sub-step from current positions. Any two dots that could
// possibly interact (via the repulsion/attraction force field) are
// guaranteed to end up in the same cell or an adjacent one, as long as
// cellSize >= the largest interaction distance present (the caller computes
// that bound each frame). Cells are visited with only "forward" neighbor
// offsets (right / up / up-right / up-left) so every cell-pair in the grid
// is covered exactly once, with no need to de-dupe.

const GRID_FORWARD_OFFSETS: [number, number][] = [
    [1, 0],
    [0, 1],
    [1, 1],
    [-1, 1],
]

export function forEachNearbyPair(
    list: Dot[],
    cellSize: number,
    w: number,
    h: number,
    callback: (i: number, j: number) => void,
) {
    const cols = Math.max(1, Math.ceil(w / cellSize))
    const grid = new Map<number, number[]>()

    for (let i = 0; i < list.length; i++) {
        const cx = Math.floor((list[i].xFrac * w) / cellSize)
        const cy = Math.floor((list[i].yFrac * h) / cellSize)
        const key = cy * cols + cx
        let bucket = grid.get(key)
        if (!bucket) {
            bucket = []
            grid.set(key, bucket)
        }
        bucket.push(i)
    }

    for (const [key, bucket] of grid) {
        const cy = Math.floor(key / cols)
        const cx = key - cy * cols

        for (let a = 0; a < bucket.length; a++) {
            for (let b = a + 1; b < bucket.length; b++) {
                callback(bucket[a], bucket[b])
            }
        }

        for (const [dx, dy] of GRID_FORWARD_OFFSETS) {
            const ncx = cx + dx
            if (ncx < 0 || ncx >= cols) continue // avoid wrapping into an unrelated cell's key
            const neighborBucket = grid.get((cy + dy) * cols + ncx)
            if (!neighborBucket) continue
            for (const i of bucket) {
                for (const j of neighborBucket) {
                    callback(i, j)
                }
            }
        }
    }
}

interface Interaction {
    close: number
    far: number
    closeRange: number
    farRange: number
}

// A dot's close/far strength AND reach against a specific other dot: its
// per-target override for that dot's group, if it has one — both strength
// and range come from the override, not the group's own closeRange/farRange,
// so a group's reach toward one specific other group can differ from its
// reach toward its own members. With no override, there's no generic
// "others" fallback, so two groups with no override between them (or
// anything involving an ungrouped dot) simply don't exert soft force on each
// other — the range values don't matter then since strength is zero, and
// with no hard collision body, they simply overlap freely.
function otherInteractionAt(traits: ResolvedTraits, otherGroupId: string | null): Interaction {
    if (otherGroupId) {
        for (const override of traits.targetOverrides) {
            if (override.targetGroupId === otherGroupId) {
                return { close: override.close, far: override.far, closeRange: override.closeRange, farRange: override.farRange }
            }
        }
    }
    return { close: 0, far: 0, closeRange: traits.closeRange, farRange: traits.farRange }
}

export function applyRepulsion(
    list: Dot[],
    traits: ResolvedTraits[],
    cellSize: number,
    w: number,
    h: number,
    dt: number,
    draggingDotId: string | null,
): Set<string> {
    const pushed = new Set<string>()
    forEachNearbyPair(list, cellSize, w, h, (i, j) => {
        const a = list[i]
        const b = list[j]
        const ta = traits[i]
        const tb = traits[j]
        const dx = b.xFrac * w - a.xFrac * w
        const dy = b.yFrac * h - a.yFrac * h
        const dist = Math.hypot(dx, dy) || 0.0001
        const nx = dx / dist
        const ny = dy / dist

        // Each dot is its own force source: a dot can be pushed (or pulled)
        // by any neighbor with a nonzero close/far strength, regardless of
        // its own. Which strength/range pair applies depends on whether the
        // OTHER dot is in its same group ("self", using its own
        // closeRange/farRange) or a group it has a specific override for
        // (using THAT override's own range) — anything else exerts no force.
        const sameGroup = a.groupId !== null && a.groupId === b.groupId
        const aInteraction: Interaction = sameGroup
            ? { close: ta.closeSelf, far: ta.farSelf, closeRange: ta.closeRange, farRange: ta.farRange }
            : otherInteractionAt(ta, b.groupId)
        const bInteraction: Interaction = sameGroup
            ? { close: tb.closeSelf, far: tb.farSelf, closeRange: tb.closeRange, farRange: tb.farRange }
            : otherInteractionAt(tb, a.groupId)
        const force =
            repulsionForceAt(
                aInteraction.close,
                aInteraction.far,
                dist,
                ta.radius * aInteraction.closeRange,
                ta.radius * aInteraction.farRange,
            ) +
            repulsionForceAt(
                bInteraction.close,
                bInteraction.far,
                dist,
                tb.radius * bInteraction.closeRange,
                tb.radius * bInteraction.farRange,
            )
        if (force === 0) return // negative force is attraction, still very much "active"

        const aFixed = a.id === draggingDotId
        const bFixed = b.id === draggingDotId
        if (!aFixed) {
            a.vx -= nx * force * dt
            a.vy -= ny * force * dt
            pushed.add(a.id)
        }
        if (!bFixed) {
            b.vx += nx * force * dt
            b.vy += ny * force * dt
            pushed.add(b.id)
        }
    })
    return pushed
}

// --- Per-substep integration -----------------------------------------------

export function stepPhysics(
    dt: number,
    list: Dot[],
    traits: ResolvedTraits[],
    cellSize: number,
    w: number,
    h: number,
    paused: boolean,
    draggingDotId: string | null,
) {
    // While paused, nothing should start moving on its own — no friction
    // glide, no repulsion push.
    if (!paused) {
        // Apply forces first, so a dot currently being pushed carries that
        // velocity into this frame's integration below (and isn't zeroed by
        // the at-rest check before it has a chance to build up any speed).
        const pushed = applyRepulsion(list, traits, cellSize, w, h, dt, draggingDotId)

        for (let i = 0; i < list.length; i++) {
            const dot = list[i]
            if (dot.id === draggingDotId) continue // pointer is driving this one directly

            const r = traits[i].radius
            let x = dot.xFrac * w + dot.vx * dt
            let y = dot.yFrac * h + dot.vy * dt
            // Per-dot drag: (1 - dragCoefficient) is the fraction of speed
            // retained each second, raised to dt so it's frame-rate independent.
            const damping = (1 - traits[i].dragCoefficient) ** dt
            dot.vx *= damping
            dot.vy *= damping
            // Only snap a dot to rest if nothing is actively pushing it —
            // otherwise a gentle, sub-STOP_SPEED repulsion force would get
            // erased every single frame before it could ever accumulate.
            if (!pushed.has(dot.id) && Math.hypot(dot.vx, dot.vy) < STOP_SPEED) {
                dot.vx = 0
                dot.vy = 0
            }

            if (x < r || x > w - r) dot.vx = -dot.vx * WALL_RESTITUTION
            if (y < r || y > h - r) dot.vy = -dot.vy * WALL_RESTITUTION
            x = clampToWalls(x, w, r)
            y = clampToWalls(y, h, r)

            dot.xFrac = x / w
            dot.yFrac = y / h
        }
    }
}

// --- Spawn placement: new/copied dots must never overlap an existing one ---

export function overlapsAny(
    list: Dot[],
    xFrac: number,
    yFrac: number,
    radius: number,
    w: number,
    h: number,
    groupsById: Map<string, DotGroup>,
    excludeId?: string,
): boolean {
    const x = xFrac * w
    const y = yFrac * h
    return list.some((d) => {
        if (d.id === excludeId) return false
        return Math.hypot(d.xFrac * w - x, d.yFrac * h - y) < spawnMinDist(resolveRadius(d, groupsById), radius)
    })
}

export function randomPosition(
    list: Dot[],
    radius: number,
    w: number,
    h: number,
    groupsById: Map<string, DotGroup>,
): { xFrac: number; yFrac: number } {
    for (let attempt = 0; attempt < 60; attempt++) {
        const xFrac = SPAWN_PADDING + Math.random() * (1 - 2 * SPAWN_PADDING)
        const yFrac = SPAWN_PADDING + Math.random() * (1 - 2 * SPAWN_PADDING)
        if (!overlapsAny(list, xFrac, yFrac, radius, w, h, groupsById)) return { xFrac, yFrac }
    }
    // Canvas is packed tight — give up and place it wherever, rather than loop forever.
    return {
        xFrac: SPAWN_PADDING + Math.random() * (1 - 2 * SPAWN_PADDING),
        yFrac: SPAWN_PADDING + Math.random() * (1 - 2 * SPAWN_PADDING),
    }
}

export function nearbyPosition(
    list: Dot[],
    centerXFrac: number,
    centerYFrac: number,
    radius: number,
    w: number,
    h: number,
    groupsById: Map<string, DotGroup>,
    excludeId?: string,
    tryExact = false,
): { xFrac: number; yFrac: number } {
    if (tryExact && !overlapsAny(list, centerXFrac, centerYFrac, radius, w, h, groupsById, excludeId)) {
        return { xFrac: centerXFrac, yFrac: centerYFrac }
    }
    for (let attempt = 0; attempt < 20; attempt++) {
        const angle = Math.random() * Math.PI * 2
        const dist = (radius * 2 + 4) * (1 + attempt * 0.5)
        const xFrac = clampToWalls(centerXFrac * w + Math.cos(angle) * dist, w, radius) / w
        const yFrac = clampToWalls(centerYFrac * h + Math.sin(angle) * dist, h, radius) / h
        if (!overlapsAny(list, xFrac, yFrac, radius, w, h, groupsById, excludeId)) return { xFrac, yFrac }
    }
    return randomPosition(list, radius, w, h, groupsById)
}
