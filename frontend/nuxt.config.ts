import { appName, appDescription } from './constants/index'

export default defineNuxtConfig({
    devtools: { enabled: false },

    app: {
        head: {
            title: appName,
            meta: [{ name: 'description', content: appDescription }],
            link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
        },
    },

    css: ['~/assets/main.css'],

    compatibilityDate: '2025-12-18',
})
