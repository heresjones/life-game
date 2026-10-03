name: life-game
description: Build and modify Life Game — a Nuxt 3/Vue particle-life simulation ("the dot game"), and its Terraform-managed S3 + CloudFront deployment.
user-invocable: true

---

# Life Game — Frontend & Deployment Skill

Use this skill when building, modifying, or deploying Life Game — a browser particle-life
simulation where colored "dots" push and pull each other based on per-group force rules.
Locally this is the "dot game."

---

## Who this is for

This is Chris's project with his 13-year-old son **Evan**, built together as a father-son
project. Evan is intellectually gifted — top 99th percentile in math — is autistic, and is
obsessed with numbers and physics. Chris will prompt with "Evan wants..." / "Evan asked for..."
on Evan's behalf as they design features together.

**How to apply this:**
- Favor physically-precise, numerically-explicit implementations over hand-wavy "good enough"
  game feel — exact constants, consistent units, deterministic rules Evan can reason about and
  predict, not fuzzy heuristics. See [[feedback_life_game_collision_feel]] in memory for a
  concrete precedent: Evan cared about the exact restitution/overlap numbers, not just "make it
  feel softer."
- When a slider, constant, or force curve is exposed in the UI, it's worth surfacing the real
  numbers (ranges, units, what a value of 0 vs. max actually does) rather than hiding them behind
  vague labels — Evan engages with the math directly.
- Implement what Evan specified as specified, even if a different convention seems more
  "standard" — don't substitute your own judgment for his explicit design direction without
  flagging the tradeoff and asking first.
- This is a kid-and-parent creative project, not production software for strangers — keep
  explanations and any in-app copy appropriate and legible for a 13-year-old, and don't impose
  enterprise-y process (heavy test suites, CI gates, etc.) that isn't wanted — see the deploy
  workflow below, which is intentionally manual and lightweight.

---

## What the game is

A Vue canvas renders circular "dots." Each dot either:
- has **no group** (`groupId: null`) — its own independent color/size/force settings, or
- **belongs to a group** — shares color/size/force settings with every other member

Dots have no hard collision body. Instead each dot has a soft force field with two zones:
- **close** — always repulsive, keeps dots from collapsing into a point
- **far** — can attract (negative) or repel (positive), an outer ring beyond close

`closeSelf`/`farSelf` only affect force against dots in the *same* group. A group affects a
*different* group only if it has an explicit `TargetOverride` for that target group — with no
override, two groups (or an ungrouped dot and anything else) exert zero force on each other and
simply overlap. Editing a still-default dot's color/size/force promotes it into a brand new
group (see `promoteToGroup` in the composable below).

**Close-zone falloff is Evan's own function**, not the generic one you'd reach for by default:
`closeEnvelopeAt(t)` in `physics.ts` is `1 / (t * sqrt(1 - t^2))` for `t` ∈ (0, 1) — diverges
toward infinity at both contact (`t→0`) and the close/far zone boundary (`t→1`), unlike the far
zone's bounded cosine-ripple curve. `t` is clamped a hair inside `(0, 1)` purely to stop an actual
`Infinity`/`NaN` from reaching a dot's velocity (which would never recover). Don't "simplify" this
back toward a bounded curve without checking with Evan first — the divergence is the point.

---

## Frontend architecture

Nuxt 3 / Vue 3, deployed as a fully static site (no SSR server at runtime).

