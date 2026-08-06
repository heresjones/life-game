// Framework-agnostic simulation core: wall/friction integration, dot-dot
// collision, and the repulsion/attraction force field. Nothing in this file
// touches Vue — it's plain functions over plain data (Dot[], DotGroup[]),
// so it can be reasoned about, tuned, and (eventually) unit-tested in
// isolation from the reactive/UI layer. See composables/useDotSimulation.ts
// for the Vue-specific wiring that calls into this each frame.
import type { Dot, DotGroup } from './dot'

export interface ResolvedTraits {
    radius: number
    repulsionSelf: number
    repulsionOthers: number
    forceRange: number
    dragCoefficient: number
}

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

export function resolveRepulsionSelf(dot: Dot, groupsById: Map<string, DotGroup>): number {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.repulsionSelf
    }
    return dot.repulsionSelf
}

export function resolveRepulsionOthers(dot: Dot, groupsById: Map<string, DotGroup>): number {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.repulsionOthers
    }
    return dot.repulsionOthers
}

export function resolveForceRange(dot: Dot, groupsById: Map<string, DotGroup>): number {
    if (dot.groupId) {
        const group = groupsById.get(dot.groupId)
        if (group) return group.forceRange
    }
    return dot.forceRange
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
            repulsionSelf: group.repulsionSelf,
            repulsionOthers: group.repulsionOthers,
            forceRange: group.forceRange,
            dragCoefficient: group.dragCoefficient,
        }
    }
    return {
        radius: dot.radius,
        repulsionSelf: dot.repulsionSelf,
        repulsionOthers: dot.repulsionOthers,
        forceRange: dot.forceRange,
        dragCoefficient: dot.dragCoefficient,
    }
}

// --- Tuning constants ----------------------------------------------------

export const STOP_SPEED = 15 // px/s below which a dot is considered at rest
export const WALL_RESTITUTION = 0.35 // fraction of speed kept after bouncing off a wall — a soft bounce, not a superball
// Dot-dot collisions lose some energy too, not just walls — otherwise a dot that
// plunges in fast (e.g. a hard throw, or the near-contact singularity of a strong
// attraction force) bounces back out at very close to the same speed it came in
// with, which is enough to escape a finite-range attraction disc for good instead
// of settling into a cluster.
export const COLLISION_RESTITUTION = 0.5
export const MAX_SUBSTEPS = 8
// Keeps x away from 0 so the repulsion formula doesn't divide by zero — this
// alone already bounds the force (strength * sqrt(1-MIN_X)/MIN_X), so there's
// no separate cap on top of it capping things prematurely at high strength.
export const REPULSION_MIN_X = 0.02
// The color a dot renders isn't a hard shell — it's more of a soft field, so
// two dots are allowed to nestle into each other by this fraction of their
// combined radius before the hard collision stops them going any further.
export const OVERLAP_ALLOWANCE = 0.15
export const SPAWN_PADDING = 0.1

export function clampToWalls(px: number, maxPx: number, radius: number): number {
    return Math.min(maxPx - radius, Math.max(radius, px))
}

export function collisionMinDist(radiusA: number, radiusB: number): number {
    return (radiusA + radiusB) * (1 - OVERLAP_ALLOWANCE)
}

// --- Repulsion / attraction force field -----------------------------------
// A soft force field around each dot — its own "disc" hitbox, a multiple of
// its visual size (forceRange, a separate knob from strength) — independent
// of the hard no-overlap collision below. Force falls off from very strong
// near the center to zero at the disc's edge: f(x) = sqrt(1-x)/x, x =
// distance / discRadius. Strength can go negative, which flips this from a
// push into a pull (attraction) — the sign just flows straight through.

export function repulsionForceAt(strength: number, x: number): number {
    if (strength === 0) return 0
    const xc = Math.max(x, REPULSION_MIN_X)
    const magnitude = Math.sqrt(1 - xc) / xc
    return strength * magnitude
}

