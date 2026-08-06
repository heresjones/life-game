// Default rendered/hit-test radius in CSS pixels — the starting size for new
// dots. Actual per-dot size is now variable (see radius field below); this
// constant is just the default and the physics tunneling-safety fallback.
export const DOT_RADIUS = 10
export const MIN_DOT_RADIUS = 6
export const MAX_DOT_RADIUS = 22

// Repulsion is a slider-controlled strength, not a physical unit — 0 means
// "exerts no force" (the default). Positive pushes dots apart, negative
// pulls them together (attraction). Split in two: repulsionSelf governs
// force against dots in the SAME group, repulsionOthers against everything
// else (a different group, or ungrouped).
export const MIN_REPULSION = -200
export const MAX_REPULSION = 200
export const DEFAULT_REPULSION = 0

// How far a dot's force field reaches, as a multiple of its own visual
// radius — independent of strength. A bigger range means attraction (or
// repulsion) kicks in from farther away; it doesn't make it any stronger
// up close, since strength and range are separate knobs on the same curve.
export const MIN_FORCE_RANGE = 1
export const MAX_FORCE_RANGE = 20
export const DEFAULT_FORCE_RANGE = 4

// Drag ("air resistance") controls how quickly a dot sheds velocity on its
// own, apart from collisions — 0 is frictionless (glides forever until it
// hits a wall or another dot), 1 is maximum drag (loses essentially all
// speed within a second of nothing actively pushing it). The fraction of
// speed retained each second is (1 - dragCoefficient).
export const MIN_DRAG_COEFFICIENT = 0
export const MAX_DRAG_COEFFICIENT = 1
export const DEFAULT_DRAG_COEFFICIENT = 0.85

// A dot with no group (groupId: null) is "default" — its color, size, and
// repulsion are its own, and editing them doesn't affect any other default
// dot. Editing any of them promotes it into a brand new group (see
// app.vue), after which all of them come from that group and are shared
// with every other dot in it.
//
// vx/vy are pixel-per-second velocity, owned by app.vue's physics loop —
// nonzero after a drag release or a repulsion push, decaying via friction
// back to 0.
export interface Dot {
    id: string
    xFrac: number
    yFrac: number
    color: string
    radius: number
    repulsionSelf: number
    repulsionOthers: number
    forceRange: number
    dragCoefficient: number
    groupId: string | null
    vx: number
    vy: number
}

export interface DotGroup {
    id: string
    name: string
    color: string
    radius: number
    repulsionSelf: number
    repulsionOthers: number
    forceRange: number
    dragCoefficient: number
}

// What DotCanvas actually needs to paint a dot — flat, already-resolved
// color/radius, regardless of whether they came from the dot itself or its
// group. Repulsion is physics-only and never rendered, so it's not part of
// this shape.
export interface RenderDot {
    id: string
    xFrac: number
    yFrac: number
    color: string
    radius: number
}
