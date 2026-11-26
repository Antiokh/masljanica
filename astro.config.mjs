import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
export default defineConfig({
  output: 'static',
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  integrations: [starlight({
    title: 'Масляница · Белград',
    defaultLocale: 'root',
    locales: { root: { label: 'Русский', lang: 'ru' } },
    favicon: '/icon.svg',
    customCss: ['./src/styles/app.css'],
    components: { Header: './src/components/Header.astro', Head: './src/components/AppHead.astro', Footer: './src/components/AppFooter.astro' },
    head: [
      { tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' } },
      { tag: 'meta', attrs: { name: 'theme-color', content: '#FFFFFF' } },
      { tag: 'script', attrs: { src: '/app.js', type: 'module' } }
    ],
    pagination: false,
    lastUpdated: false,
    credits: false
  })]
});
