// Module-level singleton, same pattern as useDotSimulation: every component
// that calls useUiSettings() shares one instance, so the settings dropdown
// and anything reading these values always agree.

const STORAGE_KEY = 'life-game-ui-settings'
export const DEFAULT_BACKGROUND_COLOR = '#0b0c10'
export const DEFAULT_TEXT_SCALE = 100
export const MIN_TEXT_SCALE = 70
export const MAX_TEXT_SCALE = 150

interface StoredSettings {
    backgroundColor: string
    textScale: number
}

// Reads happen inside a function, not at module-eval time, so this is safe
// during Nuxt's static prerender (no `window` there) — it just falls back to
// the defaults, same values already baked into assets/main.css as the
// pre-hydration look.
function loadStored(): StoredSettings {
    if (typeof window === 'undefined') {
        return { backgroundColor: DEFAULT_BACKGROUND_COLOR, textScale: DEFAULT_TEXT_SCALE }
    }
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)
        if (!raw) return { backgroundColor: DEFAULT_BACKGROUND_COLOR, textScale: DEFAULT_TEXT_SCALE }
        const parsed = JSON.parse(raw)
        return {
            backgroundColor: typeof parsed.backgroundColor === 'string' ? parsed.backgroundColor : DEFAULT_BACKGROUND_COLOR,
            textScale: typeof parsed.textScale === 'number' ? parsed.textScale : DEFAULT_TEXT_SCALE,
        }
    } catch {
        return { backgroundColor: DEFAULT_BACKGROUND_COLOR, textScale: DEFAULT_TEXT_SCALE }
    }
}

const stored = loadStored()
const backgroundColor = ref<string>(stored.backgroundColor)
const textScale = ref<number>(stored.textScale)

// --ui-font-scale multiplies every scalable font-size declaration (see
// assets/main.css and the component styles that use it); --bg-color is what
// html/body/#__nuxt paint behind the canvas — DotCanvas itself only clears to
// transparent, so this IS the game's background, not just a page backdrop.
function applyToDocument() {
    if (typeof document === 'undefined') return
    document.documentElement.style.setProperty('--bg-color', backgroundColor.value)
    document.documentElement.style.setProperty('--ui-font-scale', String(textScale.value / 100))
}

function persist() {
    if (typeof window === 'undefined') return
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ backgroundColor: backgroundColor.value, textScale: textScale.value }))
    } catch {
        // Private browsing / storage disabled — settings just won't survive a reload.
    }
}

// immediate: true applies the stored (or default) values as soon as this
// module is first used client-side, with no extra wiring needed from app.vue.
watch([backgroundColor, textScale], () => {
    applyToDocument()
    persist()
}, { immediate: true })

export function useUiSettings() {
    return {
        backgroundColor,
        textScale,
    }
}
