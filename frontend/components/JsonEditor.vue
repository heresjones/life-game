<template>
    <div relative text-xs font-mono>
        <div flex rounded overflow-hidden border class="bg-slate-950/75" :class="hasError ? 'border-red-800/80' : 'border-slate-700'">
            <div ref="lineNumbers" h-64 w-8 pl-1 pr-2 py-2 select-none text-right bg-transparent text-slate-500 overflow-hidden translate-y-px
                 :style="{ height: editorHeight + 'px' }">
                <pre leading-5 flex flex-col>
                    <span v-for="n in lineCount" :key="n" block>{{ n }}</span>
                </pre>
            </div>

            <textarea ref="jsonTextarea" v-model="jsonText" @input="onInput" @scroll="onScroll" spellcheck="false" placeholder="Paste JSON here..."
                      h-64 min-h-28 w-full leading-5 px-3 py-2 rounded-r text-xs font-mono
                      bg-transparent text-slate-100 border-l border-slate-700
                      whitespace-pre overflow-auto resize-y class="thin-scrollbar" style="outline: none;">
            </textarea>
        </div>
    </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import type { PresetValidationError } from "~/composables/usePresetManager";
export default defineComponent({
    name: 'JsonEditor',
    props: {
        modelValue: {
            type: String,
            default: "",
        },
        internalError: {
            type: String as () => string | null,
            default: null,
        },
        externalErrors: {
            type: Array as () => PresetValidationError[] | null,
            default: null,
        },
    },
    emits: ["update:modelValue", "update:internalError"],
    setup(props, { emit }) {
        const jsonText = ref<string>(props.modelValue)
        const lineCount = ref<number>(1)
        const editorHeight = ref<number>(0)

        const jsonTextarea = ref<HTMLTextAreaElement | null>(null)
        const lineNumbers = ref<HTMLDivElement | null>(null)

        // -- Lifecycle Hooks ------------------------------------------------------------------------------------------
        onMounted(async () => {
            updateLineCount()
            await nextTick()
            syncHeight()
            validateJson()

            useResizeObserver(jsonTextarea, () => syncHeight())
        })
        // -- Computed -------------------------------------------------------------------------------------------------
        const hasError = computed<boolean>(() => {
            return !!props.internalError || !!props.externalErrors?.length
        })
        // -- Event Handlers -------------------------------------------------------------------------------------------
        const onInput = () => {
            emit("update:modelValue", jsonText.value)
            updateLineCount()
            validateJson()
        }
        // -- Validation -----------------------------------------------------------------------------------------------
        const validateJson = () => {
            try {
                if (!jsonText.value.trim()) {
                    emit("update:internalError", null)
                    return
                }
                JSON.parse(jsonText.value)
                emit("update:internalError", null)
            } catch (e: any) {
                const msg = e?.message ?? "Invalid JSON"
                emit("update:internalError", msg)
            }
        }
        // -- Line Count Helpers ---------------------------------------------------------------------------------------
        const updateLineCount = () => {
            lineCount.value = jsonText.value.split('\n').length || 1
            // syncHeight()
        }
        const syncHeight = () => {
            const el = jsonTextarea.value
            if (!el) return

            const totalHeight = el.offsetHeight
            const innerHeight = el.clientHeight // without scrollbar
            const horizontalScrollbarHeight = Math.max(totalHeight - innerHeight, 0)

            editorHeight.value = totalHeight - horizontalScrollbarHeight
        }
        const onScroll = (event: Event) => {
            const target = event.target as HTMLTextAreaElement
            if (lineNumbers.value) {
                lineNumbers.value.scrollTop = target.scrollTop
            }
        }
        // -- Watchers -------------------------------------------------------------------------------------------------
        watch(() => props.modelValue, (val) => {
            if (val !== jsonText.value) {
                jsonText.value = val
                updateLineCount()
                validateJson()
            }
        })

        return {
            jsonText, hasError, lineCount, editorHeight,
            onScroll, onInput,
            jsonTextarea, lineNumbers,
        }
    },
})
</script>

<style scoped>

</style>