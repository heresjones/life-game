<template>
    <Modal :modal-active="particleLife.isSaveModalOpen" @close="closeModal" overlayColor="bg-gray-950/25" modalClass="max-w-[880px]">
        <section>
            <header class="-mt-2 sm:-mt-4" mb-3>
                <div flex items-center mb-3 class="text-2xl sm:text-[1.75rem] font-bold">
                    <span i-tabler-sparkles text-amber-600 mr-3></span>
                    <h1 flex items-center>Preset Manager</h1>
                </div>
            </header>

            <div w-full h-px mb-4 class="bg-slate-700/80"></div>

            <div class="flex flex-col md:flex-row gap-2">
                <div class="md:w-6/12 pr-0 md:pr-3">
                    <div flex items-center mb-3>
                        <span i-carbon-save text-2xl mr-2 class="text-gray-400/80"></span>
                        <h2 text-xl pt-px>Save New Preset</h2>
                    </div>
                    <div mb-2>
                        <p class="text-2sm text-gray-200 mb-1">Preset Name</p>
                        <input type="text" maxlength="32" placeholder="Enter a name for this preset..." v-model="name"
                               class="w-full border bg-slate-900/70 border-gray-600 rounded px-3 py-2 text-sm text-slate-200 font-500">
                    </div>
                    <div>
                        <p class="text-2sm text-gray-200 mb-1">Description (Optional)</p>
                        <textarea maxlength="180" placeholder="Describe what this preset does..." v-model="description" min-h-9 h-15 max-h-30
                                  class="w-full border bg-slate-900/70 border-gray-600 rounded px-3 py-2 text-sm text-slate-200 font-500 leading-5 resize-y overflow-auto">
                        </textarea>
                    </div>
                    <hr border-gray-500 my-2>
                    <p text-gray-200 class="-mt-0.5" mb-2>
                        Components to include
                        <TooltipInfo container="#mainContainer" tag="div"
                                     tooltip="Choose what to include in this preset. <br>
                                            Forces: interaction matrix between color pairs. <br>
                                            Radii: min/max radius matrices between color pairs. <br>
                                            Colors: particle colors. <br>
                                            Settings: global simulation parameters.">
                        </TooltipInfo>
                        :
                    </p>
                    <div flex gap-2 flex-wrap>
                        <ToggleChip
                            v-model="forceMatrix"
                            label="Forces"
                            icon="i-tabler-arrows-random text-sky-600/80"
                            activeClass="border-sky-600/80 bg-sky-600/20 hover:bg-sky-600/30 text-sky-100"
                            inactiveClass="border-slate-600 bg-slate-800/80 hover:bg-slate-900/50 text-slate-300"
                        />
                        <ToggleChip
                            v-model="radiusMatrices"
                            label="Radii"
                            icon="i-tabler-circles text-purple-600/80"
                            activeClass="border-purple-600/80 bg-purple-700/20 hover:bg-purple-700/30 text-purple-100"
                            inactiveClass="border-slate-600 bg-slate-800/80 hover:bg-slate-900/50 text-slate-300"
                        />
                        <ToggleChip
                            v-model="colors"
                            label="Colors"
                            icon="i-tabler-palette text-amber-600/80"
                            activeClass="border-amber-600/80 bg-amber-700/20 hover:bg-amber-700/30 text-amber-100"
                            inactiveClass="border-slate-600 bg-slate-800/80 hover:bg-slate-900/50 text-slate-300"
                        />
                        <ToggleChip
                            v-model="generalSettings"
                            label="Settings"
                            icon="i-tabler-settings text-emerald-600/80"
                            activeClass="border-emerald-600/80 bg-emerald-700/20 hover:bg-emerald-700/30 text-emerald-100"
                            inactiveClass="border-slate-600 bg-slate-800/80 hover:bg-slate-900/50 text-slate-300"
                            disabled
                        />
                    </div>
                    <div flex justify-end items-center gap-3 mt-4>
                        <div flex-1 flex justify-around items-center>
                            <button type="button" @click="copyToClipboard(buildPresetData())" :disabled="!canSave" px-2 flex items-center text-sm text="slate-300 hover:slate-300/80 disabled:slate-300/40" class="disabled:cursor-not-allowed">
                                <span i-tabler-copy mr-1></span>
                                Copy
                            </button>
                            <div w-px bg-gray-600 h-6></div>
                            <button type="button" @click="download(buildPresetData())" :disabled="!canSave" px-2 flex items-center text-sm text="slate-300 hover:slate-300/80 disabled:slate-300/40" class="disabled:cursor-not-allowed">
                                <span i-tabler-download mr-1></span>
                                Download
                            </button>
                        </div>

                        <button type="button" @click="savePreset" :disabled="!canSave" btn whitespace-nowrap py-1 pl-2.5 pr-3.5 rounded-lg flex justify-center items-center transition transition-duration-75
                                class="border border-cyan-600/80 hover:border-cyan-500/80 disabled:hover:border-cyan-600/80 shadow-sm hover:shadow-cyan-900/40 text-sm font-500 disabled:cursor-not-allowed"
                                bg="cyan-800/80 hover:cyan-600/60 disabled:cyan-800/80">
                            <span mr-1.5 i-carbon-save text-base></span>
                            Save Preset
                        </button>
                    </div>
                </div>

                <div class="hidden md:block w-px bg-slate-700/80"></div>

                <div class="md:w-6/12 md:pl-3">
                    <div flex items-center mb-3>
                        <span i-tabler-file-upload text-2xl mr-2 class="text-gray-400/80"></span>
                        <h2 text-xl pt-px>Load From JSON</h2>
                    </div>
                    <div flex flex-col gap-2>
                        <h3 text-slate-400 text-base>Upload a .json file exported from Particle Life or paste JSON data directly.</h3>
                        <div flex flex-col gap-1>
                            <div class="flex items-center w-full">
                                <button type="button" @click="fileInput?.click()" w-full btn px-3 rounded-lg flex justify-center items-center border class="border-slate-600/80 bg-slate-800/80 hover:bg-slate-700/60 text-slate-100">
                                    <span i-tabler-file text-base mr-1></span>
                                    Upload JSON File
                                </button>
                                <input ref="fileInput" type="file" accept="application/json,.json" class="hidden" @change="onJsonFileSelected"/>
                            </div>
                            <TransitionGroup name="fade-translate-y">
                                <div v-if="fileError" px-2 py-1 rounded-lg text-xs text-red-600 border class="border-red-700/60 bg-red-950/30">
                                    {{ fileError }}
                                </div>
                                <div v-if="fileWarning" px-2 py-1 rounded-lg text-xs text-amber-600 border class="border-amber-700/60 bg-amber-950/30">
                                    {{ fileWarning }}
                                </div>
                            </TransitionGroup>
                        </div>
                        <JsonEditor v-model="jsonText" v-model:internalError="jsonSyntaxError" :external-errors="jsonValidationErrors" />

                        <Transition name="fade-translate-y">
                            <div v-if="jsonErrors?.length" class="border border-red-800/60 bg-red-950/40" rounded-md backdrop-blur-sm>
                                <div flex items-center gap-2 px-3 py-1.5 border-b class="border-red-800/50">
                                    <span i-tabler-alert-triangle-filled text-red-400 text-sm></span>
                                    <span font-semibold tracking-wide uppercase text-red-200 text-xs>
                                        {{ jsonErrors.length }} error{{ jsonErrors.length > 1 ? 's' : '' }} detected
                                    </span>
                                </div>

                                <TransitionGroup name="fade-translate-y" tag="div" class="divide-y divide-red-900/40" text-xs>
                                    <div v-for="(error, index) in jsonErrors" :key="index" class="px-3 pt-2 pb-1.5 hover:bg-red-900/10">
                                        <div class="flex items-start gap-1.5">
                                            <span mt-1 block w-1.5 h-1.5 rounded-full bg-red-500></span>

                                            <div class="flex-1">
                                                <div class="flex flex-wrap items-center gap-1">
                                                    <span v-if="error.code" class="px-1 py-px rounded bg-red-900/60 border border-red-700/60 text-red-200 text-[0.6rem] uppercase tracking-wide">
                                                        {{ error.code }}
                                                    </span>
                                                    <span text-red-100 leading-snug>
                                                        {{ error.message }}
                                                    </span>
                                                </div>
                                                <div v-if="error.path" class="mt-0.5 pl-0.5 text-[0.65rem] text-red-300/70 font-mono break-all">
                                                    ↳ {{ error.path }}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </TransitionGroup>
                            </div>
                        </Transition>

                        <div flex items-center justify-between>
                            <span v-if="!hasJsonErrors && !isJsonEmpty" class="inline-flex items-center px-1.5 py-0.5 rounded-full border border-emerald-700/70 bg-emerald-900/40 text-[0.70rem] text-emerald-200 tracking-wide">
                                <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5"></span>
                                Ready to load
                            </span>
                            <span v-else></span>

                            <button type="button" @click="loadFromJson" :disabled="hasJsonErrors || isJsonEmpty" btn whitespace-nowrap py-1 pl-2.5 pr-3.5 rounded-lg flex justify-center items-center transition transition-duration-75
                                    class="border border-cyan-600/80 disabled:hover:border-cyan-600/80 hover:border-cyan-500/80 shadow-sm hover:shadow-cyan-900/40 text-sm font-500 disabled:cursor-not-allowed"
                                    bg="cyan-800/80 hover:cyan-600/60 disabled:cyan-800/80" >
                                <span mr-1.5 i-tabler-file-upload text-base></span>
                                Load Preset
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    </Modal>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import { usePresetManager } from "~/composables/usePresetManager";
import type { Preset, PresetValidationError, PresetValidationResult } from "~/composables/usePresetManager";
export default defineComponent({
    name: 'SaveModal',
    props: {
        store: {
            type: Object,
            required: true
        }
    },
    setup(props, { emit }) {
        const particleLife = props.store
        const { copyToClipboard, download, save, flatRgbaToHexList, hslArrayToHexList, clone2D, validatePreset } = usePresetManager(particleLife)

        const name = ref<string>("")
        const description = ref<string>("")
        const forceMatrix = ref<boolean>(false)
        const radiusMatrices = ref<boolean>(false)
        const colors = ref<boolean>(false)
        const generalSettings = ref<boolean>(false)

        const canSave = computed(() => {
            return forceMatrix.value || radiusMatrices.value || colors.value || generalSettings.value
        })

        const closeModal = () => {
            particleLife.isSaveModalOpen = false
        }
        // -------------------------------------------------------------------------------------------------------------
        // --- Preset management ---------------------------------------------------------------------------------------
        // -------------------------------------------------------------------------------------------------------------
        const buildPresetData = (): Preset => {
            const presetData: Preset = {
                v: 1,
                meta: {
                    name: name.value.trim() || "Untitled Preset",
                    description: description.value.trim() || null
                },
                types: [] as string[] // "settings", "forces", "radii", "colors"
            }

            // if (generalSettings.value) {
            //     presetData.settings = {
            //         species: particleLife.numColors,
            //         numParticles: particleLife.numParticles,
            //         frictionFactor: particleLife.frictionFactor,
            //         forceFactor: particleLife.forceFactor,
            //     }
            //     presetData.types.push("settings")
            // }

            if (forceMatrix.value || radiusMatrices.value) {
                presetData.matrices = { forces: [] }
                presetData.matrices.forces = clone2D(particleLife.rulesMatrix)
                presetData.types.push("forces")

                if (radiusMatrices.value) {
                    presetData.matrices.minRadius = clone2D(particleLife.minRadiusMatrix)
                    presetData.matrices.maxRadius = clone2D(particleLife.maxRadiusMatrix)
                    presetData.types.push("radii")
                }
            }

            if (colors.value) {
                if (particleLife.engineType === "CPU") { // CPU
                    presetData.colors = hslArrayToHexList(particleLife.currentColors)
                } else { // GPU
                    presetData.colors = flatRgbaToHexList(particleLife.currentColors)
                }
                presetData.types.push("colors")
            }

            return presetData
        }
        const savePreset = () => {
            if (!canSave.value) return
            save(buildPresetData())
            closeModal()
            resetFields()
        }
        const resetFields = () => {
            name.value = ""
            description.value = ""
            forceMatrix.value = false
            radiusMatrices.value = false
            colors.value = false
            generalSettings.value = false
            jsonText.value = ""
        }
        // -------------------------------------------------------------------------------------------------------------
        // --- JSON Editor ---------------------------------------------------------------------------------------------
        // -------------------------------------------------------------------------------------------------------------
        const jsonText = ref<string>("")
        const jsonSyntaxError = ref<string | null>(null)
        const jsonValidationErrors = ref<PresetValidationError[] | null>(null)

        const isJsonEmpty = computed(() => !jsonText.value.trim())
        const hasJsonErrors = computed(() => !!jsonSyntaxError.value || !!jsonValidationErrors.value?.length)
        const jsonErrors = computed<PresetValidationError[]>(() => {
            const errors: PresetValidationError[] = []
            if (jsonSyntaxError.value) {
                errors.push({
                    message: jsonSyntaxError.value,
                    code: "JSON_SYNTAX_ERROR",
                })
            }
            if (jsonValidationErrors.value && jsonValidationErrors.value.length > 0) {
                errors.push(...jsonValidationErrors.value)
            }
            return errors
        })

        // onMounted(async () => {
        //     jsonText.value = JSON.stringify(buildPresetData(), null, 2);
        // })

        const loadFromJson = () => {
            if (hasJsonErrors.value || isJsonEmpty.value) return
            const data = JSON.parse(jsonText.value) as Preset
            save(data)
            closeModal()
            resetFields()
        }

        const fileInput = ref<HTMLInputElement | null>(null)
        const fileWarning = ref<string | null>(null)
        const fileError = ref<string | null>(null)
        const MAX_FILE_SIZE = 1 * 1024 * 1024 // 1 MB
        const JSON_MIME_TYPES = ["application/json", "text/json", "application/ld+json"]

        const onJsonFileSelected = (event: Event) => {
            const target = event.target as HTMLInputElement
            const file = target.files?.[0]
            if (!file) return

            fileError.value = null
            fileWarning.value = null

            if (file.size > MAX_FILE_SIZE) {
                fileError.value = "The file is too large (max 1 MB)."
                target.value = ""
                return
            }
            const hasJsonExtension = /\.json$/i.test(file.name)
            const hasJsonMime = file.type && JSON_MIME_TYPES.includes(file.type)
            if (!hasJsonExtension && !hasJsonMime) {
                fileError.value = "Only .json files are accepted."
                target.value = ""
                return
            }

            const reader = new FileReader()
            reader.onload = () => {
                try {
                    const text = String(reader.result || "")
                    const parsed = JSON.parse(text)

                    jsonSyntaxError.value = null

                    const result = validatePreset(parsed) as PresetValidationResult
                    if (!result.valid) {
                        jsonValidationErrors.value = result.errors
                        fileWarning.value = "The JSON file is invalid for a Particle Life preset."
                    } else {
                        jsonValidationErrors.value = null
                        fileWarning.value = null
                    }

                    jsonText.value = text
                    fileError.value = null
                } catch (e: any) {
                    // fileError.value = e?.message ?? "Error parsing JSON file"
                    fileWarning.value = "The JSON file contains errors. Please review and correct them."
                    jsonText.value = String(reader.result || "")
                } finally {
                    target.value = ""
                }
            }
            reader.onerror = () => {
                console.log("Error reading JSON file:", reader.error)
                fileError.value = "Unable to read the JSON file."
                target.value = ""
            }
            reader.readAsText(file, "utf-8")
        }
        // -------------------------------------------------------------------------------------------------------------
        // --- Watchers ------------------------------------------------------------------------------------------------
        // -------------------------------------------------------------------------------------------------------------
        watch(forceMatrix, (newVal) => {
            if (!newVal) radiusMatrices.value = false
        })
        watch(radiusMatrices, (newVal) => {
            if (newVal) forceMatrix.value = true
        })
        watch(hasJsonErrors, (newVal) => {
            if (!newVal) fileWarning.value = null
        })
        watch(jsonText, (newVal) => {
            jsonSyntaxError.value = null
            jsonValidationErrors.value = null

            if (!newVal.trim()) return

            try {
                const parsed = JSON.parse(newVal)
                const result = validatePreset(parsed) as PresetValidationResult
                jsonValidationErrors.value = !result.valid ? result.errors : null
            } catch (e: any) {
                jsonSyntaxError.value = e?.message ?? "Invalid JSON."
                jsonValidationErrors.value = null
            }
        })

        return {
            particleLife, closeModal,
            name, description, forceMatrix, radiusMatrices, colors, generalSettings, canSave,
            buildPresetData, copyToClipboard, download, loadFromJson, onJsonFileSelected, savePreset, fileInput,
            jsonText, jsonSyntaxError, jsonValidationErrors, isJsonEmpty, hasJsonErrors, jsonErrors, fileError, fileWarning
        }
    },
})
</script>


<style scoped>
.fade-translate-y-enter-active,
.fade-translate-y-leave-active {
    transition: opacity 0.15s ease-out, transform 0.15s ease-out;
}
.fade-translate-y-enter-from,
.fade-translate-y-leave-to {
    opacity: 0;
    transform: translateY(-6px);
}
.fade-translate-y-enter-to,
.fade-translate-y-leave-from {
    opacity: 1;
    transform: translateY(0);
}
</style>