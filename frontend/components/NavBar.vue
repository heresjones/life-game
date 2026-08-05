<template>
    <nav flex justify-center py-2 px-3 z-100 fixed top-0 left-0 right-0 class="bg-#090909AA" style="box-shadow: 0 2px 8px 0 rgba(0,0,0,.5)">
        <div flex justify-between container>
            <div flex items-center>
                <NuxtLink to="/" title="Home" aria-label="Home" flex items-center>
                    <span class="i-custom:icon text-lg mr-1"></span>
                    <div font-semibold>SandboxScience</div>
                </NuxtLink>
                <div flex ml-8>
                    <Dropdown placement="left">
                        <template v-slot:button>
                            <div flex items-center mx-2>
                                <span class="mr-1" text="zinc-2 hover:zinc-1">Simulations</span>
                                <span i-tabler-chevron-down mt-px></span>
                            </div>
                        </template>
                        <template v-slot:content>
                            <NuxtLink to="/game-of-life" flex w-full justify-between items-center rounded px-2 py-1 my-1 hover:bg-zinc-700>
                                Game Of Life
                            </NuxtLink>
                            <NuxtLink to="/particle-life" flex w-full justify-between items-center rounded px-2 py-1 my-1 hover:bg-zinc-700>
                                Particle Life
                            </NuxtLink>
                            <NuxtLink to="/hash-life" flex w-full justify-between items-center rounded px-2 py-1 my-1 hover:bg-zinc-700>
                                Hash Life
                            </NuxtLink>
                        </template>
                    </Dropdown>
<!--                    <NuxtLink to="/doc" mx-2>Documentation</NuxtLink>-->
                    <button mx-2 cursor-not-allowed text-gray-400>Documentation</button>
                    <NuxtLink to="/about" mx-2 class="text-zinc-2 hover:text-zinc-1">
                        About
                    </NuxtLink>
                </div>
            </div>
            <div flex items-center>
                <button type="button" name="Donate" aria-label="Donate" title="Donate" @click="openDonationModal()"
                        class="flex items-center py-1 px-2.5 mr-2 rounded-lg text-xs font-medium transition-all duration-200 bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50">
                    <span i-tabler-heart-filled text-sm mr-1 class="animate-heartbeat"></span>
                    Donate
                </button>
                <NuxtLink to="https://github.com/DicSo92/SandboxScience" title="Github" aria-label="Github" target="_blank" external class="flex items-center py-0 mx-1">
                    <button type="button" name="Github" aria-label="Github" text="zinc-3 hover:zinc-1" flex>
                        <span i-carbon-logo-github text-lg m-0.5></span>
                    </button>
                </NuxtLink>
                <NuxtLink to="https://discord.com/invite/z5yuzkFpCA" title="Discord" aria-label="Discord" target="_blank" external class="flex items-center py-0 ml-1.5 mr-1">
                    <button type="button" name="Discord" aria-label="Discord" text="zinc-3 hover:zinc-1" flex>
                        <span i-carbon-logo-discord text-lg m-0.5></span>
                    </button>
                </NuxtLink>
                <NuxtLink to="https://x.com" title="Twitter" aria-label="Twitter" target="_blank" external class="flex items-center py-0 mx-1">
                    <button type="button" name="Twitter" aria-label="Twitter" text="zinc-3 hover:zinc-1" flex>
                        <span i-carbon-logo-x text-lg m-0.5></span>
                    </button>
                </NuxtLink>
            </div>
        </div>

    </nav>
</template>

<script setup lang="ts">
const { open: openDonationModal } = useDonationModal()
</script>

<style scoped>

</style>
