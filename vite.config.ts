import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from 'tailwindcss'
import autoprefixer from 'autoprefixer'

const PROD = 'https://api.yobante-boutique.com'
const LOCAL = 'http://localhost:5000'

export default defineConfig(({ mode }) => {
  // `VITE_API_PROXY_TARGET` dans .env.local décide sur quel backend tape le
  // dashboard en dev : `local` (défaut) ou `prod`. Les URL côté application ne
  // changent pas — elles visent toujours le proxy, donc le même origine.
  const env = loadEnv(mode, process.cwd(), '')
  const cible = env.VITE_API_PROXY_TARGET === 'prod' ? PROD : LOCAL
  const versProd = cible === PROD

  return {
    base: '/',
    plugins: [react()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // L'URL d'API code en dur le port 5173 : mieux vaut échouer franchement
      // si le port est pris que basculer en 5174 et casser le proxy en silence.
      strictPort: true,
      middlewareMode: false,
      // Dev uniquement. Deux raisons au proxy :
      //  - le CORS de l'API de prod n'autorise pas localhost:5173 ;
      //  - il permet de basculer entre backend local et prod sans toucher au
      //    code applicatif.
      proxy: {
        '/api': {
          target: cible,
          changeOrigin: true,
          secure: versProd,
          // L'origine annoncée doit figurer dans la liste blanche CORS du
          // backend visé ; inutile en local, où localhost:5173 est déjà admis.
          ...(versProd ? { headers: { Origin: 'https://admin.yobante-boutique.com' } } : {}),
          cookieDomainRewrite: '',
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      minify: 'terser',
    },
    css: {
      postcss: {
        plugins: [
          tailwindcss,
          autoprefixer,
        ],
      },
    },
  }
})
