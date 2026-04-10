import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  css: ['~/assets/css/main.css'],
  nitro: {
    experimental: {
      websocket: true
    }
  },
  devServer: {
    port: 3000,
    host: '*',
  },
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/icon',
    '@nuxt/scripts',
    '@nuxtjs/supabase'
  ],
  supabase: {
    redirect: false
  },
  vite: {
    plugins: [tailwindcss()]
  }
})