// --- Spatial grid broad-phase ---------------------------------------------
// Rebuilt each sub-step from current positions. Any two dots that could
// possibly interact (whether by repulsion/attraction or hard collision) are
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

        // Each dot is its own force source: a repulsion of 0 pushes
        // nothing away, but a dot can still be pushed by a neighbor
        // that has repulsion, regardless of its own value. Which of a
        // dot's two strengths applies depends on whether the OTHER dot
        // is in its same group ("self") or not ("others").
        const sameGroup = a.groupId !== null && a.groupId === b.groupId
        const aStrength = sameGroup ? ta.repulsionSelf : ta.repulsionOthers
        const bStrength = sameGroup ? tb.repulsionSelf : tb.repulsionOthers
        const aDisc = ta.radius * ta.forceRange
        const bDisc = tb.radius * tb.forceRange
        let force = 0
        if (dist < aDisc) force += repulsionForceAt(aStrength, dist / aDisc)
        if (dist < bDisc) force += repulsionForceAt(bStrength, dist / bDisc)
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

// --- Hard collision (no-overlap-beyond-tolerance) -------------------------

function pushApart(dot: Dot, nx: number, ny: number, amount: number, w: number, h: number, radius: number) {
    dot.xFrac = clampToWalls(dot.xFrac * w + nx * amount, w, radius) / w
    dot.yFrac = clampToWalls(dot.yFrac * h + ny * amount, h, radius) / h
}

function stopApproaching(dot: Dot, nx: number, ny: number) {
    const vn = dot.vx * nx + dot.vy * ny
    if (vn < 0) {
        dot.vx -= vn * nx
        dot.vy -= vn * ny
    }
}

export function resolveCollisions(
    list: Dot[],
    traits: ResolvedTraits[],
    cellSize: number,
    w: number,
    h: number,
    draggingDotId: string | null,
) {
    forEachNearbyPair(list, cellSize, w, h, (i, j) => {
        const a = list[i]
        const b = list[j]
        const ra = traits[i].radius
        const rb = traits[j].radius
        const ax = a.xFrac * w
        const ay = a.yFrac * h
        const bx = b.xFrac * w
        const by = b.yFrac * h
        const dx = bx - ax
        const dy = by - ay
        const dist = Math.hypot(dx, dy) || 0.0001
        const minDist = collisionMinDist(ra, rb)
        if (dist >= minDist) return

        const overlap = minDist - dist
        const nx = dx / dist
        const ny = dy / dist
        const aFixed = a.id === draggingDotId
        const bFixed = b.id === draggingDotId

        if (aFixed && bFixed) return
        if (aFixed) {
            pushApart(b, nx, ny, overlap, w, h, rb)
            stopApproaching(b, nx, ny)
        } else if (bFixed) {
            pushApart(a, -nx, -ny, overlap, w, h, ra)
            stopApproaching(a, -nx, -ny)
        } else {
            pushApart(a, -nx, -ny, overlap / 2, w, h, ra)
            pushApart(b, nx, ny, overlap / 2, w, h, rb)
            // Equal-mass collision with restitution: exchange the velocity component
            // along the normal, scaled so only COLLISION_RESTITUTION of the closing
            // speed survives as separating speed (1 = fully elastic, matches the old
            // behavior). relVel = (a.v - b.v)·n is positive exactly when they're
            // approaching (closing distance) — only bounce then, so an already-
            // separating overlap doesn't get re-swapped and stick/jitter.
            const relVel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny
            if (relVel > 0) {
                const impulse = (relVel * (1 + COLLISION_RESTITUTION)) / 2
                a.vx -= impulse * nx
                a.vy -= impulse * ny
                b.vx += impulse * nx
                b.vy += impulse * ny
            }
        }
    })
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
    // glide, no repulsion push. Collisions still resolve below so dragging a
    // dot around while paused can still shove others out of the way.
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

    resolveCollisions(list, traits, cellSize, w, h, draggingDotId)
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
        return Math.hypot(d.xFrac * w - x, d.yFrac * h - y) < collisionMinDist(resolveRadius(d, groupsById), radius)
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
