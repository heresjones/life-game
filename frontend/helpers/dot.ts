// Default rendered/hit-test radius in CSS pixels — the starting size for new
// dots. Actual per-dot size is now variable (see radius field below); this
// constant is just the default and the physics tunneling-safety fallback.
export const DOT_RADIUS = 10
export const MIN_DOT_RADIUS = 6
export const MAX_DOT_RADIUS = 22

// A brand-new/still-default dot has no color of its own yet — this is that
// placeholder. When a dot promotes into a group without ever having its
// color touched (e.g. promoted by editing a force slider first), the new
// group gets a color from GROUP_COLOR_PALETTE instead of inheriting this
// gray, so groups are visually distinguishable from the moment they exist —
// otherwise every unnamed, uncolored group reads as "Unnamed group" with an
// identical gray swatch, which makes per-group overrides (see TargetOverride
// below) impossible to tell apart in the UI even though they work correctly.
export const DEFAULT_DOT_COLOR = '#808080'
export const GROUP_COLOR_PALETTE = [
    '#f87171', // red
    '#fb923c', // orange
    '#facc15', // yellow
    '#4ade80', // green
    '#22d3ee', // cyan
    '#60a5fa', // blue
    '#a78bfa', // violet
    '#f472b6', // pink
]

// Each dot's force field has two zones, each with its own reach (see
// closeRange/farRange below): CLOSE (nearer) and FAR (an outer ring beyond
// it — see the diagram in helpers/physics.ts). Close is always repulsive —
// it's what keeps dots from collapsing into a single point. Far can push or
// pull, so groups can either stay loosely apart or draw into a cluster.
// closeSelf/farSelf govern force against dots in the SAME group. There's no
// equivalent generic "others" pair — a dot only exerts force on a
// DIFFERENT group if that group has an explicit TargetOverride for it (see
// below); with no override, two different groups (or an ungrouped dot and
// anything else) exert zero force on each other and simply overlap freely —
// dots have no hard physical body of their own.
//
// closeSelf: repulsion-only, never fully off.
export const MIN_CLOSE_FORCE = 10
export const MAX_CLOSE_FORCE = 200
export const DEFAULT_CLOSE_FORCE = 10

// farSelf: can go negative (attraction pulls dots together) as well as
// positive (repulsion pushes them apart); 0 means "exerts no force". Also
// the range used by each TargetOverride's close/far strength fields.
export const MIN_FAR_FORCE = -100
export const MAX_FAR_FORCE = 100
export const DEFAULT_FAR_FORCE = 0

// How far each zone reaches, as a multiple of the dot's own visual radius —
// independent of strength, and independent of each other: closeRange and
// farRange each size their own zone, so e.g. a small close range and a large
// far range is entirely valid (the two zones don't have to match). A bigger
// range means attraction (or repulsion) kicks in from farther away; it
// doesn't make it any stronger, since strength and range are separate knobs.
export const MIN_ZONE_RANGE = 1
export const MAX_ZONE_RANGE = 20
// Both default to 2 so the total default reach (4, split evenly) matches
// what a single combined "force range" used to default to before close/far
// got independent sizes.
export const DEFAULT_CLOSE_RANGE = 2
export const DEFAULT_FAR_RANGE = 2

// Drag ("air resistance") controls how quickly a dot sheds velocity on its
// own — 0 is frictionless (glides forever until it hits a wall), 1 is
// maximum drag (loses essentially all speed within a second of nothing
// actively pushing it). The fraction of speed retained each second is
// (1 - dragCoefficient).
export const MIN_DRAG_COEFFICIENT = 0
export const MAX_DRAG_COEFFICIENT = 1
export const DEFAULT_DRAG_COEFFICIENT = 0.85

// A group's only way to react to another specific group — there's no
// generic "others" fallback (see closeSelf/farSelf above), so a group
// exerts zero soft force on any other group it hasn't added an override
// for. Only groups carry these (a still-default/ungrouped dot has no
// identity for another group to target yet). Directional: A overriding how
// it treats B doesn't imply B treats A specially back.
//
// Each override carries its own closeRange/farRange too, not just strength —
// a group's reach toward one specific other group can be totally different
// from its reach toward its own members (closeRange/farRange on the group
// itself, used for closeSelf/farSelf).
export interface TargetOverride {
    targetGroupId: string
    close: number
    far: number
    closeRange: number
    farRange: number
}

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
    closeSelf: number
    farSelf: number
    closeRange: number
    farRange: number
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
    closeSelf: number
    farSelf: number
    targetOverrides: TargetOverride[]
    closeRange: number
    farRange: number
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