| Path | Role |
|------|------|
| `frontend/app.vue` | Root: wires `DotCanvas`, `PlaybackBar`, `EditSidebar` to the composable |
| `frontend/composables/useDotSimulation.ts` | Single source of truth — module-level (not per-call) reactive state, so every component shares one simulation. Owns the `requestAnimationFrame` physics loop, selection, groups, drag, undo, play/pause |
| `frontend/helpers/physics.ts` | Framework-agnostic simulation core — trait resolution (dot vs. group), wall/friction integration, the close/far force curve, spatial-grid broad phase. No Vue imports; plain functions over plain data so it's reasoned about independently of the reactive layer |
| `frontend/helpers/dot.ts` | `Dot`/`DotGroup`/`TargetOverride`/`RenderDot` types and all tunable constants (force/range/drag min-max-default) |
| `frontend/helpers/color.ts` | Color resolution/conversion helpers (OKLCH picker support) |
| `frontend/components/DotCanvas.vue` | Canvas rendering + click/drag hit-testing. No `dots`/`highlighted` props — see the rendering architecture note below |
| `frontend/components/EditSidebar.vue`, `DotInventoryBar.vue`, `GroupsPanel.vue`, `GroupOverridesPanel.vue`, `VisualPanel.vue` | Editing UI for dots/groups/overrides |
| `frontend/components/OklchColorPicker.vue`, `GamutWheel.vue`, `SliderField.vue` | Shared input controls |
| `frontend/constants/index.ts` | App name/description/URL/**version** |

Key performance details (don't "simplify" these away without understanding why):
- `useDotSimulation` resolves each dot's effective radius/force/range **once per frame** into a
  `traits` array, rather than re-deriving them per pairwise check — this is what keeps per-pair
  physics cheap.
- The physics step sub-steps (`MAX_SUBSTEPS`) when a dot is moving fast enough to tunnel through
  another dot's force field in one frame, and sizes a spatial grid cell from the largest force
  reach currently in play so far-apart pairs are skipped entirely.
- Dot position is stored as a fraction of the window (`xFrac`/`yFrac`) so dots stay put relative
  to the viewport on resize; physics itself runs in pixel space.

### Rendering architecture — deliberately NOT Vue-reactive on the hot path

As of 2026-10-02, `dots` in `useDotSimulation.ts` is a **`shallowRef`**, not a `ref`. The physics
loop mutates `xFrac`/`yFrac`/`vx`/`vy` on every dot, every sub-step, every frame — a deep-reactive
`ref` would wrap every dot in a Proxy and pay Vue's tracking/trigger overhead on each of those
writes, multiplied by dot count × sub-steps × 60fps. That overhead (plus a `watch(..., { deep:
true })` in `DotCanvas.vue` deep-diffing the whole array every frame, plus a `computed` fully
rebuilding the render array every frame) was the actual cause of a perf complaint — not the lack
of a "real" game engine.

The fix, and the pattern to preserve when touching this code:
- `dots.value` holds **plain objects**, not reactive proxies. The physics loop mutates them
  directly with zero Vue overhead.
- Anything that needs the rest of the app to notice a *structural* change (a dot added/removed, a
  dot's `groupId` changing via `promoteToGroup`) calls `triggerRef(dots)` explicitly. Reassigning
  `dots.value` itself (`undoAdd`, `deleteSelected`) still auto-triggers like any ref.
- `getRenderDots()` is a **plain function**, not a `computed` — a computed would never be marked
  dirty by the hot-path mutations above, so it'd go stale. It's called fresh every frame instead.
- `DotCanvas.vue` has **no `dots`/`highlighted` props and no watchers**. `app.vue` holds a
  `canvasRef` and calls `canvasRef.value.redraw(getRenderDots(), highlightedIds.value)`
  imperatively from `useDotSimulation`'s own `onFrame` callback (passed into `startPhysics`) —
  once per `requestAnimationFrame` tick, paused or not. That callback IS the render path; there's
  no Vue reactivity behind drawing at all anymore.
- `groups` is still a normal deep `ref` — group count is small (a handful) and group properties
  are read, not written, on the hot path, so the old reactive-proxy cost there is negligible.
  Don't "fix" that one too without a reason; it isn't broken.

If you add a new piece of per-dot state that changes every frame, keep it out of Vue reactivity
the same way. If you add state that changes rarely (a new per-group setting, a new UI selection),
a normal `ref`/`computed` is fine — the problem was never reactivity itself, just using it on data
that mutates 60 times a second for hundreds of objects.

Local dev:
```bash
cd frontend
npm install
npm run dev        # nuxt dev
npm run typecheck   # vue-tsc --noEmit
```

### Version tag

`constants/index.ts` exports `appVersion`, rendered by `app.vue` (not `EditSidebar.vue` — it's
pinned to the bottom-right corner of the actual game UI, tight against the edge, 9px, dim grey,
`pointer-events: none` so it never intercepts canvas clicks/drags) — always visible, independent
of whether the menu is open. Format is `month.day.year v1.0 alpha.build` (e.g.
`10.2.2026 v1.0 alpha.1`) — the `v1.0 alpha` part is Evan's call and stays fixed until he says
otherwise; bump only the trailing build number by hand each time you deploy that same day, reset
it to `.1` on a new calendar day. This is manual on purpose (no auto-generated timestamps/build
hashes) so Evan can tell two same-day deploys apart at a glance without the number being noise.

---

## Deployment architecture (no CI/CD pipeline — manual deploy)

There is **no GitHub Actions / CI pipeline**. Deploys are a manual local command sequence
against AWS profile `kindawild` (account `031871827796`).

```bash
cd frontend
npm run generate    # nuxt generate -> frontend/.output/public (static HTML/JS/CSS)
aws s3 sync .output/public s3://life-game-site-031871827796 --delete --profile kindawild
aws cloudfront create-invalidation --distribution-id E3RV7YCR3CJU4T --paths "/*" --profile kindawild
```

Live URL: https://d1ymi62ieypwzs.cloudfront.net/

**Gotcha:** `npm run generate` fails with "Another Nuxt dev is already running" if a local `npm
run dev` server is still up (it holds a lock file) — stop the dev server first, then generate.

### Infra (`infra/`, Terraform)

- `main.tf` — all resources; `variables.tf` — `aws_profile` (default `kindawild`), `aws_region`
  (default `us-east-1`), `project_name` (default `life-game`); `outputs.tf` — bucket name,
  distribution id, CloudFront URL.
- **S3 bucket** `life-game-site-<account_id>` — fully private (`aws_s3_bucket_public_access_block`
  blocks all public access/ACLs).
- **CloudFront Origin Access Control (OAC)** — CloudFront reaches the private bucket via OAC +
  sigv4 signing, not a public bucket policy or legacy OAI.
- **Bucket policy** grants `s3:GetObject` only to the CloudFront service principal, scoped by
  `AWS:SourceArn` to this specific distribution.
- **CloudFront function** `directory-index` (`infra/cloudfront-functions/directory-index.js`,
  `viewer-request`) rewrites directory-style requests to `index.html` — `/foo/` -> `/foo/index.html`,
  and any extensionless path `/foo` -> `/foo/index.html` — since this is a static export with no
  server to do that rewriting.
- **Custom error responses** map both 403 *and* 404 to `/404.html` with a 404 status. This is
  intentional, not a shortcut: the private bucket + OAC setup means a missing key comes back as
  403 (no `s3:ListBucket` permission to distinguish "forbidden" from "not found"), so both codes
  need the same mapping.
- No ACM certificate / custom domain — serves on the default `*.cloudfront.net` certificate.

To change infra:
```bash
cd infra
terraform plan   # uses aws_profile var, default kindawild
terraform apply
```

State is local (`infra/terraform.tfstate`), not remote — be careful running `terraform apply`
from more than one machine/clone.
