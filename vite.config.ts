import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
// git subtree push --prefix dist origin gh-pages
export default defineConfig({
  base: './',
  plugins: [vue()],
})
