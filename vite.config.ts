import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
    // The live app is published at kennethzuniga.github.io/wirescout/ (.github/workflows/deploy-app.yml).
    base: command === 'build' ? '/wirescout/' : '/',
    plugins: [vue(), tailwindcss()],
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src/app', import.meta.url)) },
    },
    // Supabase sends sign-in links back to this address (site_url in supabase/config.toml).
    server: { host: '127.0.0.1', port: 3000, strictPort: true },
}));
