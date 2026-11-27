import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
export default defineConfig({
  site: 'https://masljanica.pages.dev',
  output: 'static',
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [starlight({
    title: 'Масляница · Белград',
    defaultLocale: 'root',
    locales: { root: { label: 'Русский', lang: 'ru' } },
    favicon: '/favicon-96x96.png',
    customCss: ['./src/styles/app.css','./src/styles/games.css','./src/styles/workshops.css','./src/styles/story.css'],
    components: { Header: './src/components/Header.astro', Head: './src/components/AppHead.astro', Footer: './src/components/AppFooter.astro' },
    head: [
      { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' } },
      { tag: 'link', attrs: { rel: 'icon', href: '/favicon.ico', sizes: 'any' } },
      { tag: 'link', attrs: { rel: 'apple-touch-icon', href: '/apple-touch-icon.png', sizes: '180x180' } },
      { tag: 'meta', attrs: { name: 'theme-color', content: '#101827' } },
      { tag: 'meta', attrs: { name: 'apple-mobile-web-app-title', content: 'Масляница' } },
      { tag: 'script', attrs: { src: '/app.js', type: 'module' } }
    ],
    pagination: false,
    lastUpdated: false,
    credits: false
  })]
});
