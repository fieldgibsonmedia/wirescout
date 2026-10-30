import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import packageJson from './package.json' with { type: 'json' };

export default defineConfig(({ command }) => ({
    // The live app is published at fieldgibsonmedia.github.io/wirescout/ (.github/workflows/deploy-app.yml).
    base: command === 'build' ? '/wirescout/' : '/',
    plugins: [vue(), tailwindcss()],
    // The release version, shown in the side nav. Set it in package.json.
    define: { __APP_VERSION__: JSON.stringify(packageJson.version) },
    resolve: {
        alias: { '@': fileURLToPath(new URL('./src/app', import.meta.url)) },
    },
    // Supabase sends sign-in links back to this address (site_url in supabase/config.toml).
    server: { host: '127.0.0.1', port: 3000, strictPort: true },
}));
